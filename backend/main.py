import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# Configure logging early
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import config first
from app.core.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Production-safe lifespan handler with lazy model loading."""
    logger.info("🚀 Starting MindSphere API...")
    
    # Don't load heavy ML models on startup in production
    # They will be loaded on first use (lazy loading)
    if os.environ.get("LOAD_MODELS_ON_STARTUP", "false").lower() == "true":
        try:
            from app.services.sentiment import sentiment_service
            logger.info("📊 Loading sentiment analysis model...")
            sentiment_service.load_model()
            logger.info("✅ Sentiment model loaded successfully.")
        except Exception as e:
            logger.warning(f"⚠️ Sentiment model not loaded on startup: {e}")
        
        try:
            from app.services.rag import rag_service
            logger.info("🔥 Warming up RAG service...")
            await rag_service.initialize_bm25()
            logger.info("✅ RAG service warmed up.")
        except Exception as e:
            logger.warning(f"⚠️ RAG service not warmed up on startup: {e}")
    else:
        logger.info("📦 Models will be loaded lazily on first request")
    
    logger.info("✅ MindSphere API startup complete!")
    yield
    logger.info("🛑 MindSphere API shutdown.")

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware - Allow all origins for now
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint (critical for fly.io)
@app.get("/")
async def root():
    return {"status": "ok", "message": "MindSphere API is running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# Import and include routers
try:
    from app.api.v1.endpoints import chat, knowledge, user, sessions, moods, breathing, journal, recommendations, safety
    
    app.include_router(chat.router, prefix=f"{settings.API_V1_STR}", tags=["chat"])
    app.include_router(knowledge.router, prefix=f"{settings.API_V1_STR}/knowledge", tags=["knowledge"])
    app.include_router(user.router, prefix=f"{settings.API_V1_STR}/user", tags=["user"])
    app.include_router(sessions.router, prefix=f"{settings.API_V1_STR}", tags=["sessions"])
    app.include_router(moods.router, prefix=f"{settings.API_V1_STR}", tags=["moods"])
    app.include_router(breathing.router, prefix=f"{settings.API_V1_STR}", tags=["breathing"])
    app.include_router(journal.router, prefix=f"{settings.API_V1_STR}", tags=["journal"])
    app.include_router(recommendations.router, prefix=f"{settings.API_V1_STR}", tags=["recommendations"])
    app.include_router(safety.router, prefix=f"{settings.API_V1_STR}", tags=["safety"])
    logger.info("✅ All routers registered successfully")
except Exception as e:
    logger.error(f"❌ Failed to register routers: {e}")
    raise

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
