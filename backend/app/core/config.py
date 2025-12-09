from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "MindSphere API"
    
    OPENAI_API_KEY: Optional[str] = None
    MONGODB_URI: Optional[str] = None
    MONGODB_DB_NAME: str = "mindsphere"
    
    # Orchestrator settings (Patch 1: GPT-4o Migration)
    USE_GPT4O_FOR_GENERATION: bool = True
    STAGEA_MODEL: str = "gpt-4o-mini"
    STAGEB_MODEL: str = "gpt-4o"
    STAGEB_TTL_SECONDS: int = 900
    RECOMMENDATIONS_USE_GPT4O: bool = False  # Keep recommendations on mini by default
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
