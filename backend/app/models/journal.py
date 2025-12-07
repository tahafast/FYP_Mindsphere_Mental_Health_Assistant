from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class MoodType(str, Enum):
    SAD = "sad"
    NEUTRAL = "neutral"
    HAPPY = "happy"
    GREAT = "great"
    ANXIOUS = "anxious"


class SentimentType(str, Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    MIXED = "mixed"


class CrisisLevel(str, Enum):
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class SuggestionType(str, Enum):
    AFFIRMATION = "affirmation"
    COPING = "coping"
    ACTION = "action"
    GRATITUDE = "gratitude"


class AISuggestion(BaseModel):
    """AI-generated suggestion stored with journal entry."""
    suggestion: str
    type: SuggestionType = SuggestionType.AFFIRMATION


class CrisisClassification(BaseModel):
    """Crisis risk classification result."""
    level: CrisisLevel = CrisisLevel.NONE
    reason: Optional[str] = None
    actions: List[str] = []


class Journal(BaseModel):
    """Core journal entry model."""
    user_id: str
    date_iso: str  # YYYY-MM-DD (user's local date)
    content: str
    mood: Optional[MoodType] = None
    tags: List[str] = []
    summary: Optional[str] = None
    sentiment: Optional[SentimentType] = None
    ai_suggestion: Optional[AISuggestion] = None
    crisis_level: CrisisLevel = CrisisLevel.NONE
    embedding: Optional[List[float]] = None
    allow_training: bool = False  # Opt-in for model training
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_deleted: bool = False


class JournalCreate(BaseModel):
    """Request model for creating/updating a journal entry."""
    content: str
    mood: Optional[MoodType] = None
    local_date: Optional[str] = None  # YYYY-MM-DD, defaults to today
    allow_training: bool = False


class JournalResponse(BaseModel):
    """Response model with full journal data and AI insights."""
    id: str
    user_id: str
    date_iso: str
    content: str
    mood: Optional[MoodType] = None
    tags: List[str] = []
    summary: Optional[str] = None
    sentiment: Optional[SentimentType] = None
    ai_suggestion: Optional[AISuggestion] = None
    crisis_level: CrisisLevel = CrisisLevel.NONE
    created_at: datetime
    updated_at: datetime
    is_today: bool = False  # Whether this entry can be edited


class JournalCalendarDay(BaseModel):
    """Lightweight model for calendar day markers."""
    date_iso: str
    has_entry: bool = True
    mood: Optional[MoodType] = None


class JournalCalendarResponse(BaseModel):
    """Response for calendar endpoint."""
    month: str  # YYYY-MM
    days: List[JournalCalendarDay] = []


class JournalSearchRequest(BaseModel):
    """Request model for vector search."""
    query: str
    limit: int = 10


class JournalSearchResult(BaseModel):
    """Search result item."""
    id: str
    date_iso: str
    summary: Optional[str] = None
    relevance_score: float
