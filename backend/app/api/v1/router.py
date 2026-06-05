from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import audit_log, auth, budgets, categories, dashboard, recurring, transactions

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(categories.router)
api_router.include_router(transactions.router)
api_router.include_router(budgets.router)
api_router.include_router(recurring.router)
api_router.include_router(dashboard.router)
api_router.include_router(audit_log.router)
