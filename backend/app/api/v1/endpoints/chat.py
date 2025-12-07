from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from app.services.rag import rag_service
from transformers import pipeline
from pymongo import MongoClient
from app.core.config import settings
from datetime import datetime
import re
import logging
import torch

logger = logging.getLogger(__name__)

router = APIRouter()

# Detect GPU/CPU device
device = 0 if torch.cuda.is_available() else -1  # 0 for GPU, -1 for CPU
device_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "cpu"
logger.info(f"Device set to use {device_name}")

from app.services.sentiment import sentiment_service
from app.core.prompts import PROMPT_DIRECTIVE, PROMPT_EMPATHETIC, PROMPT_MOTIVATIONAL, PROMPT_DEFAULT
from app.services.safety_guard import safety_guard
from app.services.safety_service import safety_event_service
import json
from app.api.v1.endpoints.sessions import generate_session_title

# Crisis Keywords Regex (Removed, handled by SafetyGuard)
# CRISIS_REGEX = ...

class ChatRequest(BaseModel):
    user_id: str
    session_id: str
    message: str

class ChatResponse(BaseModel):
    response: str
    sentiment_score: float
    sentiment_label: str
    crisis_detected: bool = False

import certifi

# MongoDB Connections
if settings.MONGODB_URI:
    client = MongoClient(settings.MONGODB_URI, tlsCAFile=certifi.where())
    db = client[settings.MONGODB_DB_NAME]
    sentiment_collection = db["user_sentiment_metrics"]
    chat_histories_collection = db["chat_histories"]
else:
    sentiment_collection = None
    chat_histories_collection = None
    logger.warning("MONGODB_URI not found. Database features disabled.")

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, background_tasks: BackgroundTasks):
    user_input = request.message
    session_id = request.session_id
    logger.info(f"📨 Chat request received from user {request.user_id} for session {session_id}")
    
    # 0. Background Title Generation (if first message)
    if chat_histories_collection is not None:
        # Check if this session has any messages yet
        msg_count = chat_histories_collection.count_documents({"session_id": session_id})
        if msg_count == 0:
            logger.info(f"🆕 First message in session {session_id}. Triggering auto-title...")
            background_tasks.add_task(generate_session_title, session_id, user_input)

    # 1. Crisis Interceptor (Safety Guard)
    logger.info("🔍 Running safety guard validation...")
    safety_result = await safety_guard.validate_input(user_input)
    if safety_result.get("isCrisis"):
        logger.warning(f"⚠️ Crisis detected for user {request.user_id}: {safety_result.get('crisisType')}")
        
        # Log crisis event to MongoDB BEFORE returning (prevents survivor bias in LEAS graph)
        if sentiment_collection is not None:
            try:
                logger.info("💾 Logging CRISIS event to MongoDB...")
                sentiment_collection.insert_one({
                    "user_id": request.user_id,
                    "session_id": session_id,
                    "timestamp": datetime.utcnow(),
                    "sentiment_score": -1.0,  # Maximum distress
                    "emotion_label": "crisis",
                    "input_preview": user_input[:100]
                })
                logger.info("✅ Crisis event logged successfully.")
            except Exception as e:
                logger.error(f"❌ Error logging crisis: {e}")
        
        # Log to safety_events collection for Safety Logs dashboard
        try:
            detected_trigger = user_input[:50].lower().strip()
            await safety_event_service.log_event(
                detected_trigger=detected_trigger,
                leas_score=-1.0,
                system_action="First Responder Protocol",
                status="Resolved",
                metadata={"detection_method": safety_result.get("detection_method", "unknown")}
            )
        except Exception as e:
            logger.error(f"❌ Error logging safety event: {e}")
        
        return ChatResponse(
            response=json.dumps(safety_result), # Send the full JSON payload as response string for frontend to parse
            sentiment_score=-1.0,
            sentiment_label="crisis",
            crisis_detected=True
        )
    logger.info("✅ Safety check passed.")

    # 2. Advanced Emotion Analysis (Sentiment Service)
    logger.info("🧠 Analyzing sentiment...")
    sentiment_result = sentiment_service.analyze_emotion(user_input)
    sentiment_score = sentiment_result["score"]
    label = sentiment_result["label"]
    logger.info(f"📊 Sentiment: {label} (score: {sentiment_score:.2f})")

    # 2.1 Fear-Based Crisis Trigger
    # If sentiment is FEAR and score is very low (high confidence fear), force safety protocol
    if label == 'fear' and sentiment_score < -0.8:
        logger.warning(f"⚠️ High Fear detected ({sentiment_score}). Triggering Safety Guard.")
        
        # Log fear-based crisis to MongoDB BEFORE returning
        if sentiment_collection is not None:
            try:
                logger.info("💾 Logging FEAR-CRISIS event to MongoDB...")
                sentiment_collection.insert_one({
                    "user_id": request.user_id,
                    "session_id": session_id,
                    "timestamp": datetime.utcnow(),
                    "sentiment_score": sentiment_score,  # Use calculated fear score
                    "emotion_label": "crisis",
                    "input_preview": user_input[:100]
                })
                logger.info("✅ Fear-crisis event logged successfully.")
            except Exception as e:
                logger.error(f"❌ Error logging fear-crisis: {e}")
        
        # Log to safety_events collection for Safety Logs dashboard
        try:
            await safety_event_service.log_event(
                detected_trigger="high fear response",
                leas_score=sentiment_score,
                system_action="First Responder Protocol",
                status="Resolved",
                metadata={"detection_method": "fear_threshold", "emotion_label": label}
            )
        except Exception as e:
            logger.error(f"❌ Error logging safety event: {e}")
        
        safety_result = safety_guard.get_crisis_response()
        return ChatResponse(
            response=json.dumps(safety_result),
            sentiment_score=sentiment_score,
            sentiment_label=label,
            crisis_detected=True
        )
    
    # Select Tone Prompt
    tone_section = PROMPT_DEFAULT
    if label in ['fear', 'anger'] or sentiment_score < -0.6:
        tone_section = PROMPT_DIRECTIVE
        logger.info("🎯 Selected DIRECTIVE tone (fear/anger detected)")
    elif label == 'sadness':
        tone_section = PROMPT_EMPATHETIC
        logger.info("🎯 Selected EMPATHETIC tone (sadness detected)")
    elif label in ['joy', 'love']:
        tone_section = PROMPT_MOTIVATIONAL
        logger.info("🎯 Selected MOTIVATIONAL tone (joy/love detected)")
    else:
        logger.info("🎯 Selected DEFAULT tone")
    
    # 3. LEAS Logging
    if sentiment_collection is not None:
        try:
            logger.info("💾 Logging sentiment to MongoDB...")
            sentiment_collection.insert_one({
                "user_id": request.user_id,
                "session_id": session_id,
                "timestamp": datetime.utcnow(),
                "sentiment_score": sentiment_score,
                "emotion_label": label,
                "input_preview": user_input[:100]
            })
            logger.info("✅ Sentiment logged successfully.")
        except Exception as e:
            logger.error(f"❌ Error logging sentiment: {e}")
    
    # 4. RAG Generation
    logger.info("🤖 Generating RAG response...")
    try:
        response_text = await rag_service.generate_response(user_input, tone_section=tone_section)
        logger.info(f"✅ RAG response generated ({len(response_text)} chars)")
    except Exception as e:
        logger.error(f"❌ Error generating response: {str(e)}")
        response_text = "I apologize, but I'm having trouble processing your message right now. Please try again."
    
    # 5. Save Chat History
    if chat_histories_collection is not None:
        try:
            chat_histories_collection.insert_one({
                "session_id": session_id,
                "user_id": request.user_id,
                "role": "user",
                "content": user_input,
                "timestamp": datetime.utcnow()
            })
            chat_histories_collection.insert_one({
                "session_id": session_id,
                "user_id": request.user_id,
                "role": "assistant",
                "content": response_text,
                "timestamp": datetime.utcnow()
            })
            logger.info(f"💾 Saved chat history for session {session_id}")
        except Exception as e:
            logger.error(f"❌ Error saving chat history: {e}")

    logger.info(f"✅ Chat request completed for user {request.user_id}")
    return ChatResponse(
        response=response_text,
        sentiment_score=sentiment_score,
        sentiment_label=label,
        crisis_detected=False
    )
