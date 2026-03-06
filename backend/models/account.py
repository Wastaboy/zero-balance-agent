from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import date


class AccountRecord(BaseModel):
    account_id: str
    rim_number: str
    current_balance: float
    zero_balance_since: date
    last_transaction_date: date
    account_open_date: date
    account_open_reason: Optional[str] = None
    other_active_products: Optional[list[str]] = None
    # Enriched during ingestion — not in raw input
    has_other_products: Optional[bool] = None

    @field_validator("current_balance")
    @classmethod
    def must_be_zero(cls, v: float) -> float:
        if v != 0.0:
            raise ValueError("current_balance must be 0.00 for zero-balance evaluation")
        return v


class ValidationError(BaseModel):
    account_id: Optional[str]
    row_index: int
    errors: list[str]
