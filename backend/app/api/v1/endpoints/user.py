from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from pymongo import MongoClient
from app.core.config import settings
from datetime import datetime

router = APIRouter()

import certifi

if settings.MONGODB_URI:
    client = MongoClient(settings.MONGODB_URI, tlsCAFile=certifi.where())
    sentiment_collection = client[settings.MONGODB_DB_NAME]["user_sentiment_metrics"]
else:
    sentiment_collection = None

class SentimentLog(BaseModel):
    user_id: str
    timestamp: datetime
    sentiment_score: float
    emotion_label: str
    input_preview: Optional[str] = None

@router.get("/mood-history", response_model=List[SentimentLog])
async def get_mood_history(user_id: str = Query(..., description="The ID of the user")):
    if sentiment_collection is None:
        return []
    
    try:
        cursor = sentiment_collection.find({"user_id": user_id}).sort("timestamp", 1)
        logs = []
        for doc in cursor:
            logs.append(SentimentLog(
                user_id=doc["user_id"],
                timestamp=doc["timestamp"],
                sentiment_score=doc.get("sentiment_score", 0.0),
                emotion_label=doc.get("emotion_label", "neutral"),
                input_preview=doc.get("input_preview")
            ))
        return logs
    except Exception as e:
        print(f"Error fetching mood history: {e}")
        return []
