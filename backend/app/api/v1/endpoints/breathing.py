from fastapi import APIRouter, HTTPException
from typing import List
from pymongo import MongoClient
from app.core.config import settings
from app.models.breathing import (
    BreathingSession,
    BreathingPreset,
    SessionStartRequest,
    SessionStopRequest,
    PresetCreateRequest
)
import certifi
import uuid
from datetime import datetime
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# MongoDB Connection
if settings.MONGODB_URI:
    client = MongoClient(settings.MONGODB_URI, tlsCAFile=certifi.where())
    db = client[settings.MONGODB_DB_NAME]
    sessions_collection = db["breathing_sessions"]
    presets_collection = db["breathing_presets"]
else:
    sessions_collection = None
    presets_collection = None
    logger.warning("MONGODB_URI not found. Breathing exercise storage disabled.")

# Built-in breathing techniques
BUILTIN_TECHNIQUES = {
    "box-breathing": {
        "id": "box-breathing",
        "name": "4-4-4 Box Breathing",
        "description": "Equal timing for inhale, hold, exhale. Great for grounding and calming.",
        "use_case": "Stress reduction, focus",
        "steps": [
            {"type": "inhale", "duration": 4},
            {"type": "hold", "duration": 4},
            {"type": "exhale", "duration": 4},
            {"type": "hold", "duration": 4}
        ]
    },
    "4-7-8": {
        "id": "4-7-8",
        "name": "4-7-8 Relaxation",
        "description": "Extended hold and exhale for deep relaxation.",
        "use_case": "Anxiety reduction, sleep",
        "steps": [
            {"type": "inhale", "duration": 4},
            {"type": "hold", "duration": 7},
            {"type": "exhale", "duration": 8}
        ]
    },
    "resonant": {
        "id": "resonant",
        "name": "Resonant Breathing",
        "description": "Balanced breathing for autonomic nervous system regulation.",
        "use_case": "Balance, coherence",
        "steps": [
            {"type": "inhale", "duration": 5},
            {"type": "exhale", "duration": 5}
        ]
    },
    "guided-slow": {
        "id": "guided-slow",
        "name": "Guided Slow Breathing",
        "description": "Extended exhale for parasympathetic activation.",
        "use_case": "Sleep preparation, deep relaxation",
        "steps": [
            {"type": "inhale", "duration": 4},
            {"type": "hold", "duration": 1},
            {"type": "exhale", "duration": 6}
        ]
    }
}

@router.post("/breathing/session/start")
async def start_breathing_session(request: SessionStartRequest):
    """Start a new breathing exercise session."""
    if sessions_collection is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    session_id = str(uuid.uuid4())
    
    # Calculate expiry (default 1 hour from now)
    from datetime import timedelta
    expires_at = datetime.utcnow() + timedelta(hours=1)
    
    session = BreathingSession(
        session_id=session_id,
        user_id=request.user_id,
        technique_id=request.technique_id,
        preset_name=request.preset_name,
        start_timestamp=request.start_timestamp,
        completed=False,
        metadata={"duration_minutes": request.duration_minutes}
    )
    
    try:
        sessions_collection.insert_one(session.dict())
        logger.info(f"Started breathing session {session_id} for user {request.user_id}")
        
        return {
            "session_id": session_id,
            "expires_at": expires_at.isoformat()
        }
    except Exception as e:
        logger.error(f"Error starting session: {e}")
        raise HTTPException(status_code=500, detail="Failed to start session")

@router.post("/breathing/session/stop")
async def stop_breathing_session(request: SessionStopRequest):
    """Stop and save a breathing exercise session."""
    if sessions_collection is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    try:
        # Update session
        result = sessions_collection.update_one(
            {"session_id": request.session_id},
            {
                "$set": {
                    "end_timestamp": request.end_timestamp,
                    "duration_seconds": request.duration_seconds,
                    "cycles_completed": request.cycles_completed,
                    "completed": request.completed
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Retrieve updated session
        session = sessions_collection.find_one({"session_id": request.session_id})
        
        logger.info(f"Stopped breathing session {request.session_id}")
        
        return {
            "session_id": request.session_id,
            "duration_seconds": request.duration_seconds,
            "cycles_completed": request.cycles_completed,
            "completed": request.completed
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error stopping session: {e}")
        raise HTTPException(status_code=500, detail="Failed to stop session")

@router.get("/breathing/presets")
async def get_breathing_presets(user_id: str):
    """Get user presets and built-in techniques."""
    user_presets = []
    
    if presets_collection is not None:
        try:
            cursor = presets_collection.find({"user_id": user_id})
            for doc in cursor:
                user_presets.append({
                    "preset_id": doc["preset_id"],
                    "name": doc["name"],
                    "technique_id": doc["technique_id"],
                    "config": doc["config"],
                    "is_builtin": False
                })
        except Exception as e:
            logger.error(f"Error fetching presets: {e}")
    
    # Add built-in techniques
    builtin_presets = [
        {
            "preset_id": tech["id"],
            "name": tech["name"],
            "technique_id": tech["id"],
            "config": tech,
            "is_builtin": True
        }
        for tech in BUILTIN_TECHNIQUES.values()
    ]
    
    return {
        "user_presets": user_presets,
        "builtin_presets": builtin_presets
    }

@router.post("/breathing/presets")
async def create_breathing_preset(request: PresetCreateRequest):
    """Create a new breathing preset."""
    if presets_collection is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    preset_id = str(uuid.uuid4())
    
    preset = BreathingPreset(
        preset_id=preset_id,
        user_id=request.user_id,
        name=request.name,
        technique_id=request.technique_id,
        config=request.config,
        created_at=datetime.utcnow()
    )
    
    try:
        presets_collection.insert_one(preset.dict())
        logger.info(f"Created breathing preset {preset_id} for user {request.user_id}")
        
        return {
            "preset_id": preset_id,
            "name": request.name
        }
    except Exception as e:
        logger.error(f"Error creating preset: {e}")
        raise HTTPException(status_code=500, detail="Failed to create preset")

@router.delete("/breathing/presets/{preset_id}")
async def delete_breathing_preset(preset_id: str):
    """Delete a breathing preset."""
    if presets_collection is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    try:
        result = presets_collection.delete_one({"preset_id": preset_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Preset not found")
        
        logger.info(f"Deleted breathing preset {preset_id}")
        return {"message": "Preset deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting preset: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete preset")

@router.get("/breathing/techniques")
async def get_breathing_techniques():
    """Get all available breathing techniques."""
    return {
        "techniques": list(BUILTIN_TECHNIQUES.values())
    }
