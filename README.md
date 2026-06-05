# Personal Finance Tracker

A full-stack personal finance management application built with FastAPI, React, and PostgreSQL.

## Features

- **Transactions** — track income and expenses with categories, multi-currency support, and filtering
- **Categories** — customizable categories with icons and colors
- **Budgets** — set monthly spending limits per category with progress tracking
- **Recurring Transactions** — auto-create subscriptions and salary entries on schedule
- **CSV Import/Export** — bulk import transactions from CSV files, export filtered data
- **Dashboard** — charts and analytics: expenses by category, 6-month trend, top categories
- **Audit Log** — full history of every create/update/delete operation
- **Authentication** — JWT-based auth, two demo accounts pre-loaded

## Quick Start

```bash
git clone <repository-url>
cd finance-tracker
docker compose up
```

Wait ~30 seconds for the database to initialise and seed data to load.

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |

## Demo Accounts

| Account | Email | Password |
|---------|-------|----------|
| Personal (John Smith) | john@example.com | password123 |
| Family Account | family@example.com | password123 |

Both accounts have seed data: 200+ transactions, categories, budgets, and recurring transactions pre-loaded.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI 0.111 + Python 3.12 |
| ORM | SQLAlchemy 2.0 + Alembic |
| Database | PostgreSQL 16 |
| Auth | JWT (python-jose) + bcrypt |
| Scheduler | APScheduler |
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Charts | Chart.js + react-chartjs-2 |
| Container | Docker + Docker Compose |
| CI | GitHub Actions |

## Project Structure

```
finance-tracker/
├── backend/          # FastAPI application
│   ├── app/
│   │   ├── api/v1/   # Route handlers
│   │   ├── core/     # Config, security, deps
│   │   ├── crud/     # Database operations
│   │   ├── models/   # SQLAlchemy models
│   │   ├── schemas/  # Pydantic schemas
│   │   └── services/ # Business logic (CSV, recurring)
│   ├── tests/        # pytest test suite
│   └── seed_data.py  # Demo data generator
├── frontend/         # React application
│   └── src/
│       ├── pages/    # Page components
│       ├── components/ # Shared components + charts
│       ├── services/ # API calls (axios)
│       └── context/  # Auth context
├── docker-compose.yml
├── .github/workflows/ci.yml
├── ARCHITECTURE.md
└── REPORT.md
```

## Development (without Docker)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

export DATABASE_URL=postgresql://finance:finance@localhost:5432/finance
export SECRET_KEY=dev-secret-key

uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend dev server runs at http://localhost:3000 and proxies `/api` to `http://localhost:8000`.

## Running Tests

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

Tests use an in-memory SQLite database — no PostgreSQL required.

## API Documentation

Swagger UI is available at http://localhost:8000/docs after starting the application. All endpoints require a Bearer token (except `/auth/register` and `/auth/login`).

### Key Endpoints

```
POST /api/v1/auth/register
POST /api/v1/auth/login

GET  /api/v1/transactions         # List with pagination + filters
POST /api/v1/transactions         # Create
POST /api/v1/transactions/import  # CSV import
GET  /api/v1/transactions/export  # CSV export

GET  /api/v1/dashboard/summary
GET  /api/v1/dashboard/expenses-by-category
GET  /api/v1/dashboard/monthly-trend

GET  /api/v1/audit-log
```
