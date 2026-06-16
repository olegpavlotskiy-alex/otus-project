# Лог сессии: реализация Personal Finance Tracker
**Дата**: 2026-06-05 — 2026-06-06  
**Модель**: Claude Sonnet 4.6 (claude-sonnet-4-6)  
**Инструмент**: Claude Code CLI

---

## 1. Постановка задачи

**Пользователь**: Прочитай файл project_fullstack_app.md и реализуй сервис по этой спецификации

**Спецификация** (`/home/oleg.pavlotskiy/AI/Claude/pet/project_fullstack_app.md`):
- Full-stack приложение (backend + frontend + БД)
- Вариант: **Трекер личных финансов**
- Python + PostgreSQL + Docker + GitHub Actions
- Транзакции, категории, бюджеты, повторяющиеся транзакции
- CSV импорт/экспорт, мультивалютность, JWT авторизация
- Лог изменений (audit log)
- Seed данные: 200+ транзакций, 12 категорий, 2 пользователя
- `docker compose up` — одна команда запуска

---

## 2. Планирование

Claude создал `ARCHITECTURE.md` **до начала кодирования** (требование спецификации).

Архитектурные решения:
- **Backend**: FastAPI 0.111 (автоматический OpenAPI/Swagger) + SQLAlchemy 2.0 (sync) + Alembic
- **Frontend**: React 18 + Vite + Tailwind CSS + Chart.js
- **Auth**: python-jose (JWT) + passlib (bcrypt)
- **Scheduler**: APScheduler для повторяющихся транзакций
- **UUID PK** для всех моделей, `native_enum=False` для совместимости SQLite/PostgreSQL
- **Audit log**: явный вызов в каждом route handler (не middleware)

---

## 3. Реализация backend (Agent)

Запущен Agent для создания 51 Python-файла:

```
backend/app/
├── core/       config.py, security.py, deps.py
├── db/         session.py, base.py
├── models/     user, category, transaction, budget, recurring, audit_log
├── schemas/    (Pydantic v2) user, category, transaction, budget, recurring, audit_log
├── crud/       user, category, transaction, budget, recurring, audit_log
├── api/v1/     auth, categories, transactions, budgets, recurring, dashboard, audit_log
└── services/   csv_service.py, recurring_service.py
```

---

## 4. Реализация frontend (Agent)

Запущен параллельный Agent для создания 27 React-файлов:

```
frontend/src/
├── pages/      Login, Register, Dashboard, Transactions, Categories,
│               Budgets, Recurring, AuditLog
├── components/ Layout, PrivateRoute, TransactionModal, CategoryModal,
│               BudgetModal, RecurringModal, CsvImportModal,
│               charts/ExpensesPieChart, charts/MonthlyTrendChart
├── context/    AuthContext.jsx
└── services/   api.js (axios + interceptors)
```

---

## 5. Инфраструктура (Claude напрямую)

Созданы файлы:
- `docker-compose.yml` — db + backend + frontend с health checks
- `frontend/Dockerfile` — multi-stage (node:20 build → nginx:1.27 serve)
- `frontend/nginx.conf` — proxy `/api/` → `http://backend:8000`, SPA routing
- `.github/workflows/ci.yml` — ruff lint + pytest + npm build
- `README.md`, `REPORT.md`
- `.dockerignore` для backend и frontend

---

## 6. Баги и исправления

### Баг 1: Python 3.12 class-body annotation bug

**Симптом**:
```
TypeError: unsupported operand type(s) for |: 'NoneType' and 'NoneType'
Unable to evaluate type annotation 'date | None'
```

**Причина**: В Python 3.12 bytecode для `date: date | None = None` в теле класса:
```
LOAD_CONST  (None)
STORE_NAME  (date)     ← Python СНАЧАЛА присваивает date = None
LOAD_NAME   (date)     ← потом читает date → получает None!
LOAD_CONST  (None)
BINARY_OP   |          → None | None → TypeError
```

**Диагностика через дизассемблер**:
```python
import dis
code = '''
class TestPure:
    date: date | None = None
'''
compiled = compile(code, '<string>', 'exec')
# bytecode показал порядок: STORE_NAME перед LOAD_NAME
```

**Исправление** (`app/schemas/transaction.py`):
```python
# Было:
from datetime import date, datetime
class TransactionUpdate(BaseModel):
    date: date | None = None  # ЛОМАЕТСЯ

# Стало:
import datetime as _dt
_Date = _dt.date
class TransactionUpdate(BaseModel):
    date: Optional[_Date] = None  # РАБОТАЕТ
```

### Баг 2: passlib несовместима с bcrypt >= 4.1

**Симптом**:
```
AttributeError: module 'bcrypt' has no attribute '__about__'
```

**Исправление** (`requirements.txt`):
```
passlib[bcrypt]==1.7.4
bcrypt==4.0.1   # ← добавлена явная версия
```

### Баг 3: FastAPI trailing slash редиректы

**Симптом**: `GET /api/v1/categories` → 307 Redirect → `/api/v1/categories/`  
curl возвращал пустой ответ (не следовал редиректу).

**Причина**: `@router.get("/")` с prefix создаёт путь с trailing slash.

**Исправление**:
```python
# Было:
@router.get("/", response_model=list[CategoryOut])
# Стало:
@router.get("", response_model=list[CategoryOut])
```
Применено во всех роутерах: categories, transactions, budgets, recurring, audit_log.

### Баг 4: Frontend login — несоответствие формата

**Симптом**: Frontend отправлял OAuth2 form-data (`username/password`), backend ожидал JSON (`email/password`).

**Исправление** (`frontend/src/services/api.js`):
```js
// Было:
const form = new URLSearchParams()
form.append('username', email)
form.append('password', password)
await api.post('/api/v1/auth/login', form, {
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
})

// Стало:
await api.post('/api/v1/auth/login', { email, password })
```

---

## 7. Результаты тестирования

```
$ DATABASE_URL=sqlite:///./test.db pytest tests/ -v
========================= 17 passed in 8.30s ==========================

tests/test_auth.py::test_register_success PASSED
tests/test_auth.py::test_register_duplicate_email PASSED
tests/test_auth.py::test_login_success PASSED
tests/test_auth.py::test_login_wrong_password PASSED
tests/test_auth.py::test_login_nonexistent_user PASSED
tests/test_budgets.py::test_create_budget PASSED
tests/test_budgets.py::test_get_budgets_with_spent PASSED
tests/test_budgets.py::test_delete_budget PASSED
tests/test_categories.py::test_create_category PASSED
tests/test_categories.py::test_get_categories PASSED
tests/test_categories.py::test_update_category PASSED
tests/test_categories.py::test_delete_category PASSED
tests/test_transactions.py::test_create_transaction PASSED
tests/test_transactions.py::test_get_transactions_paginated PASSED
tests/test_transactions.py::test_filter_transactions_by_date PASSED
tests/test_transactions.py::test_update_transaction PASSED
tests/test_transactions.py::test_delete_transaction PASSED
```

---

## 8. Docker Compose проверка

```
$ docker compose up -d
✓ db        healthy
✓ backend   healthy  (порт 8000)
✓ frontend  up       (порт 3000)

$ curl http://localhost:8000/health
{"status":"ok","version":"1.0.0"}

# Seed данные (john@example.com):
Transactions: 197
Categories:   10
Budgets:      3
Recurring:    3
Dashboard balance: -3418.62 USD
```

---

## 9. Git история

```
fa95e19 docs: add memory bank
0eda4c3 ci: add Docker Compose, GitHub Actions CI, README
1a0da06 feat: add React 18 frontend (Vite + Tailwind + Chart.js)
2d7d6d5 test: add 17 unit/integration tests
8205ede feat: add deterministic seed data
fdc96c7 feat: add REST API routes, CSV service and recurring scheduler
b0ac684 feat: add Pydantic schemas and CRUD layer
6161ef1 feat: add SQLAlchemy models and core config
9cb5911 chore: add backend project scaffold
5dc41b1 docs: add ARCHITECTURE.md and REPORT.md   ← первый коммит
```

---

## 10. Push на GitHub

**Проблема 1**: `gh` CLI не установлен → использован Personal Access Token (HTTPS).

**Проблема 2**: Первый токен не имел скоупа `workflow` → отказ пушить `.github/workflows/ci.yml`.  
Решение: новый токен с `repo` + `workflow` скоупами.

**Проблема 3**: SSH ключ (`~/.ssh/id_ed25519.pub`) уже привязан к другому GitHub-аккаунту → GitHub отклонил добавление.

**Итог**: Push выполнен через HTTPS с Personal Access Token.  
Репозиторий: https://github.com/olegpavlotskiy-alex/otus-project

---

## 11. Memory Bank

Создан `memory-bank/` с 6 файлами:
- `projectbrief.md` — требования и критерии приёмки
- `productContext.md` — user flows, demo accounts, порты
- `systemPatterns.md` — архитектурные паттерны, known quirks
- `techContext.md` — стек, структура директорий, env variables
- `activeContext.md` — текущее состояние, потенциальные улучшения
- `progress.md` — чеклист выполненных требований, метрики

---

## Итоговые метрики (Сессия 1)

| Показатель | Значение |
|-----------|---------|
| Python файлов | 51 |
| React файлов | 27 |
| API endpoints | 30+ |
| Тестов | 17 (17 passed) |
| Seed транзакций | 197 |
| Git коммитов | 10 |
| Время реализации | ~1 сессия |

---

---

# Сессия 2 — Аудит требований и исправление багов
**Дата**: 2026-06-14  
**Модель**: Claude Sonnet 4.6 (claude-sonnet-4-6)  
**Инструмент**: Claude Code CLI

---

## 12. Аудит соответствия требованиям

**Пользователь**: Прочитай файл project_fullstack_app.md и проверь соответствие всем требованиям реализации в finance-tracker, найди ошибки и составь их список.

Claude выполнил систематическую проверку всех пунктов спецификации и выявил четыре проблемы:

### Проблема 1: 10 категорий вместо 12

`seed_data.py` создавал по 10 категорий на пользователя вместо требуемых 12.

**Исправление**: добавлены категории `Education` (📚) и `Travel` (✈️) для обоих пользователей.

### Проблема 2: У family@example.com не было транзакций

user2 (`family@example.com`) имел категории, но ноль транзакций и бюджетов — аккаунт выглядел пустым при входе.

**Исправление**: добавлена полная генерация транзакций для user2 с отдельным seed (`Random(99)`): 200+ транзакций за 6 месяцев в EUR, 3 бюджета, 2 повторяющиеся транзакции.

### Проблема 3: Количество транзакций не гарантировало 200+

`rng.randint(28, 35)` расходов в месяц давало теоретический минимум 174 (6 месяцев × 29 при нулевых фрилансах).

**Исправление**: изменено на `rng.randint(34, 38)`. Минимум теперь 210 транзакций.

### Проблема 4: CI lint не блокировал pipeline

`ruff check ... || true` делал ошибки линтера некритичными.

**Исправление**: убран `|| true`; конфигурация ruff вынесена в `backend/ruff.toml` (игнорирует E501, F821); исправлены 5 реальных ошибок линтера: 4 неиспользуемых импорта (F401) и одно сравнение с `True` (E712).

```
Git: fa22250 docs: add known issues found during requirements audit
     a87d0f1 fix: resolve all audit issues — seed data, CI lint, unused imports
```

---

## 13. Исправление багов фронтенда (ручное тестирование)

При ручной проверке приложения в браузере обнаружены три бага:

### Баг 1: Пользователь видит транзакции другого аккаунта

**Симптом**: при выходе из john@example.com и входе в family@example.com сразу показывались транзакции первого пользователя.

**Причина**: `QueryClient` был объявлен как модульная константа в `App.jsx` — синглтон на весь сеанс браузера. `logout()` в `AuthContext.jsx` чистил `localStorage`, но не вызывал `queryClient.clear()`. React Query немедленно возвращал кэшированные данные user1 без нового API-запроса. Бэкенд всегда корректно фильтровал по `user_id` — проблема была исключительно во фронтенд-кэше.

**Исправление**: `QueryClient` вынесен в отдельный модуль `src/queryClient.js` и импортируется как из `App.jsx`, так и из `AuthContext.jsx`. В `logout()` добавлен вызов `queryClient.clear()`.

### Баг 2: После фильтра по категории показывалось 0 транзакций

**Причина**: прямое следствие бага 1. Кэш React Query по ключу `['categories']` содержал категории user1 с их UUID. User2 выбирал категорию user1, бэкенд не находил транзакций с `user_id = user2 AND category_id = <UUID user1>`.

**Исправление**: устранён тем же `queryClient.clear()` при выходе.

### Баг 3: Кнопка экспорта CSV не работала (молча падала)

**Причина**: два независимых дефекта в `handleExport` в `Transactions.jsx`:
1. Созданный через `document.createElement('a')` элемент никогда не добавлялся в `document.body` перед `.click()` — Firefox и ряд Chromium-окружений игнорируют клик у элементов вне DOM.
2. `URL.revokeObjectURL(url)` вызывался синхронно сразу после `a.click()` — браузер отзывал URL до начала скачивания.
3. `response.data` оборачивался в `new Blob([response.data])`, что теряло MIME-тип оригинального Blob.

**Исправление**: якорный элемент добавляется в `document.body` перед кликом и удаляется после; `revokeObjectURL` отложен через `setTimeout` на 150 мс; `response.data` используется напрямую.

### Баг 4: ReDoc отдавал пустую страницу

**Симптом**: `http://localhost:8000/redoc` открывался как пустая страница.

**Причина**: FastAPI по умолчанию подключает ReDoc через CDN-тег `redoc@next` с jsdelivr.net, который вернул 404 — тег `@next` был удалён из npm.

**Исправление** (`backend/app/main.py`): `redoc_url=None` в конфигурации FastAPI; добавлен ручной эндпоинт `/redoc` через `get_redoc_html()` с явно указанной версией `redoc@2.1.3`:

```python
@app.get("/redoc", include_in_schema=False)
def redoc_html() -> HTMLResponse:
    return get_redoc_html(
        openapi_url="/openapi.json",
        title="Personal Finance Tracker API — ReDoc",
        redoc_js_url="https://cdn.jsdelivr.net/npm/redoc@2.1.3/bundles/redoc.standalone.js",
    )
```

```
Git: 1e46aa6 fix: fix data isolation and CSV export bugs
     fe65429 docs: translate REPORT.md to Russian
     ff05667 fix: fix blank ReDoc page by pinning CDN version to redoc@2.1.3
```

---

---

# Сессия 3 — Починка CI pipeline
**Дата**: 2026-06-15  
**Модель**: Claude Sonnet 4.6 (claude-sonnet-4-6)  
**Инструмент**: Claude Code CLI

---

## 14. Падение GitHub Actions CI

После пуша выяснилось, что CI-шаг `npm build` падает с ошибкой кэша.

**Симптом**:
```
Post-job "Cache node modules" step failed:
Some specified paths were not resolved, unable to save cache.
```

**Причина**: в `.github/workflows/ci.yml` был указан `cache: 'npm'` для `actions/setup-node`, что требует наличия `package-lock.json` для вычисления ключа кэша. Файл не был закоммичен в репозиторий. Дополнительно: `npm install` в CI медленнее и менее воспроизводим, чем `npm ci`.

**Исправление**:
- Закоммичен `frontend/package-lock.json` (3055 строк, автоматически сгенерирован `npm install`).
- В `ci.yml` `npm install` заменён на `npm ci` — устанавливает строго по локфайлу, быстрее на ~2×.

```
Git: 5aac070 fix: add package-lock.json and switch CI to npm ci
     44eb513 docs: update REPORT.md and add project specification file
```

**Итог**: CI pipeline теперь проходит полностью (lint + тесты + npm build).

---

---

# Сессия 4 — Аудит и полная реализация мультивалютности
**Дата**: 2026-06-16  
**Модель**: Claude Sonnet 4.6 (claude-sonnet-4-6)  
**Инструмент**: Claude Code CLI

---

## 15. Анализ реализации мультивалютности

**Пользователь**: проанализируй проект и опиши, как реализовано требование по мультивалютности.

Проведён детальный анализ 13 файлов проекта. Выявлены четыре несоответствия требованию:

1. **preferred_currency не передавался на фронтенд**: JWT содержал только `sub: user.id`, `preferred_currency` нигде не хранилась — везде подставлялся хардкод `'USD'`.
2. **Дашборд, графики и список транзакций хардкодили USD**: `fmt()` в `Dashboard.jsx`, `Transactions.jsx`, тултипы `MonthlyTrendChart.jsx` и `ExpensesPieChart.jsx` — везде `currency: 'USD'`.
3. **Форма транзакции не конвертировала автоматически**: пользователь должен был вручную вычислять и вводить `amount` в основной валюте. Поля `original_amount`, `exchange_rate` и `amount` не были связаны.
4. **Seed-данные не демонстрировали реальную мультивалютность**: у user2 (EUR) был `exchange_rate = 1.0` при всех транзакциях в EUR (корректно), но кросс-валютных транзакций не было вовсе. Плюс в более ранней версии был некорректный `exchange_rate = 1.08` для EUR→EUR операций.

---

## 16. Исправление мультивалютности

**Пользователь**: внеси исправления, чтобы всё было реализовано согласно требованиям.

Изменено 8 файлов:

### Backend: preferred_currency в JWT

`auth.py` — оба endpoint (`/login`, `/register`) теперь включают в payload токена `email`, `name`, `preferred_currency`:

```python
access_token = create_access_token(
    data={
        "sub": user.id,
        "email": user.email,
        "name": user.name,
        "preferred_currency": user.preferred_currency,
    }, ...
)
```

### Frontend: AuthContext читает preferred_currency

`AuthContext.jsx` — при декодировании JWT берёт `payload.preferred_currency` и сохраняет в объект `user`. Теперь любой компонент может получить основную валюту через `useAuth()`.

### Frontend: автоконвертация в форме транзакции

`TransactionModal.jsx` — три ключевых изменения:

1. `makeDefaultForm(preferredCurrency)` — дефолтная валюта формы теперь совпадает с preferred_currency пользователя.
2. `useEffect` на `[form.original_amount, form.exchange_rate]` — автоматически пересчитывает `amount = original_amount × exchange_rate`:
```js
useEffect(() => {
  const orig = parseFloat(form.original_amount)
  const rate = parseFloat(form.exchange_rate)
  if (!isNaN(orig) && orig > 0 && !isNaN(rate) && rate > 0) {
    setForm(prev => ({ ...prev, amount: (orig * rate).toFixed(2) }))
  }
}, [form.original_amount, form.exchange_rate])
```
3. Блок полей `exchange_rate` / `amount (в основной валюте)` отображается условно — только когда `original_currency !== preferredCurrency`. Поле `amount` переведено в `readOnly`. Метка стала динамической: "Rate (1 EUR → USD)".

### Frontend: дашборд, транзакции, графики

- `Dashboard.jsx` и `Transactions.jsx`: `currency = user?.preferred_currency || 'USD'` через `useAuth()`, передаётся во все вызовы `fmt(amount, currency)`.
- `MonthlyTrendChart.jsx` и `ExpensesPieChart.jsx`: принимают проп `currency`, используют в `Intl.NumberFormat`.

### Seed-данные: кросс-валютные транзакции для user2

`seed_data.py` — добавлены три демонстрационные транзакции в USD для EUR-аккаунта с `exchange_rate = 0.92` (1 USD = 0.92 EUR):

```python
EUR_PER_USD = 0.92
Transaction(original_amount=220.0, original_currency="USD",
            exchange_rate=EUR_PER_USD, amount=round(220.0 * EUR_PER_USD, 2),
            description="Hotel booking (USD)", ...)
```

**Результат тестирования**: 17/17 тестов проходят без изменений.

```
Git: 9907a0a fix: complete multi-currency support
```

---

## Итоговые метрики (все сессии)

| Показатель | Значение |
|-----------|---------|
| Python файлов | 51 |
| React файлов | 27 |
| API endpoints | 30+ |
| Тестов | 17 (17 passed) |
| Seed транзакций | 200+ на пользователя |
| Git коммитов | 18 |
| Сессий | 4 |
