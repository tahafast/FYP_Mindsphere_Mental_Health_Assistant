"""
Recommendation Service - Emotionally Intelligent Daily Recommendations Engine

This service generates human-like, therapist-style daily recommendations based on
the user's conversation logs and LEAS emotional complexity scores.

BEHAVIORAL RULES:
1. Recommendations are ONLY generated when the Recommendations page is opened
2. LEAS scores update with every message, but summaries only generate on-demand
3. Always includes the MOST RECENT DAY'S score (today)
4. Structure is deterministic; content is dynamic
5. Never produces generic statements - always nuanced, context-aware
6. Incorporates time-specific emotional changes and patterns

Privacy Notes:
- Conversation text previews are used ONLY for LLM context (not stored/logged)
- User_id is anonymized in telemetry
- LLM errors logged generically (no text dumps)
"""

import os
import json
import logging
import hashlib
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from collections import OrderedDict
from threading import Lock

from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema.output_parser import StrOutputParser
from pymongo import MongoClient
from app.core.config import settings
import certifi

logger = logging.getLogger(__name__)


# ============================================================================
# Configuration (via environment variables)
# ============================================================================

RECOMMENDATIONS_USE_LLM = os.getenv("RECOMMENDATIONS_USE_LLM", "true").lower() == "true"
RECOMMENDATIONS_CACHE_TTL_SECONDS = int(os.getenv("RECOMMENDATIONS_CACHE_TTL_SECONDS", "900"))


# ============================================================================
# Status Label Thresholds (new scale per user spec)
# ============================================================================
# Score > 0.6  -> Calm
# 0.15 to 0.59 -> Stable
# -0.14 to 0.14 -> Mixed
# -0.60 to -0.15 -> Elevated
# < -0.60 -> Anxious

STATUS_THRESHOLDS = [
    (0.60, "Calm"),
    (0.15, "Stable"),
    (-0.14, "Mixed"),
    (-0.60, "Elevated"),
    (float('-inf'), "Anxious")
]


def get_status_label(avg_score: float) -> str:
    """Map average LEAS score to status label using new thresholds."""
    for threshold, label in STATUS_THRESHOLDS:
        if avg_score > threshold:
            return label
    return "Anxious"


# ============================================================================
# Deterministic Templates (Fallback when LLM unavailable or fails)
# ============================================================================

DETERMINISTIC_TEMPLATES = {
    "Calm": {
        "emotional_summary": "Your emotional landscape has shown remarkable steadiness over the past few days. There's a sense of groundedness in your reflections, with moments of genuine contentment surfacing through your conversations.",
        "suggestion_for_today": "Channel this calm energy into something creative or meaningful to you — perhaps journaling about what's been working well."
    },
    "Stable": {
        "emotional_summary": "You've been navigating your days with a balanced emotional rhythm. While there may have been small fluctuations, your overall trajectory suggests resilience and emotional awareness.",
        "suggestion_for_today": "Consider a brief gratitude reflection this evening to reinforce this positive momentum."
    },
    "Mixed": {
        "emotional_summary": "Your emotional journey has shown some variability — moments of clarity interspersed with periods of uncertainty. This isn't unusual; it often reflects active processing of life's complexities.",
        "suggestion_for_today": "Try a 5-minute grounding exercise when you notice emotional shifts — it can help anchor you during transitions."
    },
    "Elevated": {
        "emotional_summary": "There's been a noticeable undercurrent of tension in your recent reflections. You may be carrying some weight that hasn't fully surfaced yet, or processing something that requires more time.",
        "suggestion_for_today": "Consider taking a short break from screens this afternoon — even 10 minutes of quiet can help reset your nervous system."
    },
    "Anxious": {
        "emotional_summary": "The past few days have felt heavier than usual. There's a sense of emotional strain in your conversations, possibly linked to recurring thoughts or external pressures that haven't fully resolved.",
        "suggestion_for_today": "Be gentle with yourself today. Try a box-breathing exercise (4-4-4-4) and consider reaching out to someone you trust."
    }
}


# ============================================================================
# LLM Prompt Template (Sophisticated, Therapist-Style)
# ============================================================================

LLM_SYSTEM_PROMPT = """You are the Recommendations Engine for MindSphere, a mental health companion. 
Your job is to generate emotionally intelligent, human-like daily recommendations based on the 
user's conversation logs and their computed emotional complexity scores.

IMPORTANT BEHAVIORAL RULES:
1. Never produce generic statements like "You were anxious." Instead produce nuanced, 
   context-aware emotional interpretation.
2. Incorporate time-specific emotional changes (morning vs night patterns).
3. Reference contrasting moods across days and patterns across the analysis window.
4. Write like a compassionate psychologist, not an AI.
5. Never guilt or shame the user.
6. Never mention "LEAS" or "scores" directly — speak in human terms about emotions.
7. Use supportive language: calm, warm, validating.

You must produce ONLY valid JSON with these exact fields:

{
  "emotional_summary": "<Human-like reflection of the user's emotional patterns. Include time-of-day 
                        changes, specific moods detected, and short-term emotional shifts. 
                        Must feel like a therapist's reflection. 2-4 sentences.>",
  "suggestion_for_today": "<A gentle, concise, actionable wellness suggestion based on the 
                           emotional trajectory. 1-2 sentences maximum. Must tie directly 
                           to the emotional summary.>"
}

EMOTIONAL SUMMARY EXAMPLES (good):
- "You seemed emotionally heavy in the morning but steadied yourself towards evening."
- "There's a recurring tension around academic pressure, especially when conversations involve deadlines."
- "Your tone softened yesterday, suggesting partial recovery from earlier stress."
- "You expressed frustration but also clarity — a sign of emotional processing."

FORBIDDEN (never write):
- "You were anxious."
- "You felt okay."
- Anything generic, repetitive, shallow, or clinical.
- Any mention of scores, LEAS, or technical terms.

STATUS LABEL REFERENCE (for context only, don't mention directly):
- Score > 0.6  -> Calm
- 0.15 to 0.59 -> Stable
- -0.14 to 0.14 -> Mixed
- -0.60 to -0.15 -> Elevated
- < -0.60 -> Anxious"""


# ============================================================================
# In-Memory LRU Cache with TTL
# ============================================================================

class TTLCache:
    """Thread-safe in-memory cache with TTL and LRU eviction."""
    
    def __init__(self, max_size: int = 1000, ttl_seconds: int = 900):
        self._cache: OrderedDict = OrderedDict()
        self._timestamps: Dict[str, datetime] = {}
        self._lock = Lock()
        self._max_size = max_size
        self._ttl_seconds = ttl_seconds
    
    def _is_expired(self, key: str) -> bool:
        if key not in self._timestamps:
            return True
        age = (datetime.utcnow() - self._timestamps[key]).total_seconds()
        return age > self._ttl_seconds
    
    def get(self, key: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            if key in self._cache:
                if self._is_expired(key):
                    del self._cache[key]
                    del self._timestamps[key]
                    return None
                self._cache.move_to_end(key)
                return self._cache[key]
            return None
    
    def set(self, key: str, value: Dict[str, Any]):
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                del self._timestamps[key]
            
            while len(self._cache) >= self._max_size:
                oldest_key = next(iter(self._cache))
                del self._cache[oldest_key]
                del self._timestamps[oldest_key]
            
            self._cache[key] = value
            self._timestamps[key] = datetime.utcnow()
    
    def invalidate(self, key: str):
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                del self._timestamps[key]


# ============================================================================
# Recommendation Service
# ============================================================================

class RecommendationService:
    def __init__(self):
        # LLM setup (uses same pattern as journal_service)
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.8,  # Slightly higher for more human-like output
            openai_api_key=settings.OPENAI_API_KEY
        ) if settings.OPENAI_API_KEY else None
        
        # MongoDB connections
        if settings.MONGODB_URI:
            self.client = MongoClient(settings.MONGODB_URI, tlsCAFile=certifi.where())
            self.db = self.client[settings.MONGODB_DB_NAME]
            self.sentiment_collection = self.db["user_sentiment_metrics"]
        else:
            logger.warning("MONGODB_URI not found. Recommendation service disabled.")
            self.sentiment_collection = None
        
        # In-memory cache
        self._cache = TTLCache(max_size=1000, ttl_seconds=RECOMMENDATIONS_CACHE_TTL_SECONDS)
    
    def _get_cache_key(self, user_id: str, days: int) -> str:
        """Generate cache key for user recommendation."""
        user_hash = hashlib.sha256(user_id.encode()).hexdigest()[:16]
        return f"rec:{user_hash}:{days}"
    
    async def get_recent_entries(
        self, 
        user_id: str, 
        days: int = 3,
        user_tz: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fetch recent sentiment entries with text previews for context-aware analysis.
        
        IMPORTANT: Uses user's timezone for date grouping to ensure "today" is 
        accurate for the user's location.
        
        Returns:
            Dict with:
                - trend_points: List of {date, score, entries: [{timestamp, score, preview}]}
                - today_entry: Most recent entry from today (if exists)
                - all_entries: Flat list of all entries for LLM context
        """
        if self.sentiment_collection is None:
            logger.warning("Sentiment collection unavailable")
            return {"trend_points": [], "today_entry": None, "all_entries": []}
        
        try:
            # Set up timezone for date conversions
            import pytz
            if user_tz:
                try:
                    tz = pytz.timezone(user_tz)
                    logger.info(f"📊 Using timezone: {user_tz}")
                except:
                    logger.warning(f"Invalid timezone '{user_tz}', falling back to UTC")
                    tz = pytz.UTC
            else:
                tz = pytz.UTC
            
            # Fetch data from the last 7 days to ensure we have enough
            cutoff_date = datetime.utcnow() - timedelta(days=7)
            
            logger.info(f"📊 Fetching entries for user_id='{user_id}' since {cutoff_date.isoformat()}")
            
            cursor = self.sentiment_collection.find({
                "user_id": user_id,
                "timestamp": {"$gte": cutoff_date}
            }).sort("timestamp", -1)
            
            docs = list(cursor)
            logger.info(f"📊 Found {len(docs)} total sentiment documents")
            
            if len(docs) == 0:
                total_count = self.sentiment_collection.count_documents({"user_id": user_id})
                logger.warning(f"📊 No recent data found. Total documents for user: {total_count}")
                return {"trend_points": [], "today_entry": None, "all_entries": []}
            
            # Group by date with full entry details
            # CRITICAL: Use user's timezone for date grouping
            daily_data: Dict[str, List[Dict]] = {}
            all_entries: List[Dict] = []
            
            for doc in docs:
                ts = doc.get("timestamp")
                score = doc.get("sentiment_score", 0.0)
                preview = doc.get("input_preview", "")
                emotion = doc.get("emotion_label", "neutral")
                
                if ts and isinstance(ts, datetime):
                    if ts > datetime.utcnow():
                        continue
                    
                    # Convert UTC timestamp to user's local timezone
                    ts_utc = ts.replace(tzinfo=pytz.UTC)
                    ts_local = ts_utc.astimezone(tz)
                    
                    # Get date in user's timezone
                    date_iso = ts_local.strftime("%Y-%m-%d")
                    time_str = ts_local.strftime("%H:%M")
                    
                    entry = {
                        "timestamp": ts.isoformat(),
                        "time": time_str,
                        "score": round(score, 2),
                        "preview": preview[:100] if preview else "",
                        "emotion": emotion
                    }
                    
                    if date_iso not in daily_data:
                        daily_data[date_iso] = []
                    daily_data[date_iso].append(entry)
                    all_entries.append({**entry, "date": date_iso})
            
            # Calculate daily averages and build trend points
            trend_points = []
            for date_iso, entries in daily_data.items():
                scores = [e["score"] for e in entries]
                avg = sum(scores) / len(scores)
                trend_points.append({
                    "date": date_iso,
                    "score": round(avg, 2),
                    "entry_count": len(entries),
                    "entries": entries  # Include individual entries for context
                })
            
            # Sort by date descending
            trend_points.sort(key=lambda x: x["date"], reverse=True)
            
            # Get today's date in user's timezone
            now_local = datetime.now(tz)
            today_iso = now_local.strftime("%Y-%m-%d")
            logger.info(f"📊 Today's date in user timezone: {today_iso}")
            
            # Separate today from historical days
            today_point = None
            historical_points = []
            
            for tp in trend_points:
                if tp["date"] == today_iso:
                    today_point = tp
                else:
                    historical_points.append(tp)
            
            # Build final list: today + N previous days (total N+1 days)
            final_points = []
            if today_point:
                final_points.append(today_point)
            
            # Add the requested number of previous days
            final_points.extend(historical_points[:days])
            
            logger.info(f"📊 Returning {len(final_points)} days: today={'yes' if today_point else 'no'} + {len(historical_points[:days])} historical")
            
            # Get today's most recent entry
            today_entry = None
            if daily_data.get(today_iso):
                # Most recent entry from today
                today_entry = daily_data[today_iso][0]
                today_entry["date"] = today_iso
            
            # Log summary
            for tp in final_points:
                is_today = " (TODAY)" if tp["date"] == today_iso else ""
                logger.info(f"📊 Day {tp['date']}{is_today}: avg={tp['score']:.2f} ({tp['entry_count']} entries)")
            
            return {
                "trend_points": final_points,
                "today_entry": today_entry,
                "all_entries": all_entries[:20]  # Limit to recent 20 for LLM context
            }
            
        except Exception as e:
            logger.error(f"Error fetching entries: {type(e).__name__}: {str(e)}")
            return {"trend_points": [], "today_entry": None, "all_entries": []}
    
    def compute_stats(self, trend_points: List[Dict]) -> Dict[str, Any]:
        """Compute average score and status label from trend points."""
        if not trend_points:
            return {"avg_score": 0.0, "status_label": "Mixed"}
        
        # Weight more recent days slightly higher
        weights = [1.0, 0.8, 0.6]  # Today, yesterday, day before
        scores = [tp["score"] for tp in trend_points]
        
        weighted_sum = sum(s * w for s, w in zip(scores, weights[:len(scores)]))
        weight_total = sum(weights[:len(scores)])
        avg = weighted_sum / weight_total if weight_total > 0 else 0.0
        
        avg_rounded = round(avg, 2)
        status_label = get_status_label(avg)
        
        return {"avg_score": avg_rounded, "status_label": status_label}
    
    async def generate_recommendation(
        self, 
        trend_points: List[Dict],
        all_entries: List[Dict],
        status_label: str,
        avg_score: float
    ) -> Dict[str, str]:
        """
        Generate emotionally intelligent summary and suggestion.
        Uses LLM if available, falls back to templates.
        """
        template = DETERMINISTIC_TEMPLATES.get(status_label, DETERMINISTIC_TEMPLATES["Mixed"])
        
        if not RECOMMENDATIONS_USE_LLM:
            logger.info("LLM disabled, using deterministic templates")
            return {
                "emotional_summary": template["emotional_summary"],
                "suggestion_for_today": template["suggestion_for_today"]
            }
        
        if not self.llm:
            logger.warning("LLM not configured, using deterministic templates")
            return {
                "emotional_summary": template["emotional_summary"],
                "suggestion_for_today": template["suggestion_for_today"]
            }
        
        try:
            # Build context for LLM (no raw user_id, anonymized)
            llm_context = {
                "status_label": status_label,
                "average_score": avg_score,
                "trend_points": [
                    {
                        "date": tp["date"],
                        "daily_avg_score": tp["score"],
                        "entry_count": tp["entry_count"]
                    }
                    for tp in trend_points
                ],
                "recent_entries": [
                    {
                        "date": e["date"],
                        "time": e.get("time", ""),
                        "emotion": e.get("emotion", "neutral"),
                        "text_preview": e.get("preview", "")[:80],  # Truncate for safety
                        "score": e["score"]
                    }
                    for e in all_entries[:10]  # Limit to 10 most recent
                ]
            }
            
            messages = [
                ("system", LLM_SYSTEM_PROMPT),
                ("user", f"Generate a recommendation based on this emotional data:\n\n{json.dumps(llm_context, indent=2)}")
            ]
            
            prompt = ChatPromptTemplate.from_messages(messages)
            chain = prompt | self.llm | StrOutputParser()
            
            result = await chain.ainvoke({})
            result = result.strip()
            
            # Strip markdown code blocks if present
            if result.startswith("```"):
                first_newline = result.find("\n")
                if first_newline != -1:
                    result = result[first_newline + 1:]
                if result.endswith("```"):
                    result = result[:-3].strip()
            
            parsed = json.loads(result)
            
            emotional_summary = parsed.get("emotional_summary", template["emotional_summary"])
            suggestion = parsed.get("suggestion_for_today", template["suggestion_for_today"])
            
            logger.info(f"✨ LLM generated recommendation for status: {status_label}")
            return {
                "emotional_summary": emotional_summary,
                "suggestion_for_today": suggestion
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"LLM JSON parse error, using template fallback")
            return {
                "emotional_summary": template["emotional_summary"],
                "suggestion_for_today": template["suggestion_for_today"]
            }
        except Exception as e:
            logger.error(f"LLM call failed ({type(e).__name__}), using template fallback")
            return {
                "emotional_summary": template["emotional_summary"],
                "suggestion_for_today": template["suggestion_for_today"]
            }
    
    def _emit_telemetry(
        self, 
        user_id: str, 
        status_label: str, 
        avg_score: float, 
        points_count: int
    ):
        """Emit anonymized telemetry event."""
        try:
            user_hash = hashlib.sha256(user_id.encode()).hexdigest()[:16]
            logger.info(
                f"TELEMETRY recommendation.generated | "
                f"user_hash={user_hash} | "
                f"status={status_label} | "
                f"avg_score={avg_score} | "
                f"points_count={points_count}"
            )
        except Exception as e:
            logger.debug(f"Telemetry emit failed: {type(e).__name__}")
    
    async def get_daily_recommendation(
        self, 
        user_id: str, 
        days: int = 3, 
        user_tz: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Main orchestrator for daily recommendation generation.
        
        Returns the new structured format:
        {
            "daily_digest_title": str,
            "emotional_summary": str,
            "suggestion_for_today": str,
            "average_leas_score": float,
            "status_label": str,
            "trend_points": [{date, score}, ...]
        }
        """
        cache_key = self._get_cache_key(user_id, days)
        
        # Check cache
        cached = self._cache.get(cache_key)
        if cached:
            logger.info(f"📦 Returning cached recommendation")
            return cached
        
        # Fetch entries with context (use user's timezone for date grouping)
        data = await self.get_recent_entries(user_id, days, user_tz)
        trend_points = data["trend_points"]
        all_entries = data["all_entries"]
        
        # Compute stats
        stats = self.compute_stats(trend_points)
        avg_score = stats["avg_score"]
        status_label = stats["status_label"]
        
        # Generate recommendation text
        rec_text = await self.generate_recommendation(
            trend_points, all_entries, status_label, avg_score
        )
        
        # Build title with current date
        now = datetime.utcnow()
        if user_tz:
            try:
                import pytz
                tz = pytz.timezone(user_tz)
                now = datetime.now(tz)
            except:
                pass
        
        weekday = now.strftime("%A")
        month_day = now.strftime("%B %d").replace(" 0", " ")  # Remove leading zero
        daily_digest_title = f"Daily Digest • {weekday}, {month_day}"
        
        # Build response
        result = {
            "daily_digest_title": daily_digest_title,
            "emotional_summary": rec_text["emotional_summary"],
            "suggestion_for_today": rec_text["suggestion_for_today"],
            "average_leas_score": avg_score,
            "status_label": status_label,
            "trend_points": [
                {"date": tp["date"], "score": tp["score"]}
                for tp in trend_points
            ]
        }
        
        # Cache result
        self._cache.set(cache_key, result)
        
        # Emit telemetry (anonymized)
        self._emit_telemetry(user_id, status_label, avg_score, len(trend_points))
        
        return result


# Global instance
recommendation_service = RecommendationService()
