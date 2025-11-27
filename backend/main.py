from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.endpoints import chat

from contextlib import asynccontextmanager
from app.services.sentiment import sentiment_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        sentiment_service.load_model()
    except Exception as e:
        print(f"Warning: Failed to load sentiment model: {e}")
    yield
    # Shutdown

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
from app.api.v1.endpoints import chat, knowledge, user
app.include_router(chat.router, prefix=f"{settings.API_V1_STR}", tags=["chat"])
app.include_router(knowledge.router, prefix=f"{settings.API_V1_STR}/knowledge", tags=["knowledge"])
app.include_router(user.router, prefix=f"{settings.API_V1_STR}/user", tags=["user"])

@app.get("/")
async def root():
    return {"message": "MindSphere API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
