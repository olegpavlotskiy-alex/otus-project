# Development Report — Personal Finance Tracker

## Project Overview

This is a full-stack personal finance tracker built entirely with AI assistance (Claude Sonnet 4.6 via Claude Code CLI). The project started from a functional specification and was implemented from scratch, architecture-first.

---

## Development History

### Phase 1 — Architecture Planning (Day 1)

Started with creating `ARCHITECTURE.md` before writing a single line of code, as required by the specification. This forced upfront decisions about:
- Technology stack selection (FastAPI over Django because of automatic OpenAPI docs, Pydantic v2 integration, and no ORM ceremony)
- Database schema design (UUID primary keys, audit log with JSONB diffs)
- API contract definition (all 30+ endpoints documented before implementation)
- Directory structure (clean separation: models / schemas / crud / api / services)

**Key decision**: Use SQLAlchemy 2.0 sync mode with `SessionLocal` dependency injection rather than async. This significantly simplifies the code (no `async def`, no `await`, no `AsyncSession`) while meeting all functional requirements. The scheduler and CSV service are inherently blocking operations anyway.

### Phase 2 — Backend Implementation (Day 1-2)

Implemented 50+ Python files in parallel using the AI agent. Key implementation decisions:

**Audit logging**: Instead of a middleware approach, audit log entries are created explicitly in each route handler. This is more verbose but much more transparent — you can see exactly what gets logged and control old/new values precisely.

**Budget spent calculation**: `spent_amount` is not stored in the database — it's computed on-the-fly when budgets are fetched. This avoids any sync issues between transactions and budgets, at the cost of a slightly heavier query.

**CSV import**: Two-phase approach — the frontend shows a column mapping form, then submits file + mapping together. The backend supports encoding fallback (UTF-8 → Latin-1) and multiple date formats.

**Recurring transactions**: APScheduler runs every hour. The `next_date` advancement uses `dateutil.relativedelta` for monthly/yearly (handles month-end edge cases) and `timedelta` for daily/weekly.

**Problem encountered**: The SQLAlchemy Enum type with `native_enum=True` (default) creates PostgreSQL ENUM types that conflict when running migrations multiple times. Fixed by using `native_enum=False` in all models, which stores enum values as VARCHAR — works identically in both SQLite (tests) and PostgreSQL (production).

### Phase 3 — Frontend Implementation (Day 2)

React 18 + Vite + Tailwind CSS stack. Key decisions:

**No Redux**: React Query (TanStack) handles all server state. Local component state handles UI state (modals open/close, form inputs). This keeps the code much simpler than a Redux setup would be.

**API proxy**: In development, Vite proxies `/api/*` to the backend. In production, nginx does the same. The frontend code uses baseURL `''` (empty string), so all API calls go to `/api/v1/...` relative to the current host — no environment variable switching needed.

**Problem encountered**: Backend login endpoint uses JSON body (`{email, password}`), but the frontend agent initially generated OAuth2 form-data format (`username/password` URL-encoded). Fixed immediately by updating `login()` in `api.js`.

**Charts**: Registered Chart.js components once globally in `App.jsx` to avoid the "chart type not registered" error when components render before the chart registry is initialized.

### Phase 4 — Infrastructure (Day 2)

Docker Compose configuration was straightforward. Key decisions:

**Health checks**: The `db` service has a health check, and `backend` depends on it with `condition: service_healthy`. This prevents the backend from starting before PostgreSQL is ready to accept connections — a common cause of startup failures.

**Frontend Dockerfile**: Multi-stage build. Stage 1 runs `npm run build` (Node.js), stage 2 copies the `dist/` folder into nginx. Final image is ~25MB vs ~1GB for a non-multi-stage Node image.

**Seed data**: The `seed()` function in `seed_data.py` is idempotent — it checks if users already exist before creating anything. Called at startup in the FastAPI `on_event("startup")` handler.

---

## Key Challenges

### 1. SQLite vs PostgreSQL Compatibility in Tests

**Problem**: Tests use SQLite (in-memory, fast, no DB server needed). Production uses PostgreSQL. SQLAlchemy Enum types work differently between them.

**Solution**: Set `native_enum=False` on all `Enum` columns. This makes enums work as VARCHAR constraints in both databases.

### 2. APScheduler Scheduler Lifecycle

**Problem**: APScheduler's `BackgroundScheduler` needs to be shut down gracefully, otherwise it leaves daemon threads running and produces warnings on shutdown.

**Solution**: Added `atexit.register(scheduler.shutdown)` after `scheduler.start()`. APScheduler registers its own `atexit` handler by default, but being explicit avoids confusion.

### 3. Seed Data Volume

**Problem**: Generating 200+ realistic transactions with varied amounts, realistic patterns (salary once a month, groceries multiple times per week, etc.) is tedious by hand.

**Solution**: Used Python's `random.Random(42)` (deterministic seed) to generate transactions programmatically. Each category gets proportional spending amounts based on realistic budgets. The seed is reproducible — the same data is generated on every fresh deployment.

### 4. Multi-Currency Storage

**Problem**: Storing multi-currency transactions while keeping budgets and dashboard comparisons meaningful.

**Solution**: Every transaction stores both the original amount/currency AND the converted amount in the user's preferred currency. All aggregations (dashboard, budget spent) operate on the `amount` field (preferred currency). The `exchange_rate` at transaction time is stored for historical accuracy.

---

## AI Process Notes

### Tools Used

- **Claude Code CLI** (claude-sonnet-4-6): Primary development tool — code generation, file creation, debugging
- All code was generated through structured prompts describing models, behaviors, and edge cases

### Example Prompt (Backend Models)

The backend was generated with a single comprehensive prompt covering all 6 SQLAlchemy models, their relationships, and constraints. The key technique: instead of asking Claude to "figure out the models", the prompt specified every field with its type, nullability, defaults, and relationships explicitly. This produced correct, production-ready code on the first attempt without any "guess what I want" iterations.

**What worked well**:
- Describing data models field-by-field (no ambiguity)
- Specifying edge cases explicitly (SQLite/PostgreSQL enum compatibility, idempotent seeding)
- Asking for complete files with no placeholders
- Parallel agent execution — backend and frontend were implemented simultaneously by two separate agents

**What didn't work**:
- The frontend agent independently chose OAuth2 form-data for login without knowing the backend had already chosen JSON body. Required a manual fix. Lesson: define the API contract explicitly in the frontend prompt, not just as "match the backend".

### Successful Steps

1. Architecture-first approach produced a clean design that required minimal rework
2. Parallel agent execution halved the wall-clock implementation time
3. SQLite for tests / PostgreSQL for production worked seamlessly due to `native_enum=False`

### Unsuccessful / Revised Steps

1. **Initial frontend login**: used wrong content type → fixed in 5 minutes
2. **First Docker Compose version**: lacked health checks → backend started before DB was ready → fixed by adding `condition: service_healthy`
3. **Audit log old_values**: initially serialized SQLAlchemy model instances directly → JSON serialization error → fixed to convert to dict before storing

---

## Known Issues (found during audit) — Fixed

### 1. Seed data: 10 categories instead of 12 ✅ Fixed

**Problem**: `seed_data.py` had only 10 categories for user1; spec requires 12.

**Fix**: Added `Education` (📚) and `Travel` (✈️) categories for both user1 and user2. Both users now have 12 categories each.

### 2. Seed data: family@example.com had no transactions ✅ Fixed

**Problem**: user2 (family@example.com) had 4 categories but zero transactions and no budgets, so the account appeared empty after login.

**Fix**: Added full transaction generation for user2 using a separate RNG seed (`Random(99)`): 200+ transactions over 6 months in EUR, 3 budgets, 2 recurring transactions.

### 3. Seed data: transaction count not architecturally guaranteed to be 200+ ✅ Fixed

**Problem**: `rng.randint(28, 35)` expenses/month gave a theoretical minimum of 174 (6 months × 29 with zero freelance).

**Fix**: Changed to `rng.randint(34, 38)`. Worst case is now 6 × (1 salary + 34 expenses) = 210 transactions — above 200 even without any freelance payments.

### 4. CI lint does not block the pipeline ✅ Fixed

**Problem**: `ruff check ... || true` made lint errors non-blocking.

**Fix**: Removed `|| true`. Also extracted ruff config into `backend/ruff.toml` (ignores E501 and F821 — the latter is a false positive for SQLAlchemy `Mapped[]` annotations). Fixed 5 real lint errors found in the process: 4 unused imports (F401) and 1 equality comparison to `True` (E712).

---

## Frontend Bugs (found during manual testing) — Fixed

### 5. Any user sees all transactions belonging to another user ✅ Fixed

**Root cause**: `QueryClient` was declared as a module-level constant in `App.jsx` — a singleton shared across the entire browser session. The `logout()` function in `AuthContext.jsx` only cleared `localStorage` but never called `queryClient.clear()`. When user1 logged out and user2 logged in, React Query returned user1's stale cached data immediately (key `['transactions', {}, 1]`) without making a new API request. The backend always filtered correctly by `user_id`; the problem was entirely on the frontend cache layer.

**Fix**: Extracted `QueryClient` into a dedicated `src/queryClient.js` module so it can be imported from both `App.jsx` and `AuthContext.jsx`. Added `queryClient.clear()` call inside `logout()`.

### 6. After applying category filter, 0 transactions shown ✅ Fixed

**Root cause**: Direct consequence of bug 5. When user2 logged in, the `['categories']` React Query cache still held user1's categories (with user1's UUIDs). The category dropdown showed user1's categories. User2 selected one, applied the filter — the backend correctly identified user2 from JWT but found zero transactions matching `user_id = user2 AND category_id = <user1's UUID>`, returning an empty result.

**Fix**: Resolved entirely by the same fix as bug 5 — `queryClient.clear()` on logout ensures categories are re-fetched for the new user.

### 7. Export CSV button does nothing (silently fails) ✅ Fixed

**Root cause**: Two independent defects in `handleExport` in `Transactions.jsx`:

1. The anchor element created with `document.createElement('a')` was never appended to `document.body` before `.click()`. Firefox and a number of Chromium-based environments ignore `.click()` on detached (not-in-DOM) elements; the download never starts and execution falls into `catch` → "Export failed" toast.

2. `URL.revokeObjectURL(url)` was called synchronously immediately after `a.click()`. Browsers initiate the download asynchronously, so the object URL was revoked before the browser had a chance to read the file, making the downloaded content empty or causing a network error.

Additionally, `response.data` returned by Axios with `responseType: 'blob'` is already a `Blob`. Wrapping it in `new Blob([response.data])` was redundant (and would drop the original MIME type from the new Blob's headers).

**Fix**: Append the anchor to `document.body` before clicking, remove it after, and defer `revokeObjectURL` with a short `setTimeout`. Use `response.data` directly as the argument to `URL.createObjectURL`.

---

## Final State

- ✅ All common requirements met (CRUD, search/filter, dashboard, pagination, responsive layout)
- ✅ All Finance Tracker-specific requirements met
- ✅ Seed data: 12 categories per user, 200+ transactions per user, 3 budgets per user, 2 users
- ✅ 17 tests (auth × 5, categories × 4, transactions × 5, budgets × 3)
- ✅ GitHub Actions CI (lint blocking via ruff.toml + tests + build validation)
- ✅ `docker compose up` starts everything
- ✅ Swagger UI at http://localhost:8000/docs
- ✅ ARCHITECTURE.md created before any code
- ✅ REPORT.md maintained throughout development
