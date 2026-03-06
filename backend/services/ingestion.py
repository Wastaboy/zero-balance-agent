import pandas as pd
from datetime import date
from typing import Union
from io import BytesIO

from models.account import AccountRecord, ValidationError


REQUIRED_FIELDS = [
    "account_id", "rim_number", "current_balance",
    "zero_balance_since", "last_transaction_date", "account_open_date",
]
DATE_FIELDS = ["zero_balance_since", "last_transaction_date", "account_open_date"]


def parse_file(content: bytes, filename: str) -> pd.DataFrame:
    if filename.endswith(".csv"):
        return pd.read_csv(BytesIO(content), dtype=str)
    elif filename.endswith((".xlsx", ".xls")):
        return pd.read_excel(BytesIO(content), dtype=str)
    raise ValueError(f"Unsupported file type: {filename}")


def _parse_date(val: str) -> Union[date, None]:
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"):
        try:
            return pd.to_datetime(val, format=fmt).date()
        except Exception:
            continue
    return None


def ingest(content: bytes, filename: str) -> tuple[list[AccountRecord], list[ValidationError]]:
    df = parse_file(content, filename)
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    records: list[AccountRecord] = []
    errors: list[ValidationError] = []

    # First pass: collect all rows and validate
    raw_rows = []
    for i, row in df.iterrows():
        row_errors = []
        account_id = str(row.get("account_id", "")).strip() or None

        # Check required fields
        for field in REQUIRED_FIELDS:
            val = row.get(field)
            if pd.isna(val) or str(val).strip() == "":
                row_errors.append(f"Missing required field: {field}")

        # Parse balance
        balance = None
        try:
            balance = float(str(row.get("current_balance", "")).strip())
            if balance != 0.0:
                row_errors.append(f"current_balance must be 0.00, got {balance}")
        except (ValueError, TypeError):
            row_errors.append("current_balance is not a valid number")

        # Parse dates
        parsed_dates = {}
        for field in DATE_FIELDS:
            val = str(row.get(field, "")).strip()
            if val and val != "nan":
                d = _parse_date(val)
                if d is None:
                    row_errors.append(f"Cannot parse date for {field}: '{val}'")
                else:
                    parsed_dates[field] = d
            else:
                parsed_dates[field] = None

        if row_errors:
            errors.append(ValidationError(
                account_id=account_id,
                row_index=int(i),
                errors=row_errors,
            ))
            continue

        # Parse optional fields
        reason = str(row.get("account_open_reason", "")).strip()
        reason = reason if reason and reason != "nan" else None

        products_raw = str(row.get("other_active_products", "")).strip()
        products = (
            [p.strip() for p in products_raw.split(",") if p.strip()]
            if products_raw and products_raw != "nan"
            else None
        )

        raw_rows.append({
            "account_id": account_id,
            "rim_number": str(row.get("rim_number", "")).strip(),
            "current_balance": balance,
            "zero_balance_since": parsed_dates["zero_balance_since"],
            "last_transaction_date": parsed_dates["last_transaction_date"],
            "account_open_date": parsed_dates["account_open_date"],
            "account_open_reason": reason,
            "other_active_products": products,
        })

    # RIM-level enrichment: determine has_other_products for each account
    # A RIM "has other products" if it has at least one sibling account in the dataset
    # with a non-zero balance OR explicit other_active_products listed
    rim_to_rows = {}
    for row in raw_rows:
        rim = row["rim_number"]
        rim_to_rows.setdefault(rim, []).append(row)

    for rim, rim_rows in rim_to_rows.items():
        # Check if any sibling has other_active_products listed
        has_external_products = any(
            row["other_active_products"] for row in rim_rows
        )
        # If multiple accounts under same RIM, treat as cross-product relationship
        has_sibling_accounts = len(rim_rows) > 1

        for row in rim_rows:
            row["has_other_products"] = has_external_products or has_sibling_accounts

    for row in raw_rows:
        try:
            records.append(AccountRecord(**row))
        except Exception as e:
            errors.append(ValidationError(
                account_id=row.get("account_id"),
                row_index=-1,
                errors=[str(e)],
            ))

    return records, errors
