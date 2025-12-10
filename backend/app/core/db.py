"""
MongoDB Database Connection with Lazy Loading and Retry Logic.

Features:
- Lazy connection (only connects when first needed, not at startup)
- Exponential backoff retry for transient failures
- Connection pooling with sensible defaults
- Health check support
"""

import logging
import time
from typing import Optional
from functools import lru_cache

from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from pymongo.database import Database
import certifi

from app.core.config import settings

logger = logging.getLogger(__name__)

# Connection state
_mongo_client: Optional[MongoClient] = None


def get_mongo_client(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 30.0
) -> MongoClient:
    """
    Get MongoDB client with retry logic and connection pooling.
    
    Uses lazy initialization - only connects when first called.
    Implements exponential backoff for transient connection failures.
    
    Args:
        max_retries: Maximum number of connection attempts
        base_delay: Initial delay between retries (seconds)
        max_delay: Maximum delay between retries (seconds)
    
    Returns:
        MongoClient: Connected MongoDB client
        
    Raises:
        ConnectionFailure: If all connection attempts fail
    """
    global _mongo_client
    
    if _mongo_client is not None:
        return _mongo_client
    
    if not settings.MONGODB_URI:
        raise ValueError("MONGODB_URI environment variable is not set")
    
    last_error = None
    
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"🔌 MongoDB connection attempt {attempt}/{max_retries}...")
            
            client = MongoClient(
                settings.MONGODB_URI,
                tlsCAFile=certifi.where(),
                serverSelectionTimeoutMS=30000,  # 30 second timeout
                connectTimeoutMS=20000,          # 20 second connect timeout
                socketTimeoutMS=20000,           # 20 second socket timeout
                retryWrites=True,
                maxPoolSize=10,
                minPoolSize=1
            )
            
            # Ping to verify connection
            client.admin.command('ping')
            
            _mongo_client = client
            logger.info("✅ MongoDB connected successfully!")
            return client
            
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            last_error = e
            delay = min(base_delay * (2 ** (attempt - 1)), max_delay)
            
            logger.warning(
                f"⚠️ MongoDB connection attempt {attempt} failed: {e}. "
                f"Retrying in {delay:.1f}s..."
            )
            
            if attempt < max_retries:
                time.sleep(delay)
            else:
                logger.error(f"❌ MongoDB connection failed after {max_retries} attempts")
                raise ConnectionFailure(
                    f"Failed to connect to MongoDB after {max_retries} attempts: {last_error}"
                )
    
    # This should never be reached, but just in case
    raise ConnectionFailure("Failed to connect to MongoDB")


def get_db() -> Database:
    """
    Get the MongoDB database instance.
    
    This should be called at request time, not at import time,
    to ensure lazy connection initialization.
    
    Returns:
        Database: MongoDB database instance
    """
    client = get_mongo_client()
    return client[settings.MONGODB_DB_NAME]


def close_mongo_client():
    """Close the MongoDB client connection."""
    global _mongo_client
    
    if _mongo_client is not None:
        _mongo_client.close()
        _mongo_client = None
        logger.info("🔌 MongoDB connection closed")


def check_mongo_health() -> dict:
    """
    Check MongoDB connection health.
    
    Returns:
        dict: Health status with 'status' and optional 'error' keys
    """
    try:
        client = get_mongo_client()
        client.admin.command('ping')
        return {"status": "healthy", "message": "MongoDB connected"}
    except Exception as e:
        logger.error(f"MongoDB health check failed: {e}")
        return {"status": "unhealthy", "error": str(e)}
