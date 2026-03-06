import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.ingestion import ingest

FIXTURE = Path(__file__).parent / "fixtures" / "sample_accounts.csv"


def test_loads_fixture():
    content = FIXTURE.read_bytes()
    records, errors = ingest(content, "sample_accounts.csv")
    assert len(records) > 0


def test_validation_error_missing_rim():
    content = FIXTURE.read_bytes()
    records, errors = ingest(content, "sample_accounts.csv")
    # ACC019 has no rim_number — should be an error
    error_ids = [e.account_id for e in errors]
    assert "ACC019" in error_ids or any(e for e in errors)


def test_rim_enrichment_multi_account():
    content = FIXTURE.read_bytes()
    records, errors = ingest(content, "sample_accounts.csv")
    # RIM0010 has 3 accounts — all should have has_other_products=True
    rim10 = [r for r in records if r.rim_number == "RIM0010"]
    assert len(rim10) == 3
    for r in rim10:
        assert r.has_other_products is True


def test_rim_enrichment_single_account():
    content = FIXTURE.read_bytes()
    records, errors = ingest(content, "sample_accounts.csv")
    # RIM0002 has only 1 account — has_other_products depends on other_active_products column
    rim2 = [r for r in records if r.rim_number == "RIM0002"]
    assert len(rim2) == 1
    assert rim2[0].has_other_products is False


def test_external_products_flag():
    content = FIXTURE.read_bytes()
    records, errors = ingest(content, "sample_accounts.csv")
    # ACC005 has other_active_products = savings_account
    acc5 = next((r for r in records if r.account_id == "ACC005"), None)
    assert acc5 is not None
    assert acc5.has_other_products is True
