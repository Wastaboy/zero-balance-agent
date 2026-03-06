# Zero Balance Account — AI Decision Advisor Agent

## What This Is

Build a full-stack application that helps a bank evaluate ~250,000 zero-balance accounts and recommend whether each should be **KEPT open**, **CLOSED**, or sent for **HUMAN REVIEW**. This is an advisory tool — it does not auto-close anything. Every recommendation must be explainable and auditable.

### Key Concept: RIM Number
The bank identifies each individual customer by a **RIM number** (Relationship Information Manager). A single RIM can have multiple accounts underneath it. The RIM is the primary key for understanding the full customer relationship — when evaluating whether to close one zero-balance account, the system must look at all other accounts and products under the same RIM to assess the overall relationship.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend / API | Python 3.11+ with FastAPI |
| Scoring Engine | Rules-based (no ML) — must be fully explainable for banking compliance |
| Configuration | YAML file for all thresholds and weights (no hardcoded values) |
| Database | SQLite for prototyping (swap to PostgreSQL later) |
| Frontend Dashboard | React (Vite) with Tailwind CSS and Recharts for charts |
| Testing | pytest for backend, sample CSV fixtures |

---

## Project Structure

```
zero-balance-agent/
├── backend/
│   ├── main.py                    # FastAPI app entry point
│   ├── config/
│   │   └── criteria.yaml          # All thresholds, weights, protected reasons
│   ├── models/
│   │   ├── account.py             # Pydantic models for account data
│   │   └── recommendation.py      # Pydantic models for output
│   ├── services/
│   │   ├── ingestion.py           # CSV/Excel parsing + validation
│   │   ├── scoring.py             # Core scoring engine
│   │   ├── recommendation.py      # Maps scores → KEEP/CLOSE/REVIEW
│   │   └── audit.py               # Audit log persistence
│   ├── routers/
│   │   ├── evaluate.py            # POST /evaluate endpoint
│   │   ├── reports.py             # GET /report endpoints
│   │   ├── config.py              # GET/PUT /config endpoints
│   │   └── override.py            # POST /override endpoint
│   ├── database.py                # SQLite setup + models
│   └── tests/
│       ├── test_scoring.py
│       ├── test_ingestion.py
│       └── fixtures/
│           └── sample_accounts.csv
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Dashboard.jsx       # Main dashboard with summary stats
│   │   │   ├── AccountTable.jsx    # Filterable/sortable results table
│   │   │   ├── AccountDetail.jsx   # Drill-down view per account
│   │   │   ├── UploadForm.jsx      # CSV upload interface
│   │   │   ├── ConfigEditor.jsx    # View/edit criteria thresholds
│   │   │   └── Charts.jsx          # Pie/bar charts for recommendations
│   │   └── api.js                  # API client
│   └── package.json
├── README.md
└── docker-compose.yaml             # Optional: for easy deployment
```

---

## Configuration File — `criteria.yaml`

This is the single source of truth for all decision logic. The bank must be able to change any threshold without touching code.

```yaml
criteria:
  zero_balance_days:
    description: "Number of days the account balance has been zero"
    weight: 0.30
    thresholds:
      low_risk: 90       # < 90 days  → strong keep signal
      medium_risk: 365    # 90–365 days → neutral / review zone
      high_risk: 365      # > 365 days → close signal

  last_activity_days:
    description: "Days since the last debit or credit transaction"
    weight: 0.25
    thresholds:
      active: 90          # < 90 days → active, keep
      dormant: 180         # > 180 days → dormant, close signal

  has_other_products:
    description: "Whether the customer (identified by RIM number) holds other active accounts or products under the same RIM"
    weight: 0.25
    keep_if_true: true     # If RIM has other active products, strong override toward KEEP

  account_age_days:
    description: "Total age of the account since opening"
    weight: 0.10
    new_account_threshold: 90  # Accounts < 90 days old are suppressed from CLOSE

  account_open_reason:
    description: "The reason the account was originally opened"
    weight: 0.10
    protected_reasons:       # These reasons override toward KEEP
      - "salary_account"
      - "regulatory"
      - "product_bundle"
      - "government_benefit"

decision_thresholds:
  keep_below: 0.40          # Score < 0.4 → KEEP
  close_above: 0.70         # Score > 0.7 → CLOSE
  # Scores between 0.4 and 0.7 → REVIEW (human decision needed)

hard_overrides:
  # These bypass scoring entirely
  - condition: "account_age_days < new_account_threshold"
    action: "KEEP"
    reason: "Account is too new to evaluate"
  - condition: "has_other_products == true AND zero_balance_days < 365"
    action: "KEEP"
    reason: "Active cross-product relationship under same RIM"
```

---

## Scoring Engine — Detailed Logic

For each account, compute a **close_score** between 0.0 and 1.0. Higher = stronger signal to close.

### Step 1: Check Hard Overrides
Before scoring, check the `hard_overrides` list. If any condition matches, skip scoring and return the override action + reason immediately.

### Step 2: Score Each Criterion (0.0 to 1.0)

**zero_balance_days:**
- < low_risk (90): score = 0.0
- between low_risk and high_risk (90–365): score = linear interpolation from 0.0 to 1.0
- > high_risk (365): score = 1.0

**last_activity_days:**
- < active (90): score = 0.0
- between active and dormant (90–180): score = linear interpolation from 0.0 to 1.0
- > dormant (180): score = 1.0

**has_other_products (RIM-level check):**
- true (other active accounts/products exist under the same RIM): score = 0.0 (keep signal)
- false (this is the only account under the RIM, or all sibling accounts are also zero-balance): score = 1.0 (no relationship anchor)

**account_age_days:**
- < new_account_threshold (90): score = 0.0 (too new)
- 90–365: score = linear interpolation from 0.0 to 0.5
- > 365: score = 0.5 (neutral — age alone shouldn't close)

**account_open_reason:**
- in protected_reasons list: score = 0.0
- not in list: score = 0.7 (mild close signal, not maximum)

### Step 3: Weighted Sum
```
close_score = sum(criterion_score * criterion_weight for each criterion)
```

### Step 4: Map to Recommendation
- close_score < keep_below (0.4) → **KEEP**
- close_score > close_above (0.7) → **CLOSE**
- otherwise → **REVIEW**

### Step 5: Generate Reasoning
For each account, produce a human-readable explanation listing:
- Which criteria contributed most to the score
- Any hard overrides that applied
- The final score and threshold it fell into

Example: *"Recommended CLOSE (score: 0.82). Account has been zero-balance for 540 days, last transaction was 400 days ago, no other active products under RIM 1234567, opened as a standard checking account."*

---

## Data Model

### Input: Account Record

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| account_id | string | yes | Unique account identifier |
| rim_number | string | yes | RIM number — the bank's unique customer identifier. Multiple accounts can share the same RIM. |
| current_balance | float | yes | Must be 0.00 for processing |
| zero_balance_since | date | yes | Date balance became zero |
| last_transaction_date | date | yes | Date of most recent debit/credit |
| account_open_date | date | yes | Account opening date |
| account_open_reason | string | no | Reason code for opening |
| other_active_products | list[string] | no | List of other active product/account codes held under the same RIM |

**RIM-level enrichment:** During ingestion, the system should group all input records by `rim_number` and automatically determine `has_other_products` for each account by checking whether the same RIM has other accounts with non-zero balances or active product codes. This means the input file does not strictly need an `other_active_products` column — if multiple accounts under the same RIM are present in the data, the system can infer cross-product relationships.

### Output: Recommendation Record

| Field | Type | Description |
|-------|------|-------------|
| account_id | string | From input |
| rim_number | string | From input — the customer's RIM |
| recommendation | enum | KEEP / CLOSE / REVIEW |
| close_score | float | 0.0 – 1.0 |
| confidence | string | HIGH / MEDIUM / LOW (based on distance from thresholds) |
| reasoning | string | Human-readable explanation |
| criteria_breakdown | dict | Score per criterion before weighting |
| hard_override_applied | string or null | Which override fired, if any |
| evaluated_at | datetime | Timestamp of evaluation |
| config_version | string | Hash of criteria.yaml at time of evaluation |

### Audit Log Entry

| Field | Type | Description |
|-------|------|-------------|
| id | int | Auto-increment |
| batch_id | string | Groups accounts evaluated together |
| account_id | string | Which account |
| recommendation | enum | What was recommended |
| close_score | float | The score |
| reasoning | string | Full reasoning text |
| config_snapshot | json | Full criteria.yaml contents at time of eval |
| overridden_by | string or null | Username if human overrode |
| override_reason | string or null | Why human overrode |
| created_at | datetime | When this log was created |

---

## API Endpoints

### `POST /evaluate`
- Accepts: multipart CSV/Excel file upload, OR JSON array of account records
- Returns: JSON array of recommendation records + batch_id
- Persists: all results to audit log

### `GET /report/{batch_id}`
- Returns: full results for a batch
- Query params: `?recommendation=CLOSE&sort=close_score&limit=50`

### `GET /report/{batch_id}/summary`
- Returns: aggregate stats — total processed, count by recommendation, average scores, top reasons

### `GET /config`
- Returns: current criteria.yaml contents as JSON

### `PUT /config`
- Accepts: updated criteria JSON
- Validates: all weights sum to 1.0, thresholds are sensible
- Persists: config change to audit log

### `POST /override`
- Accepts: `{ account_id, rim_number, batch_id, new_recommendation, reviewer_name, reason }`
- Persists: override to audit log
- Returns: updated recommendation record

### `GET /export/{batch_id}`
- Returns: downloadable CSV/Excel of all recommendations in the batch

### `GET /rim/{rim_number}`
- Returns: all accounts under the given RIM number, with their latest recommendations
- Purpose: lets reviewers see the full customer relationship at a glance before making override decisions

---

## Frontend Dashboard

### Upload Page
- Drag-and-drop CSV/Excel upload
- Shows validation errors (missing fields, non-zero balances, bad dates)
- Progress bar for large files
- "Run Evaluation" button

### Results Dashboard (after evaluation)
- **Summary cards** at top: Total Accounts, Total Unique RIMs, KEEP count, CLOSE count, REVIEW count
- **Pie chart**: recommendation distribution
- **Bar chart**: close_score distribution (histogram)
- **Filterable table**: all accounts with columns for account_id, rim_number, recommendation, close_score, reasoning (truncated), evaluated_at
- Filters: by recommendation type, score range, zero-balance duration, rim_number (to see all accounts under one customer)
- Sort: by any column
- Export button: download as CSV

### Account Detail View (click any row)
- Full recommendation details
- **RIM relationship panel**: shows all other accounts under the same RIM number, their statuses, and balances — so the reviewer can see the full customer picture
- Criteria breakdown with visual bars showing each criterion's contribution
- Hard override indicator if applicable
- Override button: lets reviewer change recommendation with required reason field

### Config Page
- Display current thresholds in editable form
- "Save" validates and persists
- Shows config change history

---

## Sample Test Data

Generate a fixture file `sample_accounts.csv` with at least 20 rows covering these scenarios. Use realistic RIM numbers (e.g., RIM0001, RIM0002, etc.) and make sure some RIMs have multiple accounts to test cross-product logic:

1. **Clear KEEP**: zero-balance 30 days, last transaction 15 days ago, RIM has other active accounts, salary account
2. **Clear CLOSE**: zero-balance 600 days, last transaction 500 days ago, RIM has no other accounts, standard account
3. **Borderline REVIEW**: zero-balance 200 days, last transaction 150 days ago, sole account under RIM
4. **New account override**: zero-balance 10 days, opened 10 days ago (should KEEP regardless)
5. **Cross-product override via RIM**: zero-balance 300 days, but same RIM also has an active loan account and credit card (include these as separate rows in the CSV sharing the same rim_number)
6. **Protected reason**: zero-balance 400 days but regulatory account
7. **Missing data**: some fields blank (should flag for validation, not crash)
8. **Multi-account RIM**: 3 accounts under the same RIM — one active, one zero-balance 100 days, one zero-balance 500 days — to test that the system correctly identifies sibling accounts

---

## Build Order

Build in this exact sequence. Each step should be fully working and testable before moving to the next.

1. **`criteria.yaml`** — create the config file first
2. **`models/`** — Pydantic models for input and output
3. **`services/scoring.py`** — the scoring engine, with unit tests
4. **`services/ingestion.py`** — CSV parser with validation and RIM-level grouping (auto-detect sibling accounts under the same RIM), with unit tests
5. **`services/recommendation.py`** — maps scores to recommendations
6. **`services/audit.py`** + **`database.py`** — persistence layer
7. **`routers/evaluate.py`** — the main evaluation endpoint
8. **`routers/reports.py`** + **`routers/config.py`** + **`routers/override.py`**
9. **`main.py`** — wire everything together, add CORS
10. **`frontend/`** — build the React dashboard
11. **`tests/`** — integration tests with sample data
12. **`README.md`** — setup instructions, API docs

---

## Important Constraints

- **No ML / No AI models in the scoring** — this must be a transparent rules engine. Every recommendation must trace back to specific criteria and thresholds. This is a banking compliance requirement.
- **All thresholds in YAML** — never hardcode a number in the scoring logic. Always read from config.
- **Audit everything** — every evaluation, every override, every config change gets logged with timestamps.
- **Graceful handling of bad data** — missing fields should flag the account for manual review, not crash the system. Return validation errors clearly.
- **CORS enabled** — frontend runs on a different port during development.
- **Config versioning** — every evaluation result must record which version of criteria.yaml was active, so results are reproducible.
