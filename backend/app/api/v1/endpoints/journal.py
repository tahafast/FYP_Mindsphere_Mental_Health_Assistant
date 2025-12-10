"""
Journal API Endpoints

Provides endpoints for:
- Create/update today's journal
- List journals by date range
- Get single journal
- Delete journal
- Calendar markers
- Vector search
- Export journal
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import PlainTextResponse
from typing import Optional, List
from pydantic import BaseModel
from pymongo import MongoClient
from bson import ObjectId
from app.core.config import settings
from app.models.journal import (
    JournalCreate, JournalResponse, JournalCalendarDay, 
    JournalCalendarResponse, JournalSearchRequest, JournalSearchResult,
    MoodType, SentimentType, CrisisLevel, AISuggestion
)
from app.services.journal_service import journal_service
from datetime import datetime, timedelta
import certifi
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# MongoDB Connection
if settings.MONGODB_URI:
    client = MongoClient(settings.MONGODB_URI, tlsCAFile=certifi.where())
    journals_collection = client[settings.MONGODB_DB_NAME]["journals"]
else:
    journals_collection = None
    logger.warning("MONGODB_URI not found. Journal endpoints disabled.")


def get_today_iso() -> str:
    """Get today's date in ISO format (YYYY-MM-DD)."""
    return datetime.utcnow().strftime("%Y-%m-%d")


def is_today(date_iso: str) -> bool:
    """Check if the given date is today."""
    return date_iso == get_today_iso()


def journal_doc_to_response(doc: dict) -> JournalResponse:
    """Convert MongoDB document to JournalResponse."""
    ai_suggestion = None
    if doc.get("ai_suggestion"):
        ai_suggestion = AISuggestion(**doc["ai_suggestion"])
    
    return JournalResponse(
        id=str(doc["_id"]),
        user_id=doc["user_id"],
        date_iso=doc["date_iso"],
        content=doc.get("content", ""),
        mood=MoodType(doc["mood"]) if doc.get("mood") else None,
        tags=doc.get("tags", []),
        summary=doc.get("summary"),
        sentiment=SentimentType(doc["sentiment"]) if doc.get("sentiment") else None,
        ai_suggestion=ai_suggestion,
        crisis_level=CrisisLevel(doc.get("crisis_level", "none")),
        created_at=doc.get("created_at", datetime.utcnow()),
        updated_at=doc.get("updated_at", datetime.utcnow()),
        is_today=is_today(doc["date_iso"])
    )


@router.post("/journal", response_model=JournalResponse)
async def create_or_update_journal(
    request: JournalCreate,
    user_id: str = Query(..., description="User ID")
):
    """
    Create or update today's journal entry.
    
    - If journal exists for today: update it
    - If no journal for today: create new
    - Only today's journal can be created/updated
    - Future dates are rejected with 400 error
    """
    if journals_collection is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    # Determine the date - use client's local date if provided
    date_iso = request.local_date or get_today_iso()
    
    # Validate: Cannot create journal for future dates
    # Since clients are in different timezones (UTC-12 to UTC+14), we need to be lenient:
    # Accept any date that's not more than 1 day ahead of UTC (accounts for UTC+14 timezone)
    from datetime import date
    try:
        requested_date = datetime.strptime(date_iso, "%Y-%m-%d").date()
        # Max allowed date is tomorrow in UTC (to accommodate UTC+14 timezones)
        max_allowed_date = datetime.utcnow().date() + timedelta(days=1)
        if requested_date > max_allowed_date:
            raise HTTPException(
                status_code=400, 
                detail="You cannot create a journal entry for a future date. Select today or a past date."
            )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")
    
    # Enforce one-per-day rule: only allow create/update for today (client's local today)
    # We accept if the date is "today" in the client's timezone, which could be:
    # - Today in UTC, or
    # - Tomorrow in UTC (for clients in UTC+ timezones like UTC+5 to UTC+14)
    today_utc = datetime.utcnow().date()
    if requested_date < today_utc - timedelta(days=1):
        raise HTTPException(
            status_code=400, 
            detail="Can only create or edit today's journal entry. Past entries are view-only."
        )
    
    # Check for existing journal
    existing = journals_collection.find_one({
        "user_id": user_id,
        "date_iso": date_iso,
        "is_deleted": {"$ne": True}
    })
    
    # Process journal through AI pipeline
    logger.info(f"Processing journal for user {user_id}")
    processing_result = await journal_service.process_journal(
        user_id=user_id,
        content=request.content,
        date_iso=date_iso,
        mood=request.mood.value if request.mood else None,
        allow_training=request.allow_training
    )
    
    # Prepare document
    now = datetime.utcnow()
    journal_doc = {
        "user_id": user_id,
        "date_iso": date_iso,
        "content": request.content,
        "mood": request.mood.value if request.mood else None,
        "tags": processing_result["tags"],
        "summary": processing_result["summary"],
        "sentiment": processing_result["sentiment"].value if processing_result["sentiment"] else None,
        "ai_suggestion": processing_result["ai_suggestion"].dict() if processing_result["ai_suggestion"] else None,
        "crisis_level": processing_result["crisis_level"].value,
        "embedding": processing_result["embedding"],
        "allow_training": request.allow_training,
        "updated_at": now,
        "is_deleted": False
    }
    
    if existing:
        # Update existing
        journals_collection.update_one(
            {"_id": existing["_id"]},
            {"$set": journal_doc}
        )
        journal_doc["_id"] = existing["_id"]
        journal_doc["created_at"] = existing.get("created_at", now)
        logger.info(f"Updated journal {existing['_id']} for user {user_id}")
    else:
        # Create new
        journal_doc["created_at"] = now
        result = journals_collection.insert_one(journal_doc)
        journal_doc["_id"] = result.inserted_id
        logger.info(f"Created journal {result.inserted_id} for user {user_id}")
    
    response = journal_doc_to_response(journal_doc)
    
    # Check for crisis and include in response metadata
    safety_result = processing_result.get("safety_result", {})
    if safety_result.get("isCrisis"):
        # The response will still be returned, but frontend should check crisis_level
        logger.warning(f"Crisis detected in journal for user {user_id}")
    
    return response


@router.get("/journal", response_model=List[JournalResponse])
async def get_journals(
    user_id: str = Query(..., description="User ID"),
    start: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """
    Get journal entries for a user within a date range.
    Defaults to last 30 days if no range specified.
    """
    if journals_collection is None:
        return []
    
    # Default to last 30 days
    if not end:
        end = get_today_iso()
    if not start:
        start_date = datetime.utcnow() - timedelta(days=30)
        start = start_date.strftime("%Y-%m-%d")
    
    try:
        cursor = journals_collection.find({
            "user_id": user_id,
            "date_iso": {"$gte": start, "$lte": end},
            "is_deleted": {"$ne": True}
        }).sort("date_iso", -1)
        
        return [journal_doc_to_response(doc) for doc in cursor]
    except Exception as e:
        logger.error(f"Error fetching journals: {e}")
        return []


class TagCount(BaseModel):
    """Tag with count for aggregation."""
    tag: str
    count: int


@router.get("/journal/tags/recent", response_model=List[TagCount])
async def get_recent_tags(
    user_id: str = Query(..., description="User ID"),
    limit: int = Query(20, description="Maximum number of tags to return")
):
    """
    Get recent journal tags with counts for the user.
    Used for the Personalization page "Recent Journal Themes" section.
    """
    if journals_collection is None:
        return []
    
    try:
        # Aggregate tags from recent journals
        pipeline = [
            {"$match": {"user_id": user_id, "is_deleted": {"$ne": True}}},
            {"$sort": {"date_iso": -1}},
            {"$limit": 50},  # Look at last 50 entries
            {"$unwind": "$tags"},
            {"$group": {"_id": {"$toLower": "$tags"}, "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": limit},
            {"$project": {"tag": "$_id", "count": 1, "_id": 0}}
        ]
        
        results = list(journals_collection.aggregate(pipeline))
        return [TagCount(tag=r["tag"], count=r["count"]) for r in results]
    except Exception as e:
        logger.error(f"Error fetching tags: {e}")
        return []


@router.get("/journal/calendar", response_model=JournalCalendarResponse)
async def get_journal_calendar(
    user_id: str = Query(..., description="User ID"),
    month: str = Query(..., description="Month (YYYY-MM)")
):
    """
    Get calendar markers for a month showing which days have journal entries.
    """
    if journals_collection is None:
        return JournalCalendarResponse(month=month, days=[])
    
    try:
        # Build date range for the month
        year, mon = month.split("-")
        start = f"{month}-01"
        # Get last day of month
        if int(mon) == 12:
            end = f"{int(year)+1}-01-01"
        else:
            end = f"{year}-{int(mon)+1:02d}-01"
        
        cursor = journals_collection.find({
            "user_id": user_id,
            "date_iso": {"$gte": start, "$lt": end},
            "is_deleted": {"$ne": True}
        }, {"date_iso": 1, "mood": 1})
        
        days = []
        for doc in cursor:
            days.append(JournalCalendarDay(
                date_iso=doc["date_iso"],
                has_entry=True,
                mood=MoodType(doc["mood"]) if doc.get("mood") else None
            ))
        
        return JournalCalendarResponse(month=month, days=days)
    except Exception as e:
        logger.error(f"Error fetching calendar: {e}")
        return JournalCalendarResponse(month=month, days=[])


@router.get("/journal/{journal_id}", response_model=JournalResponse)
async def get_journal(
    journal_id: str,
    user_id: str = Query(..., description="User ID")
):
    """Get a single journal entry by ID."""
    if journals_collection is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    try:
        doc = journals_collection.find_one({
            "_id": ObjectId(journal_id),
            "user_id": user_id,
            "is_deleted": {"$ne": True}
        })
        
        if not doc:
            raise HTTPException(status_code=404, detail="Journal not found")
        
        return journal_doc_to_response(doc)
    except Exception as e:
        logger.error(f"Error fetching journal: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch journal")


@router.delete("/journal/{journal_id}")
async def delete_journal(
    journal_id: str,
    user_id: str = Query(..., description="User ID")
):
    """
    Soft delete a journal entry.
    Also removes embedding from vector store.
    """
    if journals_collection is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    try:
        # Verify ownership
        doc = journals_collection.find_one({
            "_id": ObjectId(journal_id),
            "user_id": user_id
        })
        
        if not doc:
            raise HTTPException(status_code=404, detail="Journal not found")
        
        # Soft delete
        journals_collection.update_one(
            {"_id": ObjectId(journal_id)},
            {"$set": {"is_deleted": True, "updated_at": datetime.utcnow()}}
        )
        
        # Remove embedding
        await journal_service.delete_embedding(journal_id)
        
        logger.info(f"Deleted journal {journal_id} for user {user_id}")
        return {"message": "Journal deleted successfully", "id": journal_id}
    except Exception as e:
        logger.error(f"Error deleting journal: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete journal")


@router.post("/journal/search", response_model=List[JournalSearchResult])
async def search_journals(
    request: JournalSearchRequest,
    user_id: str = Query(..., description="User ID")
):
    """
    Search journals using vector similarity.
    Returns relevant entries based on semantic search.
    """
    if journals_collection is None:
        return []
    
    try:
        # Create query embedding
        query_embedding = await journal_service.create_embedding(request.query)
        
        if not query_embedding:
            return []
        
        # Use MongoDB Atlas Vector Search
        # Note: This requires a vector search index on the journals collection
        pipeline = [
            {
                "$vectorSearch": {
                    "index": "journal_vector_index",
                    "path": "embedding",
                    "queryVector": query_embedding,
                    "numCandidates": 50,
                    "limit": request.limit,
                    "filter": {
                        "user_id": user_id,
                        "is_deleted": {"$ne": True}
                    }
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "date_iso": 1,
                    "summary": 1,
                    "score": {"$meta": "vectorSearchScore"}
                }
            }
        ]
        
        results = list(journals_collection.aggregate(pipeline))
        
        return [
            JournalSearchResult(
                id=str(doc["_id"]),
                date_iso=doc["date_iso"],
                summary=doc.get("summary"),
                relevance_score=doc.get("score", 0.0)
            )
            for doc in results
        ]
    except Exception as e:
        logger.error(f"Error searching journals: {e}")
        # Fallback to text search if vector search fails
        return []


@router.get("/journal/export/{journal_id}")
async def export_journal(
    journal_id: str,
    user_id: str = Query(..., description="User ID")
):
    """Export a journal entry as plain text file."""
    if journals_collection is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    try:
        doc = journals_collection.find_one({
            "_id": ObjectId(journal_id),
            "user_id": user_id,
            "is_deleted": {"$ne": True}
        })
        
        if not doc:
            raise HTTPException(status_code=404, detail="Journal not found")
        
        # Build text content
        lines = [
            f"Journal Entry - {doc['date_iso']}",
            "=" * 40,
            "",
            doc.get("content", ""),
            "",
            "-" * 40,
        ]
        
        if doc.get("mood"):
            lines.append(f"Mood: {doc['mood']}")
        
        if doc.get("summary"):
            lines.append(f"Summary: {doc['summary']}")
        
        if doc.get("tags"):
            lines.append(f"Tags: {', '.join(doc['tags'])}")
        
        if doc.get("ai_suggestion"):
            suggestion = doc["ai_suggestion"]
            lines.append(f"\nAI Suggestion: {suggestion.get('suggestion', '')}")
        
        lines.append(f"\nExported: {datetime.utcnow().isoformat()}")
        
        text_content = "\n".join(lines)
        
        return PlainTextResponse(
            content=text_content,
            media_type="text/plain",
            headers={
                "Content-Disposition": f"attachment; filename=journal_{doc['date_iso']}.txt"
            }
        )
    except Exception as e:
        logger.error(f"Error exporting journal: {e}")
        raise HTTPException(status_code=500, detail="Failed to export journal")
