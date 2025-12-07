from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from pymongo import MongoClient
from app.core.config import settings
from datetime import datetime

router = APIRouter()

import certifi
from datetime import timedelta

if settings.MONGODB_URI:
    client = MongoClient(settings.MONGODB_URI, tlsCAFile=certifi.where())
    sentiment_collection = client[settings.MONGODB_DB_NAME]["user_sentiment_metrics"]
    breathing_sessions_collection = client[settings.MONGODB_DB_NAME]["breathing_sessions"]
else:
    sentiment_collection = None
    breathing_sessions_collection = None

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

@router.get("/insights")
async def get_user_insights(user_id: str = Query(..., description="The ID of the user")):
    """Get weekly insights including check-in count and mood interpretation."""
    if sentiment_collection is None:
        return {
            "check_in_count": 0,
            "exercises_completed": 0,
            "interpretation": "No data available yet. Start chatting to generate insights."
        }
    
    try:
        # Get data from last 7 days
        from datetime import datetime, timedelta
        week_ago = datetime.utcnow() - timedelta(days=7)
        
        cursor = sentiment_collection.find({
            "user_id": user_id,
            "timestamp": {"$gte": week_ago}
        }).sort("timestamp", 1)
        
        logs = list(cursor)
        check_in_count = len(logs)
        
        # Generate simple interpretation based on average sentiment
        if check_in_count == 0:
            interpretation = "No check-ins this week. Start a conversation to track your mood."
        else:
            avg_sentiment = sum(log.get("sentiment_score", 0.0) for log in logs) / check_in_count
            
            if avg_sentiment > 0.3:
                interpretation = "Your mood has been positive this week. Keep up the great work!"
            elif avg_sentiment > 0:
                interpretation = "Your mood has been stable this week."
            elif avg_sentiment > -0.3:
                interpretation = "Your mood has been slightly low this week. Consider reaching out for support."
            else:
                interpretation = "Your mood has been challenging this week. Remember, it's okay to ask for help."
        
        return {
            "check_in_count": check_in_count,
            "exercises_completed": 0,  # Placeholder for future feature
            "interpretation": interpretation
        }
    except Exception as e:
        print(f"Error fetching insights: {e}")
        return {
            "check_in_count": 0,
            "exercises_completed": 0,
            "interpretation": "Unable to load insights at this time."
        }

@router.get("/stats/weekly")
async def get_weekly_stats(user_id: str = Query(..., description="The ID of the user")):
    """
    Get weekly statistics including check-ins and breathing exercises count.
    
    Returns:
        JSON with check_ins and exercises counts from the last 7 days
    """
    if sentiment_collection is None or breathing_sessions_collection is None:
        return {
            "check_ins": 0,
            "exercises": 0
        }
    
    try:
        # Calculate start date for last 7 days
        start_date = datetime.utcnow() - timedelta(days=7)
        
        # Count check-ins (sentiment logs) from last 7 days
        check_ins = sentiment_collection.count_documents({
            "user_id": user_id,
            "timestamp": {"$gte": start_date}
        })
        
        # Count breathing exercises from last 7 days
        exercises = breathing_sessions_collection.count_documents({
            "user_id": user_id,
            "start_timestamp": {"$gte": start_date}
        })
        
        return {
            "check_ins": check_ins,
            "exercises": exercises
        }
    except Exception as e:
        print(f"Error fetching weekly stats: {e}\")")
        return {
            "check_ins": 0,
            "exercises": 0
        }
