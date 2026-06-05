# Active Context

## Текущее состояние (2026-06-06)
Проект полностью реализован и задеплоен.

## Что работает прямо сейчас
- `docker compose up` в `finance-tracker/` поднимает все 3 сервиса
- Все 17 тестов проходят (`pytest tests/ -v`)
- Репозиторий: https://github.com/olegpavlotskiy-alex/otus-project

## Последние изменения
1. Исправлен Python 3.12 annotation bug в `app/schemas/transaction.py` (алиасы `_Date`, `_Datetime`)
2. Закреплён `bcrypt==4.0.1` в `requirements.txt`
3. Исправлены trailing-slash роуты во всех API роутерах (`"/"` → `""`)
4. Исправлен login в frontend: с OAuth2 form-data на JSON body

## Потенциальные улучшения (если понадобятся)
- Заменить `@app.on_event("startup")` на `lifespan` (deprecated warning)
- Заменить `datetime.utcnow()` на `datetime.now(UTC)` (deprecated в Python 3.12)
- Добавить rate limiting на auth endpoints
- Добавить refresh tokens
- E2E тесты (Playwright/Cypress)
