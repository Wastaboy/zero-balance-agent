import yaml
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from services.audit import save_config_change

CONFIG_PATH = Path(__file__).parent.parent / "config" / "criteria.yaml"
router = APIRouter()


@router.get("/config")
def get_config():
    with open(CONFIG_PATH) as f:
        return yaml.safe_load(f)


@router.put("/config")
def update_config(new_config: dict, db: Session = Depends(get_db)):
    # Validate weights sum to 1.0
    criteria = new_config.get("criteria", {})
    total_weight = sum(v.get("weight", 0) for v in criteria.values())
    if abs(total_weight - 1.0) > 0.001:
        raise HTTPException(
            status_code=422,
            detail=f"Criterion weights must sum to 1.0, got {total_weight:.4f}",
        )

    # Validate thresholds are sensible (low < high where applicable)
    zb = criteria.get("zero_balance_days", {}).get("thresholds", {})
    if zb and zb.get("low_risk", 0) >= zb.get("high_risk", 1):
        raise HTTPException(status_code=422, detail="zero_balance_days: low_risk must be < high_risk")

    la = criteria.get("last_activity_days", {}).get("thresholds", {})
    if la and la.get("active", 0) >= la.get("dormant", 1):
        raise HTTPException(status_code=422, detail="last_activity_days: active must be < dormant")

    dt = new_config.get("decision_thresholds", {})
    if dt and dt.get("keep_below", 0) >= dt.get("close_above", 1):
        raise HTTPException(status_code=422, detail="decision_thresholds: keep_below must be < close_above")

    with open(CONFIG_PATH, "w") as f:
        yaml.dump(new_config, f, default_flow_style=False, sort_keys=False)

    save_config_change(db, new_config)
    return {"message": "Config updated successfully"}
