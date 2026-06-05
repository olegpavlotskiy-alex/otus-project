# Project Brief

## Purpose
Personal Finance Tracker — учебный full-stack проект (курс OTUS/AI).  
Спецификация: `/home/oleg.pavlotskiy/AI/Claude/pet/project_fullstack_app.md`

## Core Requirements
- Транзакции: сумма, дата, категория, описание, тип (доход/расход)
- Справочник категорий (иконки, цвета) с CRUD
- Месячные бюджеты с прогресс-баром расхода
- Дашборд: круговая диаграмма, линейный график за 6 мес., топ-5 категорий
- Фильтрация транзакций (дата, категория, сумма)
- Импорт/экспорт CSV
- Повторяющиеся транзакции (APScheduler)
- Мультивалютность (курс на момент транзакции)
- JWT авторизация, 2 демо-аккаунта
- Лог изменений (audit log)

## Success Criteria
- `docker compose up` — всё стартует без дополнительной настройки
- Swagger UI на `http://localhost:8000/docs`
- ≥10 тестов, CI (lint + тесты), seed данные (200+ транзакций)
- ARCHITECTURE.md создан до кода (проверяется по git-истории)

## Repo
https://github.com/olegpavlotskiy-alex/otus-project
