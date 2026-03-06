from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime


class CriteriaBreakdown(BaseModel):
    zero_balance_days: float
    last_activity_days: float
    has_other_products: float
    account_age_days: float
    account_open_reason: float


class RecommendationRecord(BaseModel):
    account_id: str
    rim_number: str
    recommendation: Literal["KEEP", "CLOSE", "REVIEW"]
    close_score: float
    confidence: Literal["HIGH", "MEDIUM", "LOW"]
    reasoning: str
    criteria_breakdown: CriteriaBreakdown
    hard_override_applied: Optional[str] = None
    evaluated_at: datetime
    config_version: str


class OverrideRequest(BaseModel):
    account_id: str
    rim_number: str
    batch_id: str
    new_recommendation: Literal["KEEP", "CLOSE", "REVIEW"]
    reviewer_name: str
    reason: str
