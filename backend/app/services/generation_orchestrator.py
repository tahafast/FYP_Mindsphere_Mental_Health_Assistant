"""
Generation Orchestrator - Stage A/B Architecture for Cost-Effective GPT-4o Usage

This service implements a two-stage generation pipeline:
- Stage A: Fast extraction using gpt-4o-mini (metadata, must_echo, topics, verbosity)
- Stage B: High-quality generation using GPT-4o (only when needed)

Key Features:
- Intelligent gating to minimize GPT-4o usage
- LRU caching with TTL for Stage B outputs
- Deterministic fallback templates
- Adaptive markdown headings based on topic detection
- Must-echo enforcement to prevent generic AI responses
"""

import os
import json
import logging
import hashlib
from typing import Dict, List, Any, Optional
from datetime import datetime
from collections import OrderedDict
from threading import Lock

from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema.output_parser import StrOutputParser
from app.core.config import settings

# Import RAG service for context retrieval
try:
    from app.services.rag import rag_service
except ImportError:
    rag_service = None

logger = logging.getLogger(__name__)


# ============================================================================
# Configuration
# ============================================================================

USE_GPT4O_FOR_GENERATION = os.getenv("USE_GPT4O_FOR_GENERATION", "true").lower() == "true"
STAGEA_MODEL = os.getenv("STAGEA_MODEL", "gpt-4o-mini")
STAGEB_MODEL = os.getenv("STAGEB_MODEL", "gpt-4o")
STAGEB_TTL_SECONDS = int(os.getenv("STAGEB_TTL_SECONDS", "900"))


# ============================================================================
# Deterministic Heading Mapping Rules
# ============================================================================

HEADING_RULES = {
    "panic": "Immediate Concern",
    "self-harm": "Immediate Concern",
    "suicide": "Immediate Concern",
    "crisis": "Immediate Concern",
    "work": "Performance & Stress",
    "deadline": "Performance & Stress",
    "study": "Performance & Stress",
    "exam": "Performance & Stress",
    "sleep": "Sleep & Energy",
    "fatigue": "Sleep & Energy",
    "tired": "Sleep & Energy",
    "insomnia": "Sleep & Energy",
    "default": "Emotional Summary"
}


def get_heading_for_topics(topics: List[str]) -> str:
    """Map detected topics to appropriate markdown heading."""
    topics_lower = [t.lower() for t in topics]
    
    # Check for crisis/immediate concern first
    for keyword in ["panic", "self-harm", "suicide", "crisis"]:
        if any(keyword in topic for topic in topics_lower):
            return HEADING_RULES[keyword]
    
    # Check for work/performance
    for keyword in ["work", "deadline", "study", "exam"]:
        if any(keyword in topic for topic in topics_lower):
            return HEADING_RULES[keyword]
    
    # Check for sleep/energy
    for keyword in ["sleep", "fatigue", "tired", "insomnia"]:
        if any(keyword in topic for topic in topics_lower):
            return HEADING_RULES[keyword]
    
    return HEADING_RULES["default"]


# ============================================================================
# Deterministic Templates (Fallback) - JSON Format
# ============================================================================

def get_deterministic_markdown(topic_context: str, heading: str, persona: str = "therapist") -> dict:
    """Generate a deterministic markdown response (no LLM call)."""
    
    # Build beautiful markdown based on persona
    if persona == "coach":
        markdown = f"""## 🫶 {heading}

I see your challenge. {topic_context} You've got this.

You're showing awareness, which is the first step to progress.

## 💬 What I Heard
- You're facing an obstacle
- You're ready to take action

_Taking the first step is often the hardest part, but you're already here._

## 🧭 Action Steps
1. **Quick win** - Identify one small thing you can accomplish in the next 5 minutes.
2. **Set a goal** - Write down one specific, achievable goal for today.
3. **Celebrate** - When you complete something, acknowledge it out loud."""
    
    elif persona == "friend":
        markdown = f"""## 🫶 {heading}

Hey, I get it. {topic_context} You're not alone in this.

What you're feeling makes total sense given the situation.

## 💬 What I Heard
- Things feel tough right now
- You needed someone to talk to

_It takes courage to reach out. I'm glad you did._

## 🧭 Action Steps
1. **Talk it out** - Sometimes just saying things out loud helps - even to yourself.
2. **Do something small** - Watch a favorite show, take a walk, or just rest.
3. **Remember** - This feeling is temporary, even if it doesn't feel like it right now."""
    
    else:  # therapist
        markdown = f"""## 🫶 {heading}

I hear you. {topic_context}

It sounds like you're going through a challenging time right now.

## 💬 What I Heard
- You're dealing with something difficult
- You reached out because it matters

_When we're overwhelmed, even small steps can feel monumental._

## 🧭 Action Steps
1. **Pause and breathe** - Take 3 slow, deep breaths right now. Just focus on the air moving in and out.
2. **Name one feeling** - Try to identify one emotion you're experiencing right now, without judging it.
3. **Small next step** - Think of one tiny thing you could do in the next hour that might help."""
    
    return {"response": markdown, "mode": "initial_share"}


def get_greeting_response() -> dict:
    """Generate a minimal greeting response (no therapeutic framework)."""
    
    # This is intentionally minimal - no therapy structure for casual greetings
    # Both sentences on same line to avoid square box appearance
    markdown = """## 😊 Warm Welcome
Hey! It's good to see you. What's going on today?"""
    
    return {"response": markdown, "mode": "greeting"}


# ============================================================================
# LRU Cache with TTL
# ============================================================================

class TTLCache:
    """Thread-safe in-memory cache with TTL and LRU eviction."""
    
    def __init__(self, max_size: int = 500, ttl_seconds: int = 900):
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
    
    def get(self, key: str) -> Optional[str]:
        with self._lock:
            if key in self._cache:
                if self._is_expired(key):
                    del self._cache[key]
                    del self._timestamps[key]
                    logger.debug(f"Cache expired: {key[:16]}...")
                    return None
                self._cache.move_to_end(key)
                logger.debug(f"Cache hit: {key[:16]}...")
                return self._cache[key]
            logger.debug(f"Cache miss: {key[:16]}...")
            return None
    
    def set(self, key: str, value: str):
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                del self._timestamps[key]
            
            # LRU eviction
            while len(self._cache) >= self._max_size:
                oldest_key = next(iter(self._cache))
                del self._cache[oldest_key]
                del self._timestamps[oldest_key]
                logger.debug(f"Cache evicted (LRU): {oldest_key[:16]}...")
            
            self._cache[key] = value
            self._timestamps[key] = datetime.utcnow()
            logger.debug(f"Cache set: {key[:16]}...")


# ============================================================================
# Generation Orchestrator
# ============================================================================

class GenerationOrchestrator:
    """
    Orchestrates two-stage generation pipeline for cost-effective GPT-4o usage.
    """
    
    def __init__(self):
        # Stage A: Fast extraction model (gpt-4o-mini)
        self.stage_a_llm = ChatOpenAI(
            model=STAGEA_MODEL,
            temperature=0.2,  # Low temp for consistent extraction
            openai_api_key=settings.OPENAI_API_KEY,
            request_timeout=10  # Fast timeout for latency
        ) if settings.OPENAI_API_KEY else None
        
        # Stage B: High-quality generation model (gpt-4o)
        self.stage_b_llm = ChatOpenAI(
            model=STAGEB_MODEL,
            temperature=0.35,  # Low-medium temp for professional tone
            openai_api_key=settings.OPENAI_API_KEY,
            request_timeout=30
        ) if settings.OPENAI_API_KEY else None
        
        # Cache for Stage B outputs
        self._cache = TTLCache(max_size=500, ttl_seconds=STAGEB_TTL_SECONDS)
        
        logger.info(f"🎭 Orchestrator initialized: StageA={STAGEA_MODEL}, StageB={STAGEB_MODEL}, TTL={STAGEB_TTL_SECONDS}s")
    
    async def stage_a_extract(
        self, 
        user_id: str, 
        text: str, 
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Stage A: Fast extraction of metadata using gpt-4o-mini.
        
        Returns JSON with:
        - emotion_estimate: Single emotion label
        - intensity: low | medium | high
        - short_phrases: 2-4 distilled theme fragments
        - safety_flag: bool
        - safety_reason: str if safety_flag true
        - intent_type: initial_share | follow_up | acknowledgment | question | greeting
        """
        if not self.stage_a_llm:
            logger.warning("Stage A LLM not available, returning defaults")
            return {
                "emotion_estimate": "neutral",
                "intensity": "low",
                "short_phrases": [],
                "safety_flag": False,
                "safety_reason": "",
                "intent_type": "initial_share"
            }
        
        try:
            # New Stage A system prompt with intent detection
            system_prompt = """You are Stage-A of a two-stage mental health assistant pipeline.
Your role is to analyze the user's raw message and produce pure metadata for Stage-B.
You do NOT produce advice, empathy, or long text. Keep everything structured, compact, and neutral.

Your output MUST be a single JSON object following this schema:

{
  "emotion_estimate": "One emotion label from {sadness, stress, anxiety, fear, anger, loneliness, shame, guilt, overwhelmed, hopeful, grateful, neutral, calm, positive}",
  "intensity": "low | medium | high",
  "short_phrases": [
    "2-4 short distilled terms or micro-phrases from the user's message (max 3 words each, NO full clauses, NO sentences, NO markdown, NO punctuation except hyphens)",
    "These should represent themes, not verbatim repetition."
  ],
  "safety_flag": false,
  "safety_reason": "",
  "intent_type": "One of: initial_share | follow_up | acknowledgment | question | greeting"
}

INTENT TYPE DEFINITIONS:
- initial_share: User is sharing a problem, feeling, or situation for the first time (needs full therapeutic response)
- follow_up: User is continuing a conversation with additional context (needs medium response)
- acknowledgment: User is responding positively to advice, saying thanks, or agreeing (needs brief warm response)
- question: User is asking a specific question (needs focused answer)
- greeting: User is saying hello or starting conversation casually (needs warm greeting)

RULES:
1. Never output markdown. No asterisks, no hashes, no backticks.
2. Never copy long verbatim text. short_phrases must be fragments, not sentences.
3. short_phrases examples: "academic pressure", "burnout", "memory lapses", "overwhelm", "workload"
4. Emotion mapping: collapsing/drowning/too much → "overwhelmed", fear for safety → "fear"
5. safety_flag=true ONLY for self-harm, suicidal ideation, harming others, inability to stay safe
6. Always return ALL fields in the JSON object.
7. No conversational tone. Only produce clean metadata.
8. Intent detection examples:
   - "I'm feeling overwhelmed with work" → initial_share
   - "Yes, that makes sense" → acknowledgment
   - "What about when I feel anxious in meetings?" → follow_up or question
   - "Thanks, I'll try that!" → acknowledgment
   - "Hi!" or "Hello" → greeting

Your entire output must be valid JSON ONLY. No text before or after."""

            user_prompt = f"Analyze this user message and return metadata JSON:\n\n{text}"
            
            # Use direct message format
            from langchain_core.messages import SystemMessage, HumanMessage
            direct_messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]
            
            chain = self.stage_a_llm | StrOutputParser()
            
            result = await chain.ainvoke(direct_messages)
            result = result.strip()
            
            # Strip markdown code blocks if present
            if result.startswith("```"):
                first_newline = result.find("\n")
                if first_newline != -1:
                    result = result[first_newline + 1:]
                if result.endswith("```"):
                    result = result[:-3].strip()
            
            # Also handle ```json prefix
            if result.startswith("json"):
                result = result[4:].strip()
            
            parsed = json.loads(result)
            
            # Ensure all required fields exist
            parsed.setdefault("emotion_estimate", "neutral")
            parsed.setdefault("intensity", "medium")
            parsed.setdefault("short_phrases", [])
            parsed.setdefault("safety_flag", False)
            parsed.setdefault("safety_reason", "")
            parsed.setdefault("intent_type", "initial_share")
            
            logger.info(f"✅ Stage A extracted: emotion={parsed.get('emotion_estimate')}, intensity={parsed.get('intensity')}, intent={parsed.get('intent_type')}, phrases={parsed.get('short_phrases')}")
            return parsed
            
        except json.JSONDecodeError as e:
            logger.error(f"Stage A JSON parse error: {e}")
            return {
                "emotion_estimate": "neutral",
                "intensity": "medium",
                "short_phrases": [],
                "safety_flag": False,
                "safety_reason": "",
                "intent_type": "initial_share"
            }
        except Exception as e:
            logger.error(f"Stage A extraction failed: {type(e).__name__}: {str(e)}")
            return {
                "emotion_estimate": "neutral",
                "intensity": "low",
                "short_phrases": [],
                "safety_flag": False,
                "safety_reason": "",
                "intent_type": "initial_share"
            }
    
    def should_call_stage_b(
        self, 
        metadata: Dict[str, Any], 
        persona: str, 
        user_request: str
    ) -> bool:
        """
        Gating logic: Decide if we should use Stage B (GPT-4o) or deterministic template.
        
        Returns True if:
        - Global flag USE_GPT4O_FOR_GENERATION=true (override), OR
        - intensity == "high", OR
        - persona == "therapist", OR
        - User request contains explicit depth indicators
        
        Returns False otherwise (use deterministic template for cost savings).
        """
        # Global override
        if USE_GPT4O_FOR_GENERATION:
            logger.info("🎨 Stage B triggered: Global flag enabled")
            return True
        
        # Check intensity (new metadata format)
        intensity = metadata.get("intensity", "medium")
        if intensity == "high":
            logger.info("🎨 Stage B triggered: High intensity detected")
            return True
        
        # Check persona
        if persona.lower() == "therapist":
            logger.info("🎨 Stage B triggered: Therapist persona")
            return True
        
        # Check for explicit depth requests
        depth_keywords = ["help me understand", "explain", "tell me more", "i need to talk"]
        request_lower = user_request.lower()
        if any(kw in request_lower for kw in depth_keywords):
            logger.info("🎨 Stage B triggered: Explicit depth request")
            return True
        
        logger.info("⚡ Using deterministic template (Stage B skipped)")
        return False
    
    def get_deterministic_response(
        self, 
        metadata: Dict[str, Any], 
        persona: str
    ) -> str:
        """
        Generate deterministic JSON response (no LLM call).
        Fast, consistent, cost-free. Returns JSON string.
        """
        # Extract new metadata format
        short_phrases = metadata.get("short_phrases", [])
        emotion_estimate = metadata.get("emotion_estimate", "neutral")
        
        # Build topic context from short_phrases
        topic_context = ""
        if short_phrases:
            topic_context = f"I noticed you're dealing with {', '.join(short_phrases[:2])}."
        else:
            topic_context = "I'm here to listen."
        
        # Get heading from metadata
        heading = self._get_heading_from_metadata(emotion_estimate, short_phrases)
        
        # Get markdown response
        response_dict = get_deterministic_markdown(topic_context, heading, persona)
        
        logger.info(f"⚡ Deterministic markdown response generated")
        return json.dumps(response_dict)
    
    async def stage_b_generate(
        self, 
        user_id: str, 
        original_text: str, 
        metadata: Dict[str, Any], 
        persona: str, 
        context: Optional[Dict[str, Any]] = None,
        context_docs: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        """
        Stage B: High-quality generation using GPT-4o.
        
        Dynamically adjusts response format based on intent_type from Stage A.
        
        Includes caching and fallback to deterministic template on failure.
        """
        # Check cache first
        cache_key = self._build_cache_key(user_id, original_text, persona)
        cached = self._cache.get(cache_key)
        if cached:
            logger.info("📦 Stage B: Returning cached response")
            return cached
        
        # Check if we should use greeting template instead of therapeutic template
        if self._should_use_greeting_template(metadata, original_text):
            logger.info("👋 Using minimal greeting template")
            greeting_response = get_greeting_response()
            return json.dumps(greeting_response)
        
        if not self.stage_b_llm:
            logger.warning("Stage B LLM not available, using deterministic fallback")
            return self.get_deterministic_response(metadata, persona)
        
        try:
            # Extract metadata
            must_echo = metadata.get("must_echo", [])
            topics = metadata.get("topics", [])
            short_phrases = metadata.get("short_phrases", [])
            intent_type = metadata.get("intent_type", "initial_share")
            heading = get_heading_for_topics(topics)
            
            # Build Stage B prompt (now unified for all intents)
            prompt_template = self._get_stage_b_prompt(persona, intent_type)
            
            # Build context section from retrieved docs (for initial_share primarily)
            context_section = ""
            if context_docs and intent_type == "initial_share":
                context_snippets = []
                for doc in context_docs[:3]:  # Top 3 docs
                    snippet = doc.get('text', '')[:400]
                    source = doc.get('source', 'knowledge_base')
                    context_snippets.append(f"[{source}] {snippet}")
                context_section = "\n\n".join(context_snippets)
                logger.info(f"📚 Injecting {len(context_docs)} context docs into Stage B")
            
            # Unified user message with Stage-A metadata
            user_content = f"""User message: "{original_text}"

Stage-A Metadata:
- emotion_estimate: {metadata.get('emotion_estimate', 'neutral')}
- intensity: {metadata.get('intensity', 'medium')}
- intent: {intent_type}
- short_phrases: {short_phrases}
- safety_flag: {metadata.get('safety_flag', False)}

{f'Therapeutic Context (use naturally, do not cite):\\n{context_section}' if context_section else ''}

Generate your response following the dynamic response logic based on intent."""
            
            # Use direct message format to avoid template variable conflicts
            from langchain_core.messages import SystemMessage, HumanMessage
            direct_messages = [
                SystemMessage(content=prompt_template),
                HumanMessage(content=user_content)
            ]
            
            chain = self.stage_b_llm | StrOutputParser()
            
            result = await chain.ainvoke(direct_messages)
            result = result.strip()
            
            # Strip markdown code blocks if present (LLM sometimes wraps JSON)
            if result.startswith("```"):
                first_newline = result.find("\n")
                if first_newline != -1:
                    result = result[first_newline + 1:]
                if result.endswith("```"):
                    result = result[:-3].strip()
            if result.startswith("json"):
                result = result[4:].strip()
            
            # Parse JSON and clean the markdown response
            try:
                parsed = json.loads(result)
                if isinstance(parsed, dict) and "response" in parsed:
                    # Clean the markdown in the response field
                    parsed["response"] = self._clean_markdown(parsed.get("response", ""))
                    parsed.setdefault("mode", intent_type)
                    result = json.dumps(parsed)
                    logger.info(f"✨ Stage B generated {intent_type} response with mode={parsed.get('mode')}")
            except json.JSONDecodeError:
                # If not valid JSON, wrap the raw response
                cleaned = self._clean_markdown(result)
                result = json.dumps({"response": cleaned, "mode": intent_type})
                logger.info(f"✨ Stage B wrapped raw response as {intent_type}")
            
            # Cache the result
            self._cache.set(cache_key, result)
            
            return result
            
        except Exception as e:
            logger.error(f"Stage B generation failed: {type(e).__name__}: {str(e)}")
            logger.info("Falling back to deterministic template")
            return self.get_deterministic_response(metadata, persona)
    
    def _build_cache_key(self, user_id: str, text: str, persona: str) -> str:
        """Build cache key from user_id + text hash + persona."""
        user_hash = hashlib.sha256(user_id.encode()).hexdigest()[:12]
        text_hash = hashlib.sha256(text.encode()).hexdigest()[:12]
        return f"stageb:{user_hash}:{text_hash}:{persona}"

    def _get_heading_from_metadata(self, emotion: str, phrases: List[str]) -> str:
        """Infer heading from Stage A emotion and phrases."""
        emotion_lower = emotion.lower()
        phrases_lower = [p.lower() for p in phrases]
        all_text = emotion_lower + " " + " ".join(phrases_lower)
        
        # Check for crisis/safety
        if any(word in all_text for word in ["self-harm", "suicide", "crisis", "panic"]):
            return "Immediate Concern"
        
        # Check for work/performance
        if any(word in all_text for word in ["work", "deadline", "exam", "project", "academic", "internship", "finals"]):
            return "Performance & Stress"
        
        # Check for sleep/energy
        if any(word in all_text for word in ["sleep", "tired", "fatigue", "insomnia", "exhausted"]):
            return "Sleep & Energy"
        
        # Default based on emotion
        if emotion_lower == "overwhelmed":
            return "Feeling Overwhelmed"
        
        return "Emotional Summary"
    
    def _is_substantive(self, user_text: str) -> bool:
        """
        Check if user input is substantive (not a short greeting).
        
        # This fallback is used ONLY when Stage A did not successfully extract intent.
        # It ensures that long emotional paragraphs never map to greeting templates.
        """
        return len(user_text) > 120 or len(user_text.split()) > 12
    
    def _should_use_greeting_template(self, metadata: Dict[str, Any], user_text: str = "") -> bool:
        """
        Check if we should use minimal greeting template instead of therapeutic template.
        
        Uses INTENT-FIRST logic:
        - Stage A intent takes priority over sentiment-based detection
        - Only use greeting for explicit greeting/smalltalk intents
        - Substantive shares with positive sentiment get therapeutic template
        """
        intent_type = metadata.get("intent_type", "initial_share")
        
        # INTENT-FIRST: Only use greeting template if intent is explicitly greeting/smalltalk
        if intent_type in ("greeting", "smalltalk"):
            logger.info(f"👋 Using greeting template: intent={intent_type}")
            return True
        
        # If intent is substantive (initial_share, follow_up, crisis, question, etc.), 
        # do NOT use greeting template - regardless of positive sentiment
        if intent_type in ("initial_share", "follow_up", "crisis", "question", "clarify", "acknowledgment"):
            logger.info(f"📝 Using therapeutic template: intent={intent_type} (not greeting)")
            return False
        
        # Fallback for None/unknown intent: check if message is substantive
        if user_text and self._is_substantive(user_text):
            logger.info(f"📝 Using therapeutic template: substantive text detected ({len(user_text)} chars)")
            return False
        
        # Default to therapeutic template for safety
        return False
    
    def _get_stage_b_prompt(self, persona: str, intent_type: str = "initial_share") -> str:
        """Get Stage B system prompt - outputs beautiful markdown with icons."""
        
        # Use minimal greeting template for greetings
        if intent_type == "greeting":
            return """You are MindSphere, speaking in a warm, friendly, natural tone.

For greeting intents, reply in this exact structure:

## 😊 Warm Welcome
<one short friendly sentence acknowledging them + one casual follow-up sentence ON THE SAME LINE>

Do NOT include:
- Emotional Summary
- What I Heard  
- Action Steps
- Safety messaging
- Therapeutic framework
- Blank lines between sentences

Examples:

If user says:
"hey bro"
→ You MUST output:

## 😊 Warm Welcome
Hey! It's good to see you. What's going on today?


If user says:
"how are you?"
→ Output something like:

## 😊 Warm Welcome
Hey there! I'm doing great, thanks for checking in. How's your day going so far?


REMEMBER: Keep it SHORT and FRIENDLY. Two sentences on ONE LINE, no blank lines between them.

ALWAYS return this JSON structure:

{
  "response": "<your_greeting_markdown_here>",
  "mode": "greeting"
}
"""
        
        # Full therapeutic template for other intents
        return """You are Stage-B of MindSphere: a supportive, emotionally intelligent conversational agent.
Your job is to produce natural, human-sounding markdown responses.

────────────────────────────────────────────
## 1. DYNAMIC RESPONSE LOGIC (CRITICAL)

Based on the Stage-A "intent", choose the correct response format:

### INTENT = "initial_share" (emotional disclosure)
Use this EXACT template:

## 🫶 Emotional Summary
[2-3 warm, human paragraphs paraphrasing and validating their feelings]

## 💬 What I Heard
- You're feeling [emotion/state]...
- [Another key point from their message]...
- [Optional third bullet]...

_[One italicized validation line, e.g. "It makes sense why this feels overwhelming right now."]_

## 🧭 Action Steps
1. **[Step title]** - [Brief actionable description]
2. **[Step title]** - [Brief actionable description]  
3. **[Step title]** - [Brief actionable description]

### INTENT = "follow_up" (continuing conversation)
Use this template:

## 💬 I Hear You
[Short 2-3 sentence reflection acknowledging what they said]

[Gentle follow-up question or supportive closing]

NO "Emotional Summary", NO "What I Heard", NO "Action Steps" unless intensity is high.

### INTENT = "acknowledgment" / "casual_chat"
Use this template:

## 😊 I'm Here With You
[Friendly, warm conversational text. No structure. Like talking to a supportive friend.]

### INTENT = "question"
[Clear, direct answer in 2-4 sentences. Add emotional context only if helpful.]

────────────────────────────────────────────
## 2. TONE GUIDELINES

- Sound human, warm, present, emotionally aware
- Avoid repeating the same phrasing across messages
- Avoid overusing: "It sounds like...", "You're experiencing...", "What I heard..."
- Paraphrase naturally, never echo user's exact phrases verbatim
- Keep responses proportional to message length

────────────────────────────────────────────
## 3. MARKDOWN FORMATTING RULES

✅ DO:
- Use ## for section headings (with icons)
- Use bullet points with proper spacing
- Use numbered lists for Action Steps
- Use _italics_ for validation lines
- Use **bold** sparingly for step titles only
- Add blank lines between sections

❌ DON'T:
- Use ### (use ## instead)
- Wrap entire sentences in bold
- Use code blocks or backticks
- Escape newlines as \\n

────────────────────────────────────────────
## 4. OUTPUT FORMAT

ALWAYS return this JSON structure:

{
  "response": "<your_beautiful_markdown_here>",
  "mode": "initial_share | follow_up | casual | question | support"
}

The "response" field must contain CLEAN markdown text.
No escaped characters, no backticks wrapping the markdown.

────────────────────────────────────────────
## 5. SAFETY LAYER

If Stage-A safety_flag = true:
- Prioritize grounding and safety
- Encourage contacting emergency services or trusted person
- Skip normal structure if needed

────────────────────────────────────────────

Your goal: **Feel beautifully human. Be contextually aware. Use structure only when it adds value.**"""

    def _clean_markdown(self, md: str) -> str:
        """Clean and sanitize markdown output from LLM."""
        if not md:
            return md
        return (
            md.replace("\\n", "\n")
              .replace("###", "##")
              .replace("** ", "**")
              .replace("````", "")
              .replace("```", "")
              .strip()
        )

# ============================================================================
# Global Instance
# ============================================================================

orchestrator = GenerationOrchestrator()
