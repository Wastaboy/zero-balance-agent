# Zero Balance Account — AI Decision Advisor

A full-stack banking application that evaluates zero-balance accounts and recommends **KEEP**, **CLOSE**, or **REVIEW** for each — using a fully transparent, rules-based scoring engine (no ML).

## Quick Start (Docker)

```bash
docker-compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Manual Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Run Tests

```bash
cd backend
pytest tests/ -v
```

## How It Works

1. Upload a CSV or Excel file with zero-balance account data
2. The scoring engine evaluates each account against 5 weighted criteria
3. Hard overrides are checked first (new accounts, cross-product RIM relationships)
4. Each account gets a `close_score` from 0.0 to 1.0
5. Scores map to KEEP (< 0.4), CLOSE (> 0.7), or REVIEW (between)

## Configuring Thresholds

All thresholds and weights live in `backend/config/criteria.yaml`. Change them via the Config page in the UI — every change is logged. No code changes needed.

## CSV Format

Required columns: `account_id`, `rim_number`, `current_balance` (must be 0.00), `zero_balance_since`, `last_transaction_date`, `account_open_date`

Optional: `account_open_reason`, `other_active_products`

See `backend/tests/fixtures/sample_accounts.csv` for an example.

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/evaluate` | POST | Upload CSV/Excel for evaluation |
| `/evaluate/json` | POST | Submit JSON array of accounts |
| `/report/{batch_id}` | GET | Get full results for a batch |
| `/report/{batch_id}/summary` | GET | Aggregate stats for a batch |
| `/export/{batch_id}` | GET | Download results as CSV |
| `/rim/{rim_number}` | GET | All accounts under one RIM |
| `/config` | GET | Get current config |
| `/config` | PUT | Update config (validates weights) |
| `/override` | POST | Save a human override |
