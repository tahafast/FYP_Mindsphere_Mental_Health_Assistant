"""
Journal Service - Business logic for journal processing pipeline.

Handles:
- AI summarization with sentiment
- Tag extraction
- AI suggestion generation
- Crisis classification
- Embedding creation
- Personalization updates
"""

import json
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema.output_parser import StrOutputParser
from pymongo import MongoClient
from app.core.config import settings
from app.models.journal import (
    Journal, JournalResponse, AISuggestion, CrisisClassification,
    SentimentType, CrisisLevel, SuggestionType
)
from app.services.safety_guard import safety_guard
import certifi

logger = logging.getLogger(__name__)


# ============================================================================
# LLM PROMPT TEMPLATES (User-specified)
# ============================================================================

SUMMARY_PROMPT = """You are a compassionate summarizer. Summarize the user journal entry (1–2 sentences) focusing on the main emotional state and the primary situation. Keep empathetic, non-judgmental tone.

Journal Entry:
{content}

Return ONLY valid JSON: {{"summary":"...", "sentiment":"positive|neutral|negative|mixed"}}"""

TAGS_PROMPT = """Extract 3–6 short topic tags from this journal entry (single words or short phrases) that describe subjects and emotions (e.g., 'work', 'sleep', 'anxiety', 'gratitude').

Journal Entry:
{content}

Return ONLY valid JSON array: ["tag1","tag2",...]"""

CRISIS_PROMPT = """Classify the text for crisis risk (self-harm, suicidal ideation, harm to others, abuse).

Text:
{content}

Respond with ONLY valid JSON: {{ "level": "none|low|medium|high", "reason": "...", "actions": ["suggested_action1","..."] }}"""

SUGGESTION_PROMPT = """Based on this journal entry, provide a brief, empathetic suggestion or affirmation (2-3 sentences) to help the user. Consider their emotional state and situation.

Journal Entry:
{content}

Return ONLY valid JSON: {{"suggestion":"...", "type":"affirmation|coping|action|gratitude"}}"""


class JournalService:
    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-4o-mini", 
            temperature=0.7, 
            openai_api_key=settings.OPENAI_API_KEY
        )
        self.embeddings = OpenAIEmbeddings(
            openai_api_key=settings.OPENAI_API_KEY, 
            model="text-embedding-3-small"
        )
        
        # MongoDB connections
        if settings.MONGODB_URI:
            self.client = MongoClient(settings.MONGODB_URI, tlsCAFile=certifi.where())
            self.db = self.client[settings.MONGODB_DB_NAME]
            self.journals_collection = self.db["journals"]
            self.vectors_collection = self.db["vectors"]
            self.safety_logs_collection = self.db["safety_logs"]
            self.personalization_collection = self.db["user_personalization"]
            self.sentiment_collection = self.db["user_sentiment_metrics"]
        else:
            logger.warning("MONGODB_URI not found. Journal service disabled.")
            self.journals_collection = None

    async def _call_llm(self, prompt_template: str, content: str) -> str:
        """Call LLM with given prompt and content."""
        try:
            prompt = ChatPromptTemplate.from_template(prompt_template)
            chain = prompt | self.llm | StrOutputParser()
            result = await chain.ainvoke({"content": content})
            result = result.strip()
            
            # Strip markdown code blocks if present (```json ... ```)
            if result.startswith("```"):
                # Find the end of the first line (e.g., ```json)
                first_newline = result.find("\n")
                if first_newline != -1:
                    result = result[first_newline + 1:]
                # Remove trailing ```
                if result.endswith("```"):
                    result = result[:-3].strip()
            
            return result
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            return ""

    async def generate_summary(self, content: str) -> Dict[str, Any]:
        """Generate summary and sentiment from journal content."""
        try:
            result = await self._call_llm(SUMMARY_PROMPT, content)
            parsed = json.loads(result)
            return {
                "summary": parsed.get("summary", ""),
                "sentiment": parsed.get("sentiment", "neutral")
            }
        except json.JSONDecodeError:
            logger.error(f"Failed to parse summary JSON: {result}")
            return {"summary": "", "sentiment": "neutral"}

    async def extract_tags(self, content: str) -> List[str]:
        """Extract topic tags from journal content."""
        try:
            result = await self._call_llm(TAGS_PROMPT, content)
            tags = json.loads(result)
            if isinstance(tags, list):
                return tags[:6]  # Max 6 tags
            return []
        except json.JSONDecodeError:
            logger.error(f"Failed to parse tags JSON: {result}")
            return []

    async def generate_suggestion(self, content: str) -> Optional[AISuggestion]:
        """Generate AI suggestion/recommendation for the journal entry."""
        try:
            result = await self._call_llm(SUGGESTION_PROMPT, content)
            parsed = json.loads(result)
            suggestion_type = parsed.get("type", "affirmation")
            # Validate suggestion type
            try:
                stype = SuggestionType(suggestion_type)
            except ValueError:
                stype = SuggestionType.AFFIRMATION
            
            return AISuggestion(
                suggestion=parsed.get("suggestion", ""),
                type=stype
            )
        except json.JSONDecodeError:
            logger.error(f"Failed to parse suggestion JSON: {result}")
            return None

    async def classify_crisis(self, content: str) -> CrisisClassification:
        """Classify crisis risk using LLM."""
        try:
            result = await self._call_llm(CRISIS_PROMPT, content)
            parsed = json.loads(result)
            level_str = parsed.get("level", "none")
            try:
                level = CrisisLevel(level_str)
            except ValueError:
                level = CrisisLevel.NONE
            
            return CrisisClassification(
                level=level,
                reason=parsed.get("reason"),
                actions=parsed.get("actions", [])
            )
        except json.JSONDecodeError:
            logger.error(f"Failed to parse crisis JSON: {result}")
            return CrisisClassification(level=CrisisLevel.NONE)

    async def create_embedding(self, content: str) -> List[float]:
        """Create embedding vector for journal content."""
        try:
            embedding = self.embeddings.embed_query(content)
            return embedding
        except Exception as e:
            logger.error(f"Failed to create embedding: {e}")
            return []

    async def run_safety_check(self, content: str, user_id: str) -> Dict[str, Any]:
        """Run hybrid safety check (SafetyGuard + LLM crisis classifier)."""
        # First: Fast SafetyGuard check
        safety_result = await safety_guard.validate_input(content)
        
        if safety_result.get("isCrisis"):
            logger.warning(f"SafetyGuard crisis detected for user {user_id}")
            return safety_result
        
        # Second: LLM crisis classification for more nuanced detection
        crisis = await self.classify_crisis(content)
        
        if crisis.level in [CrisisLevel.MEDIUM, CrisisLevel.HIGH]:
            logger.warning(f"LLM crisis detected ({crisis.level}) for user {user_id}: {crisis.reason}")
            
            # Log to safety_logs
            if self.safety_logs_collection:
                self.safety_logs_collection.insert_one({
                    "user_id": user_id,
                    "timestamp": datetime.utcnow(),
                    "source": "journal",
                    "crisis_level": crisis.level.value,
                    "reason": crisis.reason,
                    "actions": crisis.actions,
                    "content_preview": content[:100]
                })
            
            return {
                "isCrisis": True,
                "crisisLevel": crisis.level.value,
                "reason": crisis.reason,
                "actions": crisis.actions
            }
        
        return {"isCrisis": False, "crisisLevel": crisis.level.value}

    async def update_personalization(self, user_id: str, tags: List[str]):
        """Update user personalization profile with journal tags."""
        if self.personalization_collection is None or not tags:
            return
        
        try:
            # Upsert: increment tag counts
            for tag in tags:
                self.personalization_collection.update_one(
                    {"user_id": user_id, "tag": tag.lower()},
                    {
                        "$inc": {"count": 1},
                        "$set": {"last_seen": datetime.utcnow()}
                    },
                    upsert=True
                )
            logger.info(f"Updated personalization for user {user_id} with {len(tags)} tags")
        except Exception as e:
            logger.error(f"Failed to update personalization: {e}")

    async def log_sentiment(self, user_id: str, sentiment: str, content_preview: str):
        """Log journal sentiment to LEAS metrics."""
        if self.sentiment_collection is None:
            return
        
        # Map sentiment to score
        score_map = {
            "positive": 0.6,
            "neutral": 0.0,
            "negative": -0.4,
            "mixed": 0.1
        }
        score = score_map.get(sentiment, 0.0)
        
        try:
            self.sentiment_collection.insert_one({
                "user_id": user_id,
                "session_id": "journal",
                "timestamp": datetime.utcnow(),
                "sentiment_score": score,
                "emotion_label": sentiment,
                "input_preview": content_preview[:100],
                "source": "journal"
            })
            logger.info(f"Logged journal sentiment for user {user_id}: {sentiment}")
        except Exception as e:
            logger.error(f"Failed to log sentiment: {e}")

    async def process_journal(
        self, 
        user_id: str, 
        content: str, 
        date_iso: str,
        mood: Optional[str] = None,
        allow_training: bool = False
    ) -> Dict[str, Any]:
        """
        Full journal processing pipeline:
        1. Run safety check
        2. Generate summary + sentiment
        3. Extract tags
        4. Generate AI suggestion
        5. Create embedding
        6. Update personalization
        7. Log sentiment to LEAS
        """
        logger.info(f"Processing journal for user {user_id}, date {date_iso}")
        
        # 1. Safety check
        safety_result = await self.run_safety_check(content, user_id)
        crisis_level = CrisisLevel(safety_result.get("crisisLevel", "none"))
        
        # 2. Generate summary and sentiment
        summary_result = await self.generate_summary(content)
        summary = summary_result.get("summary", "")
        sentiment_str = summary_result.get("sentiment", "neutral")
        try:
            sentiment = SentimentType(sentiment_str)
        except ValueError:
            sentiment = SentimentType.NEUTRAL
        
        # 3. Extract tags
        tags = await self.extract_tags(content)
        
        # 4. Generate AI suggestion
        ai_suggestion = await self.generate_suggestion(content)
        
        # 5. Create embedding
        embedding = await self.create_embedding(content)
        
        # 6. Update personalization
        await self.update_personalization(user_id, tags)
        
        # 7. Log sentiment
        await self.log_sentiment(user_id, sentiment_str, content)
        
        return {
            "summary": summary,
            "sentiment": sentiment,
            "tags": tags,
            "ai_suggestion": ai_suggestion,
            "crisis_level": crisis_level,
            "embedding": embedding,
            "safety_result": safety_result
        }

    async def delete_embedding(self, journal_id: str):
        """Remove embedding from vector store when journal is deleted."""
        if self.vectors_collection is None:
            return
        
        try:
            self.vectors_collection.delete_one({"journal_id": journal_id})
            logger.info(f"Deleted embedding for journal {journal_id}")
        except Exception as e:
            logger.error(f"Failed to delete embedding: {e}")


# Global instance
journal_service = JournalService()
