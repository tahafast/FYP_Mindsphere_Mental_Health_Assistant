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

# Initialize Emotion Classifier (Lazy loading recommended for production, but global for now)
# Using a smaller, faster model for "startup-grade" performance
try:
    emotion_classifier = pipeline(
        "text-classification", 
        model="bhadresh-savani/distilbert-base-uncased-emotion", 
        top_k=1,
        device=device  # Use GPU if available
    )
    logger.info(f"Emotion classifier loaded successfully on {device_name}.")
except Exception as e:
    logger.error(f"Failed to load emotion classifier: {e}")
    emotion_classifier = None

# Crisis Keywords Regex
CRISIS_REGEX = re.compile(r'\b(suicide|kill myself|end my life|hurt myself|die|death|overdose)\b', re.IGNORECASE)

class ChatRequest(BaseModel):
    user_id: str
    message: str

class ChatResponse(BaseModel):
    response: str
    sentiment_score: float
    sentiment_label: str
    crisis_detected: bool = False

# MongoDB for Sentiment Metrics
if settings.MONGODB_URI:
    client = MongoClient(settings.MONGODB_URI)
    sentiment_collection = client[settings.MONGODB_DB_NAME]["user_sentiment_metrics"]
else:
    sentiment_collection = None
    logger.warning("MONGODB_URI not found. Sentiment logging disabled.")

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    user_input = request.message
    
    # 1. Crisis Interceptor
    if CRISIS_REGEX.search(user_input):
        logger.warning(f"Crisis keyword detected for user {request.user_id}")
        return ChatResponse(
            response="I'm concerned about what you're sharing. Please reach out to a crisis counselor immediately. You can call 988 or text HOME to 741741 in the US/Canada, or 111 in the UK.",
            sentiment_score=-1.0,
            sentiment_label="crisis",
            crisis_detected=True
        )

    # 2. Advanced Emotion Analysis (Transformers)
    sentiment_score = 0.0
    label = "neutral"
    
    if emotion_classifier:
        try:
            # Result is a list of lists (top_k=1) -> [[{'label': 'joy', 'score': 0.9}]]
            results = emotion_classifier(user_input)
            top_result = results[0][0]
            label = top_result['label'] # e.g., 'joy', 'sadness', 'anger'
            confidence = top_result['score']
            
            # Map emotion labels to a -1.0 to 1.0 scale for the graph
            # joy/love -> positive
            # sadness/anger/fear -> negative
            # surprise -> neutral/positive depending on context, map to 0.1
            
            emotion_map = {
                "joy": 0.8,
                "love": 0.9,
                "surprise": 0.1,
                "sadness": -0.8,
                "anger": -0.7,
                "fear": -0.9
            }
            
            # Weighted score based on confidence
            base_score = emotion_map.get(label, 0.0)
            sentiment_score = base_score * confidence
            
        except Exception as e:
            logger.error(f"Emotion analysis failed: {e}")
            # Fallback to simple logic or 0.0
            sentiment_score = 0.0
            label = "error"
    
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
        response_text = await rag_service.generate_response(user_input)
    except Exception as e:
        logger.error(f"Error generating response: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

    return ChatResponse(
        response=response_text,
        sentiment_score=sentiment_score,
        sentiment_label=label
    )
