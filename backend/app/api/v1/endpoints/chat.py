from fastapi import APIRouter, HTTPException
from app.models.chat import ChatRequest, ChatResponse
from app.services.safety_guard import safety_guard
from app.core.config import settings

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    # 1. Validate input
    if not await safety_guard.validate_input(request.message):
        raise HTTPException(status_code=400, detail="Unsafe content detected")

    # 2. RAG Logic (Placeholder)
    # We now have access to request.history if needed for context
    
    # Mock response
    response_text = f"I received your message: '{request.message}'. I also see you have {len(request.history)} previous messages in context."

    # 3. Validate output
    if not await safety_guard.validate_output(response_text):
        response_text = "Response blocked by safety guard."

    return ChatResponse(message=response_text, isCrisis=False)
