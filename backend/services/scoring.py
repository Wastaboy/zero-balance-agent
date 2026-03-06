import hashlib
import yaml
from datetime import date, datetime
from pathlib import Path
from typing import Optional

from models.account import AccountRecord
from models.recommendation import RecommendationRecord, CriteriaBreakdown

CONFIG_PATH = Path(__file__).parent.parent / "config" / "criteria.yaml"


def load_config() -> dict:
    with open(CONFIG_PATH, "r") as f:
        return yaml.safe_load(f)


def get_config_version(config: dict) -> str:
    raw = yaml.dump(config, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()[:12]


def _lerp(value: float, low: float, high: float) -> float:
    """Linear interpolation — clamps result between 0.0 and 1.0."""
    if value <= low:
        return 0.0
    if value >= high:
        return 1.0
    return (value - low) / (high - low)


def _score_zero_balance_days(days: int, cfg: dict) -> float:
    low = cfg["thresholds"]["low_risk"]
    high = cfg["thresholds"]["high_risk"]
    return _lerp(days, low, high)


def _score_last_activity_days(days: int, cfg: dict) -> float:
    active = cfg["thresholds"]["active"]
    dormant = cfg["thresholds"]["dormant"]
    return _lerp(days, active, dormant)


def _score_has_other_products(has_products: bool, _cfg: dict) -> float:
    return 0.0 if has_products else 1.0


def _score_account_age_days(days: int, cfg: dict) -> float:
    new_thresh = cfg["thresholds"]["new_account"]
    established = cfg["thresholds"]["established"]
    if days < new_thresh:
        return 0.0
    if days <= established:
        return _lerp(days, new_thresh, established) * 0.5
    return 0.5


def _score_account_open_reason(reason: Optional[str], cfg: dict) -> float:
    protected = [r.lower() for r in cfg.get("protected_reasons", [])]
    if reason and reason.lower() in protected:
        return 0.0
    return 0.7


def _check_hard_overrides(
    account: AccountRecord,
    zero_balance_days: int,
    account_age_days: int,
    config: dict,
) -> Optional[str]:
    overrides = config.get("hard_overrides", [])
    new_thresh = config["criteria"]["account_age_days"]["thresholds"]["new_account"]

    for override in overrides:
        condition = override["condition"]
        if "account_age_days < new_account" in condition:
            if account_age_days < new_thresh:
                return override["action"], override["reason"]
        elif "has_other_products == true AND zero_balance_days < 365" in condition:
            if account.has_other_products and zero_balance_days < 365:
                return override["action"], override["reason"]

    return None


def _days_since(d: date) -> int:
    return (date.today() - d).days


def _confidence(score: float, keep_below: float, close_above: float) -> str:
    mid = (keep_below + close_above) / 2
    distance = abs(score - mid) / ((close_above - keep_below) / 2)
    if distance >= 0.7:
        return "HIGH"
    if distance >= 0.3:
        return "MEDIUM"
    return "LOW"


def score_account(account: AccountRecord) -> RecommendationRecord:
    config = load_config()
    config_version = get_config_version(config)
    criteria = config["criteria"]
    thresholds = config["decision_thresholds"]

    zero_balance_days = _days_since(account.zero_balance_since)
    last_activity_days = _days_since(account.last_transaction_date)
    account_age_days = _days_since(account.account_open_date)
    has_products = account.has_other_products or False

    # Step 1: hard overrides
    override_result = _check_hard_overrides(
        account, zero_balance_days, account_age_days, config
    )
    if override_result:
        action, override_reason = override_result
        breakdown = CriteriaBreakdown(
            zero_balance_days=0.0,
            last_activity_days=0.0,
            has_other_products=0.0,
            account_age_days=0.0,
            account_open_reason=0.0,
        )
        return RecommendationRecord(
            account_id=account.account_id,
            rim_number=account.rim_number,
            recommendation=action,
            close_score=0.0,
            confidence="HIGH",
            reasoning=f"Hard override applied: {override_reason}",
            criteria_breakdown=breakdown,
            hard_override_applied=override_reason,
            evaluated_at=datetime.utcnow(),
            config_version=config_version,
        )

    # Step 2: score each criterion
    s_zero = _score_zero_balance_days(zero_balance_days, criteria["zero_balance_days"])
    s_activity = _score_last_activity_days(last_activity_days, criteria["last_activity_days"])
    s_products = _score_has_other_products(has_products, criteria["has_other_products"])
    s_age = _score_account_age_days(account_age_days, criteria["account_age_days"])
    s_reason = _score_account_open_reason(account.account_open_reason, criteria["account_open_reason"])

    # Step 3: weighted sum
    w = {k: v["weight"] for k, v in criteria.items()}
    close_score = (
        s_zero * w["zero_balance_days"]
        + s_activity * w["last_activity_days"]
        + s_products * w["has_other_products"]
        + s_age * w["account_age_days"]
        + s_reason * w["account_open_reason"]
    )
    close_score = round(close_score, 4)

    # Step 4: map to recommendation
    keep_below = thresholds["keep_below"]
    close_above = thresholds["close_above"]
    if close_score < keep_below:
        recommendation = "KEEP"
    elif close_score > close_above:
        recommendation = "CLOSE"
    else:
        recommendation = "REVIEW"

    # Step 5: human-readable reasoning
    parts = []
    if s_zero >= 0.8:
        parts.append(f"zero-balance for {zero_balance_days} days")
    if s_activity >= 0.8:
        parts.append(f"no transaction in {last_activity_days} days")
    if s_products == 1.0:
        parts.append("no other active products under RIM")
    elif s_products == 0.0:
        parts.append("has other active products under RIM")
    if account.account_open_reason:
        parts.append(f"opened as '{account.account_open_reason}'")

    reason_text = ", ".join(parts) if parts else "standard evaluation"
    reasoning = (
        f"Recommended {recommendation} (score: {close_score:.2f}). "
        f"Account {account.account_id}: {reason_text}."
    )

    confidence = _confidence(close_score, keep_below, close_above)

    breakdown = CriteriaBreakdown(
        zero_balance_days=round(s_zero, 4),
        last_activity_days=round(s_activity, 4),
        has_other_products=round(s_products, 4),
        account_age_days=round(s_age, 4),
        account_open_reason=round(s_reason, 4),
    )

    return RecommendationRecord(
        account_id=account.account_id,
        rim_number=account.rim_number,
        recommendation=recommendation,
        close_score=close_score,
        confidence=confidence,
        reasoning=reasoning,
        criteria_breakdown=breakdown,
        hard_override_applied=None,
        evaluated_at=datetime.utcnow(),
        config_version=config_version,
    )
