from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "MindSphere API"
    
    OPENAI_API_KEY: Optional[str] = None
    MONGODB_URI: Optional[str] = None
    MONGODB_DB_NAME: str = "mindsphere"
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
