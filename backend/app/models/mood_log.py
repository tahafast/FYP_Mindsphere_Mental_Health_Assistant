from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class MoodLog(BaseModel):
    user_id: str
    mood: str  # 'sad', 'neutral', 'happy'
    timestamp: datetime
    source: str = 'manual'  # vs 'sentiment_analysis'

class MoodLogResponse(BaseModel):
    user_id: str
    mood: str
    timestamp: datetime
    message: str
