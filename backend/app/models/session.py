from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class ChatSession(BaseModel):
    session_id: str
    user_id: str
    title: str = "New Chat"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True  # For soft delete
