from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.endpoints import chat

from contextlib import asynccontextmanager
from app.services.sentiment import sentiment_service
from app.services.rag import rag_service
import logging

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting application startup...")
    
    try:
        logger.info("📊 Loading sentiment analysis model...")
        sentiment_service.load_model()
        logger.info("✅ Sentiment model loaded successfully.")
    except Exception as e:
        logger.error(f"❌ Failed to load sentiment model: {e}")
    
    try:
        logger.info("🔥 Warming up RAG service (initializing BM25 retriever)...")
        await rag_service.initialize_bm25()
        logger.info("✅ RAG service warmed up successfully.")
    except Exception as e:
        logger.error(f"❌ Failed to warm up RAG service: {e}")
    
    logger.info("✅ Application startup complete.")
    yield
    # Shutdown
    logger.info("🛑 Application shutdown.")

app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
from app.api.v1.endpoints import chat, knowledge, user, sessions, moods, breathing
app.include_router(chat.router, prefix=f"{settings.API_V1_STR}", tags=["chat"])
app.include_router(knowledge.router, prefix=f"{settings.API_V1_STR}/knowledge", tags=["knowledge"])
app.include_router(user.router, prefix=f"{settings.API_V1_STR}/user", tags=["user"])
app.include_router(sessions.router, prefix=f"{settings.API_V1_STR}", tags=["sessions"])
app.include_router(moods.router, prefix=f"{settings.API_V1_STR}", tags=["moods"])
app.include_router(breathing.router, prefix=f"{settings.API_V1_STR}", tags=["breathing"])

@app.get("/")
async def root():
    return {"message": "MindSphere API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
