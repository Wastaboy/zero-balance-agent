from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.recommendation import OverrideRequest
from services.audit import save_override

router = APIRouter()


@router.post("/override")
def post_override(payload: OverrideRequest, db: Session = Depends(get_db)):
    save_override(
        db=db,
        batch_id=payload.batch_id,
        account_id=payload.account_id,
        rim_number=payload.rim_number,
        new_recommendation=payload.new_recommendation,
        reviewer_name=payload.reviewer_name,
        reason=payload.reason,
    )
    return {
        "message": "Override saved",
        "account_id": payload.account_id,
        "new_recommendation": payload.new_recommendation,
        "reviewer": payload.reviewer_name,
    }
