from fastapi import APIRouter, HTTPException
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
import json

# Crisis Keywords Regex (Removed, handled by SafetyGuard)
# CRISIS_REGEX = ...

class ChatRequest(BaseModel):
    user_id: str
    message: str

class ChatResponse(BaseModel):
    response: str
    sentiment_score: float
    sentiment_label: str
    crisis_detected: bool = False

import certifi

# MongoDB for Sentiment Metrics
if settings.MONGODB_URI:
    client = MongoClient(settings.MONGODB_URI, tlsCAFile=certifi.where())
    sentiment_collection = client[settings.MONGODB_DB_NAME]["user_sentiment_metrics"]
else:
    sentiment_collection = None
    logger.warning("MONGODB_URI not found. Sentiment logging disabled.")

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    user_input = request.message
    
    # 1. Crisis Interceptor (Safety Guard)
    safety_result = await safety_guard.validate_input(user_input)
    if safety_result.get("isCrisis"):
        logger.warning(f"Crisis detected for user {request.user_id}: {safety_result.get('crisisType')}")
        return ChatResponse(
            response=json.dumps(safety_result), # Send the full JSON payload as response string for frontend to parse
            sentiment_score=-1.0,
            sentiment_label="crisis",
            crisis_detected=True
        )

    # 2. Advanced Emotion Analysis (Sentiment Service)
    sentiment_result = sentiment_service.analyze_emotion(user_input)
    sentiment_score = sentiment_result["score"]
    label = sentiment_result["label"]
    
    # Select Tone Prompt
    tone_section = PROMPT_DEFAULT
    if label in ['fear', 'anger'] or sentiment_score < -0.6:
        tone_section = PROMPT_DIRECTIVE
    elif label == 'sadness':
        tone_section = PROMPT_EMPATHETIC
    elif label in ['joy', 'love']:
        tone_section = PROMPT_MOTIVATIONAL
    
    # 3. LEAS Logging
    if sentiment_collection is not None:
        try:
            sentiment_collection.insert_one({
                "user_id": request.user_id,
                "timestamp": datetime.utcnow(),
                "sentiment_score": sentiment_score,
                "emotion_label": label,
                "input_preview": user_input[:50]
            })
        except Exception as e:
            logger.error(f"Error logging sentiment: {e}")

    # 4. RAG Generation
    try:
        response_text = await rag_service.generate_response(user_input, tone_section=tone_section)
    except Exception as e:
        logger.error(f"Error generating response: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

    return ChatResponse(
        response=response_text,
        sentiment_score=sentiment_score,
        sentiment_label=label
    )
