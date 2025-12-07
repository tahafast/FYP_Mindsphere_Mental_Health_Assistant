"""
Safety API Endpoints

Routes:
- GET /api/v1/safety/logs - Retrieve all safety events
- POST /api/v1/safety/log - Create a new safety event
"""

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
import logging

from app.services.safety_service import safety_event_service

logger = logging.getLogger(__name__)
router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================

class SafetyEventCreate(BaseModel):
    """Request body for creating a safety event."""
    detected_trigger: str
    leas_score: float
    system_action: str
    status: str = "Resolved"
    metadata: Optional[dict] = None


class SafetyEventResponse(BaseModel):
    """Response model for a safety event."""
    id: str
    timestamp: str
    detected_trigger: str
    leas_score: float
    system_action: str
    status: str
    metadata: dict = {}


# ============================================================================
# Endpoints
# ============================================================================

@router.get(
    "/safety/logs",
    response_model=List[SafetyEventResponse],
    summary="Get all safety events",
    description="Returns all safety protocol events sorted by timestamp (newest first). Includes seed data and real-time events."
)
async def get_safety_logs():
    """
    Retrieve all safety events.
    
    Returns events sorted DESC by timestamp. Never cached for real-time accuracy.
    """
    logger.info("📥 GET /safety/logs request received")
    
    try:
        events = await safety_event_service.get_all_events()
        logger.info(f"📤 Returning {len(events)} safety events")
        return events
    except Exception as e:
        logger.error(f"Error in get_safety_logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve safety logs")


@router.post(
    "/safety/log",
    response_model=SafetyEventResponse,
    summary="Log a safety event",
    description="Creates a new safety protocol event with server-side timestamp."
)
async def create_safety_log(event: SafetyEventCreate):
    """
    Create a new safety event.
    
    Used by the chat endpoint when First Responder Protocol is triggered,
    or can be called directly for manual logging.
    """
    logger.info(f"📥 POST /safety/log: trigger={event.detected_trigger}, action={event.system_action}")
    
    try:
        created = await safety_event_service.log_event(
            detected_trigger=event.detected_trigger,
            leas_score=event.leas_score,
            system_action=event.system_action,
            status=event.status,
            metadata=event.metadata
        )
        
        if not created:
            raise HTTPException(status_code=500, detail="Failed to create safety event")
        
        logger.info(f"📤 Created safety event: {created.get('id')}")
        return created
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in create_safety_log: {e}")
        raise HTTPException(status_code=500, detail="Failed to create safety event")
