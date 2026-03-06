import uuid
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.account import AccountRecord
from models.recommendation import RecommendationRecord
from services.ingestion import ingest
from services.recommendation import evaluate_accounts
from services.audit import save_batch

router = APIRouter()


@router.post("/evaluate", response_model=dict)
async def evaluate_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    filename = file.filename or "upload.csv"

    records, errors = ingest(content, filename)

    if not records and errors:
        raise HTTPException(
            status_code=422,
            detail={"message": "All rows failed validation", "errors": [e.model_dump() for e in errors]},
        )

    batch_id = str(uuid.uuid4())
    results = evaluate_accounts(records)
    save_batch(db, batch_id, results)

    return {
        "batch_id": batch_id,
        "total_processed": len(results),
        "total_errors": len(errors),
        "results": [r.model_dump() for r in results],
        "validation_errors": [e.model_dump() for e in errors],
    }


@router.post("/evaluate/json", response_model=dict)
async def evaluate_json(accounts: list[AccountRecord], db: Session = Depends(get_db)):
    batch_id = str(uuid.uuid4())
    results = evaluate_accounts(accounts)
    save_batch(db, batch_id, results)

    return {
        "batch_id": batch_id,
        "total_processed": len(results),
        "results": [r.model_dump() for r in results],
    }
