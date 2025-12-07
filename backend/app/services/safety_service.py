"""
Safety Event Service - Manages safety protocol event logging.

This service:
1. Maintains a MongoDB collection for safety events
2. Seeds initial mock data (permanently kept)
3. Logs real-time safety protocol activations
4. Retrieves events sorted by timestamp (DESC)
"""

import logging
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from pymongo import MongoClient, DESCENDING
from app.core.config import settings
import certifi

logger = logging.getLogger(__name__)


# ============================================================================
# Seed Data (Mock entries - NEVER removed)
# ============================================================================

SEED_EVENTS = [
    {
        "id": "seed-1",
        "timestamp": "2025-11-26T22:00:00Z",
        "detected_trigger": "hopeless",
        "leas_score": -0.92,
        "system_action": "Empathetic Persona",
        "status": "Monitored",
        "metadata": {"source": "seed_data"}
    },
    {
        "id": "seed-2",
        "timestamp": "2025-12-07T09:15:00Z",
        "detected_trigger": "panic",
        "leas_score": -0.88,
        "system_action": "Grounding Exercise",
        "status": "Resolved",
        "metadata": {"source": "seed_data"}
    }
]


# ============================================================================
# Safety Event Service
# ============================================================================

class SafetyEventService:
    """Service for managing safety protocol event logging."""
    
    def __init__(self):
        """Initialize MongoDB connection and seed data."""
        if settings.MONGODB_URI:
            self.client = MongoClient(settings.MONGODB_URI, tlsCAFile=certifi.where())
            self.db = self.client[settings.MONGODB_DB_NAME]
            self.collection = self.db["safety_events"]
            
            # Ensure seed data exists (only insert if not present)
            self._ensure_seed_data()
            logger.info("SafetyEventService initialized with MongoDB")
        else:
            logger.warning("MONGODB_URI not found. Safety event logging disabled.")
            self.collection = None
    
    def _ensure_seed_data(self):
        """Ensure seed entries exist in the database."""
        try:
            for seed in SEED_EVENTS:
                existing = self.collection.find_one({"id": seed["id"]})
                if not existing:
                    self.collection.insert_one(seed.copy())
                    logger.info(f"Seeded safety event: {seed['id']}")
        except Exception as e:
            logger.error(f"Error seeding safety events: {e}")
    
    async def log_event(
        self,
        detected_trigger: str,
        leas_score: float,
        system_action: str,
        status: str = "Resolved",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Log a new safety protocol event.
        
        Args:
            detected_trigger: The trigger phrase (e.g., "panic", "chest pain")
            leas_score: LEAS score at moment of detection
            system_action: Action taken (e.g., "First Responder Protocol")
            status: Event status ("Resolved", "Monitored", "Escalated")
            metadata: Optional additional data
        
        Returns:
            The created event document
        """
        if self.collection is None:
            logger.warning("Safety event collection unavailable")
            return {}
        
        event = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "detected_trigger": detected_trigger,
            "leas_score": round(leas_score, 2),
            "system_action": system_action,
            "status": status,
            "metadata": metadata or {}
        }
        
        try:
            self.collection.insert_one(event.copy())
            logger.info(f"🛡️ Safety event logged: {detected_trigger} | Status: {status}")
            return event
        except Exception as e:
            logger.error(f"Error logging safety event: {e}")
            return {}
    
    async def get_all_events(self) -> List[Dict[str, Any]]:
        """
        Retrieve all safety events sorted by timestamp (newest first).
        
        Returns:
            List of safety event documents
        """
        if self.collection is None:
            logger.warning("Safety event collection unavailable")
            return []
        
        try:
            # Sort by timestamp descending (newest first)
            # Parse ISO timestamp for proper sorting
            cursor = self.collection.find({}, {"_id": 0}).sort("timestamp", DESCENDING)
            events = list(cursor)
            logger.info(f"📋 Retrieved {len(events)} safety events")
            return events
        except Exception as e:
            logger.error(f"Error retrieving safety events: {e}")
            return []


# Global instance
safety_event_service = SafetyEventService()
