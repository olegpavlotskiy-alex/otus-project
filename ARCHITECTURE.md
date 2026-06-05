# Architecture — Personal Finance Tracker

## Overview

A full-stack personal finance tracking application built with FastAPI (Python), React, and PostgreSQL. Users can manage transactions, categories, budgets, set up recurring payments, import/export CSV data, and view analytics dashboards. Each user's data is isolated via JWT authentication.

## Technology Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Backend API | FastAPI 0.111 | Auto OpenAPI/Swagger docs, async-ready, fast |
| ORM | SQLAlchemy 2.0 | Type-safe, migration support via Alembic |
| Database | PostgreSQL 16 | JSONB for audit log diff storage |
| Auth | python-jose + passlib | JWT access tokens, bcrypt passwords |
| Task scheduler | APScheduler | Recurring transaction processing |
| Frontend | React 18 + Vite | Fast build, modern DX |
| Styling | Tailwind CSS | Utility-first, responsive out of the box |
| Charts | Chart.js + react-chartjs-2 | Pie and line charts |
| HTTP client | Axios | Request interceptors for auth headers |
| State | React Query (TanStack) | Server-state caching |
| Routing | React Router v6 | SPA routing |
| Container | Docker + Docker Compose | Single-command deployment |
| CI | GitHub Actions | Lint + tests on every push |

## Directory Structure

```
finance-tracker/
├── ARCHITECTURE.md          # This file
├── README.md
├── REPORT.md
├── docker-compose.yml
├── .github/
│   └── workflows/
│       └── ci.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   ├── seed_data.py         # 200+ transactions, 12 categories, 2 users
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_transactions.py
│   │   ├── test_categories.py
│   │   └── test_budgets.py
│   └── app/
│       ├── main.py          # FastAPI app, CORS, routers, scheduler
│       ├── core/
│       │   ├── config.py    # Settings via pydantic-settings
│       │   ├── security.py  # JWT encode/decode, password hashing
│       │   └── deps.py      # get_db, get_current_user dependencies
│       ├── db/
│       │   ├── base.py      # DeclarativeBase import
│       │   └── session.py   # Engine + SessionLocal
│       ├── models/          # SQLAlchemy ORM models
│       │   ├── user.py
│       │   ├── category.py
│       │   ├── transaction.py
│       │   ├── budget.py
│       │   ├── recurring.py
│       │   └── audit_log.py
│       ├── schemas/         # Pydantic v2 request/response schemas
│       │   ├── user.py
│       │   ├── category.py
│       │   ├── transaction.py
│       │   ├── budget.py
│       │   ├── recurring.py
│       │   └── audit_log.py
│       ├── crud/            # DB operations (no business logic)
│       │   ├── user.py
│       │   ├── category.py
│       │   ├── transaction.py
│       │   ├── budget.py
│       │   ├── recurring.py
│       │   └── audit_log.py
│       ├── api/
│       │   └── v1/
│       │       ├── router.py
│       │       ├── auth.py
│       │       ├── categories.py
│       │       ├── transactions.py
│       │       ├── budgets.py
│       │       ├── dashboard.py
│       │       ├── recurring.py
│       │       └── audit_log.py
│       └── services/
│           ├── csv_service.py       # Import/export CSV with column mapping
│           └── recurring_service.py # Process due recurring transactions
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── context/
        │   └── AuthContext.jsx
        ├── services/
        │   └── api.js           # Axios instance + all API calls
        ├── pages/
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   ├── Dashboard.jsx
        │   ├── Transactions.jsx
        │   ├── Categories.jsx
        │   ├── Budgets.jsx
        │   ├── Recurring.jsx
        │   └── AuditLog.jsx
        └── components/
            ├── Layout.jsx
            ├── PrivateRoute.jsx
            ├── TransactionModal.jsx
            ├── CategoryModal.jsx
            ├── BudgetModal.jsx
            ├── RecurringModal.jsx
            ├── CsvImportModal.jsx
            └── charts/
                ├── ExpensesPieChart.jsx
                └── MonthlyTrendChart.jsx
```

## Data Models

### User
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| email | varchar unique | login |
| name | varchar | display name |
| password_hash | varchar | bcrypt |
| preferred_currency | varchar(3) | default USD |
| created_at | timestamp | |

### Category
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| user_id | FK User | owner |
| name | varchar | |
| icon | varchar | emoji or icon name |
| color | varchar | hex color |
| type | enum | income / expense |

### Transaction
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| user_id | FK User | |
| category_id | FK Category | |
| amount | numeric(15,2) | in preferred_currency |
| original_amount | numeric(15,2) | as entered |
| original_currency | varchar(3) | |
| exchange_rate | numeric(15,6) | rate at transaction time |
| date | date | |
| description | text | |
| type | enum | income / expense |
| recurring_id | FK Recurring nullable | source recurring rule |
| created_at, updated_at | timestamp | |

### Budget
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| user_id | FK User | |
| category_id | FK Category | |
| year | int | |
| month | int | 1-12 |
| limit_amount | numeric(15,2) | |
| currency | varchar(3) | |

### RecurringTransaction
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| user_id | FK User | |
| category_id | FK Category | |
| amount | numeric(15,2) | |
| currency | varchar(3) | |
| description | text | |
| type | enum | income / expense |
| frequency | enum | daily / weekly / monthly / yearly |
| next_date | date | next scheduled creation |
| is_active | bool | |

### AuditLog
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| user_id | FK User | |
| entity_type | varchar | transaction / budget / category |
| entity_id | UUID | |
| action | enum | create / update / delete |
| old_values | JSONB nullable | snapshot before change |
| new_values | JSONB nullable | snapshot after change |
| timestamp | timestamp | |

## API Routes Summary

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login

GET    /api/v1/categories
POST   /api/v1/categories
PUT    /api/v1/categories/{id}
DELETE /api/v1/categories/{id}

GET    /api/v1/transactions          (filter: date_from, date_to, category_id, type, amount_min, amount_max, page, size)
POST   /api/v1/transactions
PUT    /api/v1/transactions/{id}
DELETE /api/v1/transactions/{id}
POST   /api/v1/transactions/import   (multipart CSV)
GET    /api/v1/transactions/export   (query params → CSV response)

GET    /api/v1/budgets
POST   /api/v1/budgets
PUT    /api/v1/budgets/{id}
DELETE /api/v1/budgets/{id}

GET    /api/v1/recurring
POST   /api/v1/recurring
PUT    /api/v1/recurring/{id}
DELETE /api/v1/recurring/{id}
POST   /api/v1/recurring/process     (manual trigger, also runs on scheduler)

GET    /api/v1/dashboard/summary
GET    /api/v1/dashboard/expenses-by-category
GET    /api/v1/dashboard/monthly-trend
GET    /api/v1/dashboard/top-categories

GET    /api/v1/audit-log             (filter: entity_type, action, page, size)
```

## Authentication Flow

1. User registers → bcrypt hash stored, JWT access token returned
2. Frontend stores token in localStorage
3. Axios interceptor adds `Authorization: Bearer <token>` to every request
4. FastAPI `get_current_user` dependency decodes JWT, loads user from DB

## Recurring Transactions

APScheduler runs `process_recurring_transactions()` every hour. The function:
1. Queries `RecurringTransaction` where `is_active=true AND next_date <= today`
2. Creates a `Transaction` from each rule
3. Advances `next_date` (monthly → next month, etc.)
4. Logs audit entry

## CSV Import Flow

1. User uploads CSV file
2. Backend reads first 3 rows, returns detected column names
3. User maps columns to fields (date, amount, description, type, category name)
4. Backend creates transactions, auto-creating categories if needed
5. Returns count of imported records

## Development Plan

1. ✅ ARCHITECTURE.md
2. Backend: models + migrations
3. Backend: auth endpoints
4. Backend: CRUD endpoints (categories, transactions, budgets)
5. Backend: dashboard aggregation
6. Backend: recurring service + APScheduler
7. Backend: CSV import/export
8. Backend: audit log middleware
9. Backend: seed data
10. Backend: tests (≥10)
11. Frontend: auth pages (login/register)
12. Frontend: layout + routing
13. Frontend: dashboard page (charts)
14. Frontend: transactions page (table, filters, modals)
15. Frontend: categories & budgets pages
16. Frontend: CSV import/export UI
17. Frontend: audit log page
18. Frontend: recurring transactions page
19. Docker Compose
20. GitHub Actions CI
21. README.md + REPORT.md
