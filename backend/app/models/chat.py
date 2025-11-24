from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Message(BaseModel):
    id: str
    role: str
    content: str
    timestamp: Optional[datetime] = None
    isCrisis: Optional[bool] = False

class ChatRequest(BaseModel):
    message: str
    history: List[Message] = []

class ChatResponse(BaseModel):
    message: str
    isCrisis: bool = False
