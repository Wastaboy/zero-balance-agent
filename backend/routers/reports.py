import csv
import io
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db, AuditLogEntry

router = APIRouter()


def _entries_to_dict(entries):
    results = []
    for e in entries:
        breakdown = None
        if e.criteria_breakdown:
            try:
                breakdown = json.loads(e.criteria_breakdown)
            except Exception:
                breakdown = {}
        results.append({
            "account_id": e.account_id,
            "rim_number": e.rim_number,
            "recommendation": e.recommendation,
            "close_score": e.close_score,
            "confidence": e.confidence,
            "reasoning": e.reasoning,
            "criteria_breakdown": breakdown,
            "hard_override_applied": e.hard_override_applied,
            "config_version": e.config_version,
            "evaluated_at": e.created_at.isoformat() if e.created_at else None,
            "batch_id": e.batch_id,
            "overridden_by": e.overridden_by,
            "override_reason": e.override_reason,
        })
    return results


@router.get("/report/{batch_id}")
def get_report(
    batch_id: str,
    recommendation: str = Query(None),
    sort: str = Query("close_score"),
    limit: int = Query(1000),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLogEntry).filter(
        AuditLogEntry.batch_id == batch_id,
        AuditLogEntry.entry_type == "evaluation",
    )
    if recommendation:
        query = query.filter(AuditLogEntry.recommendation == recommendation.upper())
    if sort == "close_score":
        query = query.order_by(AuditLogEntry.close_score.desc())
    elif sort == "account_id":
        query = query.order_by(AuditLogEntry.account_id)
    query = query.limit(limit)
    entries = query.all()

    if not entries:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")

    return {"batch_id": batch_id, "results": _entries_to_dict(entries)}


@router.get("/report/{batch_id}/summary")
def get_summary(batch_id: str, db: Session = Depends(get_db)):
    entries = db.query(AuditLogEntry).filter(
        AuditLogEntry.batch_id == batch_id,
        AuditLogEntry.entry_type == "evaluation",
    ).all()

    if not entries:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")

    counts = {"KEEP": 0, "CLOSE": 0, "REVIEW": 0}
    scores = []
    for e in entries:
        if e.recommendation in counts:
            counts[e.recommendation] += 1
        if e.close_score is not None:
            scores.append(e.close_score)

    avg_score = round(sum(scores) / len(scores), 4) if scores else 0.0

    return {
        "batch_id": batch_id,
        "total": len(entries),
        "keep": counts["KEEP"],
        "close": counts["CLOSE"],
        "review": counts["REVIEW"],
        "average_close_score": avg_score,
    }


@router.get("/export/{batch_id}")
def export_batch(batch_id: str, db: Session = Depends(get_db)):
    entries = db.query(AuditLogEntry).filter(
        AuditLogEntry.batch_id == batch_id,
        AuditLogEntry.entry_type == "evaluation",
    ).all()

    if not entries:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "account_id", "rim_number", "recommendation", "close_score",
        "confidence", "reasoning", "hard_override_applied",
        "config_version", "evaluated_at",
    ])
    writer.writeheader()
    for e in entries:
        writer.writerow({
            "account_id": e.account_id,
            "rim_number": e.rim_number,
            "recommendation": e.recommendation,
            "close_score": e.close_score,
            "confidence": e.confidence,
            "reasoning": e.reasoning,
            "hard_override_applied": e.hard_override_applied or "",
            "config_version": e.config_version,
            "evaluated_at": e.created_at.isoformat() if e.created_at else "",
        })

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=batch_{batch_id}.csv"},
    )


@router.get("/rim/{rim_number}")
def get_rim(rim_number: str, db: Session = Depends(get_db)):
    entries = db.query(AuditLogEntry).filter(
        AuditLogEntry.rim_number == rim_number,
        AuditLogEntry.entry_type == "evaluation",
    ).order_by(AuditLogEntry.created_at.desc()).all()

    if not entries:
        raise HTTPException(status_code=404, detail=f"RIM {rim_number} not found")

    return {"rim_number": rim_number, "accounts": _entries_to_dict(entries)}
