from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any

class BreathingSession(BaseModel):
    session_id: str
    user_id: str
    technique_id: str
    preset_name: Optional[str] = None
    start_timestamp: datetime
    end_timestamp: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    cycles_completed: Optional[int] = None
    completed: bool = False
    metadata: Optional[Dict[str, Any]] = None

class BreathingPreset(BaseModel):
    preset_id: str
    user_id: str
    name: str
    technique_id: str
    config: Dict[str, Any]
    created_at: datetime

class SessionStartRequest(BaseModel):
    user_id: str
    technique_id: str
    preset_name: Optional[str] = None
    duration_minutes: Optional[int] = None
    start_timestamp: datetime

class SessionStopRequest(BaseModel):
    session_id: str
    end_timestamp: datetime
    cycles_completed: int
    duration_seconds: int
    completed: bool

class PresetCreateRequest(BaseModel):
    user_id: str
    name: str
    technique_id: str
    config: Dict[str, Any]
