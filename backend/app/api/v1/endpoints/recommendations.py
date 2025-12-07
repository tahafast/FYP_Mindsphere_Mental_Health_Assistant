"""
Recommendations API Endpoint

Route: GET /api/v1/recommendations/daily
Auth: Required (user_id query param)

Returns emotionally intelligent, therapist-style daily recommendations.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel
import logging

from app.services.recommendation_service import recommendation_service

logger = logging.getLogger(__name__)
router = APIRouter()


# ============================================================================
# Response Models
# ============================================================================

class TrendPoint(BaseModel):
    """Single day trend point."""
    date: str
    score: float


class DailyRecommendationResponse(BaseModel):
    """
    Daily recommendation response - emotionally intelligent format.
    
    Fields:
        daily_digest_title: "Daily Digest • {weekday}, {month} {day}"
        emotional_summary: Human-like reflection of emotional patterns
        suggestion_for_today: Personalized, actionable suggestion
        average_leas_score: Weighted average score
        status_label: Calm/Stable/Mixed/Elevated/Anxious
        trend_points: List of date/score pairs for the analysis window
    """
    daily_digest_title: str
    emotional_summary: str
    suggestion_for_today: str
    average_leas_score: float
    status_label: str
    trend_points: List[TrendPoint]


# ============================================================================
# Endpoints
# ============================================================================

@router.get(
    "/recommendations/daily",
    response_model=DailyRecommendationResponse,
    summary="Get daily recommendation",
    description="""
    Returns an emotionally intelligent, therapist-style daily recommendation 
    based on the user's recent LEAS (Longitudinal Emotional Alignment Score) data.
    
    The recommendation includes:
    - A nuanced emotional summary (not generic statements)
    - A personalized, actionable suggestion
    - Status label: Calm, Stable, Mixed, Elevated, or Anxious
    - Trend points for the last N days
    
    Results are cached for 15 minutes per user to reduce LLM costs.
    Use refresh=true to bypass the cache and regenerate.
    """
)
async def get_daily_recommendation(
    user_id: str = Query(..., description="The authenticated user's ID"),
    window_days: int = Query(3, ge=1, le=7, description="Number of days to analyze"),
    user_tz: Optional[str] = Query(None, description="User's timezone (e.g., 'Asia/Karachi')"),
    refresh: bool = Query(False, description="Set to true to bypass cache and recalculate")
):
    """
    Get personalized daily recommendation based on recent emotional data.
    
    Privacy Note: This endpoint returns aggregated statistics and 
    AI-generated text. Raw journal content is used only for LLM context
    and is never stored or returned in the response.
    """
    logger.info(f"📥 Recommendation request: user_id={user_id}, days={window_days}, refresh={refresh}")
    
    try:
        # Invalidate cache if refresh requested
        if refresh:
            cache_key = recommendation_service._get_cache_key(user_id, window_days)
            recommendation_service._cache.invalidate(cache_key)
            logger.info(f"🔄 Cache invalidated for refresh request")
        
        result = await recommendation_service.get_daily_recommendation(
            user_id=user_id,
            days=window_days,
            user_tz=user_tz
        )
        
        logger.info(
            f"📤 Returning recommendation: status={result['status_label']}, "
            f"avg={result['average_leas_score']}, days={len(result['trend_points'])}"
        )
        
        # Transform to response model
        trend_points = [
            TrendPoint(date=tp["date"], score=tp["score"])
            for tp in result.get("trend_points", [])
        ]
        
        return DailyRecommendationResponse(
            daily_digest_title=result["daily_digest_title"],
            emotional_summary=result["emotional_summary"],
            suggestion_for_today=result["suggestion_for_today"],
            average_leas_score=result["average_leas_score"],
            status_label=result["status_label"],
            trend_points=trend_points
        )
        
    except Exception as e:
        logger.error(f"Error generating recommendation: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Unable to generate recommendation at this time."
        )
