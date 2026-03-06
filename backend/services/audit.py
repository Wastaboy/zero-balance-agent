import json
import yaml
from pathlib import Path
from sqlalchemy.orm import Session

from database import AuditLogEntry
from models.recommendation import RecommendationRecord

CONFIG_PATH = Path(__file__).parent.parent / "config" / "criteria.yaml"


def _load_config_snapshot() -> str:
    with open(CONFIG_PATH) as f:
        return json.dumps(yaml.safe_load(f))


def save_batch(db: Session, batch_id: str, results: list[RecommendationRecord]):
    config_snapshot = _load_config_snapshot()
    for r in results:
        entry = AuditLogEntry(
            entry_type="evaluation",
            batch_id=batch_id,
            account_id=r.account_id,
            rim_number=r.rim_number,
            recommendation=r.recommendation,
            close_score=r.close_score,
            confidence=r.confidence,
            reasoning=r.reasoning,
            criteria_breakdown=r.criteria_breakdown.model_dump_json(),
            hard_override_applied=r.hard_override_applied,
            config_version=r.config_version,
            config_snapshot=config_snapshot,
        )
        db.add(entry)
    db.commit()


def save_override(
    db: Session,
    batch_id: str,
    account_id: str,
    rim_number: str,
    new_recommendation: str,
    reviewer_name: str,
    reason: str,
):
    entry = AuditLogEntry(
        entry_type="override",
        batch_id=batch_id,
        account_id=account_id,
        rim_number=rim_number,
        recommendation=new_recommendation,
        overridden_by=reviewer_name,
        override_reason=reason,
    )
    db.add(entry)
    db.commit()


def save_config_change(db: Session, new_config: dict):
    entry = AuditLogEntry(
        entry_type="config_change",
        config_snapshot=json.dumps(new_config),
    )
    db.add(entry)
    db.commit()
