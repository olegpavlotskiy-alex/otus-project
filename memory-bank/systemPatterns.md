# System Patterns

## Architecture

```
Browser → nginx:80 → React SPA (static)
                  ↘ /api/* proxy
Backend FastAPI:8000 → PostgreSQL:5432
         ↓ APScheduler (hourly)
         recurring_service.process()
```

## Backend Patterns

### Layering
```
API routes (app/api/v1/)     ← HTTP, validation, auth, audit logging
CRUD layer (app/crud/)       ← DB operations only, always filter by user_id
Services (app/services/)     ← Business logic (CSV parse, recurring advance)
Models (app/models/)         ← SQLAlchemy ORM, native_enum=False
Schemas (app/schemas/)       ← Pydantic v2 request/response
```

### Security
- Каждый CRUD-запрос фильтруется по `user_id` — изоляция данных между пользователями
- JWT токены, 7 дней TTL
- `get_current_user` dependency во всех защищённых роутерах

### Audit Log
Явный вызов `audit_crud.create_log()` в каждом route handler (не middleware).
Хранит `old_values` и `new_values` как JSON в PostgreSQL (JSONB-совместимо).

### Recurring Transactions
APScheduler `BackgroundScheduler`, запуск каждый час.
`next_date` сдвигается через `dateutil.relativedelta` (monthly/yearly) или `timedelta` (daily/weekly).

## Frontend Patterns

### Data Fetching
React Query (TanStack) — все server-state через `useQuery` / `useMutation`.
Инвалидация кэша после мутаций: `queryClient.invalidateQueries`.

### Auth
JWT в `localStorage`. Axios interceptor добавляет `Authorization: Bearer <token>`.
401 response → автоматический logout + редирект на `/login`.

### API Base URL
`baseURL = ''` (пустая строка) — все запросы идут по относительному пути `/api/v1/...`.
В dev: Vite proxy `/api → http://localhost:8000`.
В prod (Docker): nginx proxy `/api/ → http://backend:8000`.

## Known Quirks

### Python 3.12 class-body annotation bug
`date: date | None = None` в теле класса → Python 3.12 сначала выполняет `date = None`,
потом вычисляет аннотацию — получает `None | None` → TypeError.
**Фикс**: `from datetime import date as _Date` + использовать `_Date` в аннотациях.

### passlib + bcrypt
`passlib==1.7.4` несовместима с `bcrypt>=4.1` (убрали `__about__`).
**Фикс**: закреплено `bcrypt==4.0.1` в requirements.txt.

### FastAPI trailing slash
`@router.get("/")` с prefix создаёт путь с trailing slash → 307 redirect.
**Фикс**: `@router.get("")` (пустая строка вместо "/").
