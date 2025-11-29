from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.models.session import ChatSession
from app.core.config import settings
from pymongo import MongoClient
import certifi
import uuid
from datetime import datetime
from typing import List
import logging
from app.services.rag import rag_service

router = APIRouter()
logger = logging.getLogger(__name__)

# MongoDB Connection
if settings.MONGODB_URI:
    client = MongoClient(settings.MONGODB_URI, tlsCAFile=certifi.where())
    db = client[settings.MONGODB_DB_NAME]
    sessions_collection = db["chat_sessions"]
else:
    sessions_collection = None
    logger.warning("MONGODB_URI not found. Session management disabled.")

@router.post("/sessions", response_model=ChatSession)
async def create_session(user_id: str):
    """Creates a new chat session."""
    if sessions_collection is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    session_id = str(uuid.uuid4())
    new_session = ChatSession(
        session_id=session_id,
        user_id=user_id,
        title="New Chat",
        created_at=datetime.utcnow(),
        is_active=True
    )
    
    sessions_collection.insert_one(new_session.dict())
    logger.info(f"Created new session {session_id} for user {user_id}")
    return new_session

@router.get("/sessions", response_model=List[ChatSession])
async def get_sessions(user_id: str):
    """Returns all active sessions for the user, sorted by date (newest first)."""
    if sessions_collection is None:
        return []
    
    cursor = sessions_collection.find(
        {"user_id": user_id, "is_active": True}
    ).sort("created_at", -1)
    
    sessions = []
    for doc in cursor:
        sessions.append(ChatSession(**doc))
    
    return sessions

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Soft deletes a session."""
    if sessions_collection is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    result = sessions_collection.update_one(
        {"session_id": session_id},
        {"$set": {"is_active": False}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    
    logger.info(f"Soft deleted session {session_id}")
    return {"message": "Session deleted"}

@router.post("/sessions/{session_id}/title")
async def generate_session_title(session_id: str, message: str):
    """Generates a title for the session based on the first message."""
    if sessions_collection is None:
        return {"message": "Database unavailable"}
        
    try:
        # Use the LLM from RAG service
        prompt = f"Summarize the following user message into a concise, 3-5 word title for a chat history sidebar. Do not use quotes. Example: 'Anxiety about Work'. Message: {message}"
        
        response = await rag_service.llm.ainvoke(prompt)
        title = response.content.strip().replace('"', '')
        
        # Update DB
        sessions_collection.update_one(
            {"session_id": session_id},
            {"$set": {"title": title}}
        )
        logger.info(f"Updated title for session {session_id} to: {title}")
        return {"title": title}
        
    except Exception as e:
        logger.error(f"Error generating title: {e}")
        return {"title": "New Chat"}

@router.get("/sessions/{session_id}/messages")
async def get_session_messages(session_id: str):
    """Returns chat history for a specific session."""
    if sessions_collection is None:
        return []
    
    # We need to access chat_histories collection. 
    # Ideally we should import it or use db["chat_histories"]
    chat_histories = db["chat_histories"]
    
    cursor = chat_histories.find({"session_id": session_id}).sort("timestamp", 1)
    
    messages = []
    for doc in cursor:
        messages.append({
            "id": str(doc.get("_id")),
            "role": doc.get("role"),
            "content": doc.get("content"),
            "timestamp": doc.get("timestamp")
        })
    
    return messages
