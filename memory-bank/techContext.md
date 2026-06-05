# Tech Context

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | FastAPI | 0.111.0 |
| Python | CPython | 3.12 |
| ORM | SQLAlchemy | 2.0.31 |
| Migrations | Alembic | 1.13.2 |
| DB | PostgreSQL | 16-alpine |
| Auth | python-jose + passlib + bcrypt | 3.3.0 / 1.7.4 / **4.0.1** |
| Scheduler | APScheduler | 3.10.4 |
| Frontend | React + Vite | 18.3.1 / 5.3.1 |
| Styling | Tailwind CSS | 3.4.4 |
| Charts | Chart.js + react-chartjs-2 | 4.4.3 / 5.2.0 |
| HTTP client | Axios | 1.7.2 |
| Server state | TanStack React Query | 5.45.1 |
| Router | React Router | 6.23.1 |
| Notifications | react-hot-toast | 2.4.1 |
| Icons | lucide-react | 0.400.0 |
| Date utils | date-fns | 3.6.0 |
| Container | Docker + Docker Compose | latest |
| Web server | nginx | 1.27-alpine |
| CI | GitHub Actions | — |

## Directory Layout

```
finance-tracker/
├── backend/
│   ├── app/
│   │   ├── api/v1/        # route handlers
│   │   ├── core/          # config, security, deps
│   │   ├── crud/          # DB operations
│   │   ├── db/            # engine, session, base
│   │   ├── models/        # SQLAlchemy ORM
│   │   ├── schemas/       # Pydantic v2
│   │   └── services/      # csv_service, recurring_service
│   ├── tests/             # pytest, SQLite
│   ├── seed_data.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/    # Layout, modals, charts
│   │   ├── context/       # AuthContext
│   │   ├── pages/         # 8 pages
│   │   └── services/      # api.js (axios)
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
├── .github/workflows/ci.yml
├── memory-bank/           # ← этот каталог
├── ARCHITECTURE.md
├── README.md
└── REPORT.md
```

## Environment Variables (backend)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://finance:finance@db:5432/finance` | PostgreSQL DSN |
| `SECRET_KEY` | (hardcoded fallback) | JWT signing key |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` (7 days) | Token TTL |

## Running Locally (без Docker)

```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
DATABASE_URL=postgresql://... uvicorn app.main:app --reload

# Tests (SQLite, no Postgres needed)
DATABASE_URL=sqlite:///./test.db pytest tests/ -v

# Frontend
cd frontend
npm install && npm run dev   # http://localhost:3000
```
