import sys
from pathlib import Path
from datetime import date, timedelta

sys.path.insert(0, str(Path(__file__).parent.parent))

from models.account import AccountRecord
from services.scoring import score_account, _lerp


def _account(**kwargs) -> AccountRecord:
    defaults = dict(
        account_id="TEST001",
        rim_number="RIM0001",
        current_balance=0.0,
        zero_balance_since=date.today() - timedelta(days=30),
        last_transaction_date=date.today() - timedelta(days=15),
        account_open_date=date.today() - timedelta(days=365),
        account_open_reason=None,
        has_other_products=False,
    )
    defaults.update(kwargs)
    return AccountRecord(**defaults)


def test_lerp_clamps():
    assert _lerp(0, 90, 365) == 0.0
    assert _lerp(400, 90, 365) == 1.0
    assert 0.0 < _lerp(200, 90, 365) < 1.0


def test_clear_keep():
    acc = _account(
        zero_balance_since=date.today() - timedelta(days=30),
        last_transaction_date=date.today() - timedelta(days=15),
        account_open_reason="salary_account",
        has_other_products=True,
    )
    result = score_account(acc)
    assert result.recommendation == "KEEP"
    assert result.close_score < 0.4


def test_clear_close():
    acc = _account(
        zero_balance_since=date.today() - timedelta(days=600),
        last_transaction_date=date.today() - timedelta(days=500),
        account_open_date=date.today() - timedelta(days=1200),
        has_other_products=False,
    )
    result = score_account(acc)
    assert result.recommendation == "CLOSE"
    assert result.close_score > 0.7


def test_borderline_review():
    acc = _account(
        zero_balance_since=date.today() - timedelta(days=200),
        last_transaction_date=date.today() - timedelta(days=150),
        has_other_products=False,
    )
    result = score_account(acc)
    assert result.recommendation == "REVIEW"
    assert 0.4 <= result.close_score <= 0.7


def test_new_account_hard_override():
    acc = _account(
        zero_balance_since=date.today() - timedelta(days=10),
        last_transaction_date=date.today() - timedelta(days=5),
        account_open_date=date.today() - timedelta(days=10),
        has_other_products=False,
    )
    result = score_account(acc)
    assert result.recommendation == "KEEP"
    assert result.hard_override_applied is not None


def test_cross_product_rim_override():
    acc = _account(
        zero_balance_since=date.today() - timedelta(days=300),
        last_transaction_date=date.today() - timedelta(days=200),
        account_open_date=date.today() - timedelta(days=800),
        has_other_products=True,
    )
    result = score_account(acc)
    assert result.recommendation == "KEEP"
    assert result.hard_override_applied is not None


def test_protected_reason_lowers_score():
    acc_protected = _account(account_open_reason="regulatory", has_other_products=False)
    acc_unprotected = _account(account_open_reason=None, has_other_products=False)
    assert score_account(acc_protected).close_score < score_account(acc_unprotected).close_score


def test_criteria_breakdown_present():
    acc = _account()
    result = score_account(acc)
    assert result.criteria_breakdown is not None
    assert 0.0 <= result.criteria_breakdown.zero_balance_days <= 1.0


def test_config_version_set():
    acc = _account()
    result = score_account(acc)
    assert result.config_version
    assert len(result.config_version) == 12
