from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from pydantic import BaseModel
from pymongo import MongoClient
from app.core.config import settings
from datetime import datetime, timedelta
from app.models.mood_log import MoodLog, MoodLogResponse
import certifi
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# MongoDB Connection
if settings.MONGODB_URI:
    client = MongoClient(settings.MONGODB_URI, tlsCAFile=certifi.where())
    mood_logs_collection = client[settings.MONGODB_DB_NAME]["mood_logs"]
else:
    mood_logs_collection = None
    logger.warning("MONGODB_URI not found. Mood logging disabled.")

class MoodLogRequest(BaseModel):
    user_id: str
    mood: str  # 'sad', 'neutral', 'happy'

@router.post("/moods", response_model=MoodLogResponse)
async def log_mood(request: MoodLogRequest):
    """Log a user's mood (manual check-in)."""
    if mood_logs_collection is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    # Validate mood value
    valid_moods = ['sad', 'neutral', 'happy']
    if request.mood not in valid_moods:
        raise HTTPException(status_code=400, detail=f"Invalid mood. Must be one of: {valid_moods}")
    
    mood_log = MoodLog(
        user_id=request.user_id,
        mood=request.mood,
        timestamp=datetime.utcnow(),
        source='manual'
    )
    
    try:
        mood_logs_collection.insert_one(mood_log.dict())
        logger.info(f"Logged mood '{request.mood}' for user {request.user_id}")
        
        return MoodLogResponse(
            user_id=mood_log.user_id,
            mood=mood_log.mood,
            timestamp=mood_log.timestamp,
            message=f"Mood logged: {request.mood}"
        )
    except Exception as e:
        logger.error(f"Error logging mood: {e}")
        raise HTTPException(status_code=500, detail="Failed to log mood")

@router.get("/moods/latest")
async def get_latest_mood(user_id: str = Query(..., description="The ID of the user")):
    """Get the user's most recent mood log from today."""
    if mood_logs_collection is None:
        return None
    
    try:
        # Get today's date range
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        # Find most recent mood log from today
        latest = mood_logs_collection.find_one(
            {
                "user_id": user_id,
                "timestamp": {"$gte": today_start, "$lt": today_end}
            },
            sort=[("timestamp", -1)]
        )
        
        if latest:
            return {
                "mood": latest["mood"],
                "timestamp": latest["timestamp"]
            }
        return None
        
    except Exception as e:
        logger.error(f"Error fetching latest mood: {e}")
        return None
