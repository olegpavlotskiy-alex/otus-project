from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_redoc_html
from fastapi.responses import HTMLResponse

from app.api.v1.router import api_router
from app.db.session import Base, SessionLocal, engine

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Personal Finance Tracker API",
    description="A comprehensive REST API for tracking personal finances, budgets, and transactions.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,  # disabled — served manually below with pinned CDN version
)

# CORS middleware - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all API routers
app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
def on_startup() -> None:
    # Create all tables (idempotent)
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified.")

    # Seed initial data
    db = SessionLocal()
    try:
        from seed_data import seed
        seed(db)
    except Exception as exc:
        logger.warning(f"Seed data skipped or failed: {exc}")
    finally:
        db.close()

    # Start APScheduler for recurring transactions
    try:
        from apscheduler.schedulers.background import BackgroundScheduler

        scheduler = BackgroundScheduler()

        def run_recurring():
            db = SessionLocal()
            try:
                from app.services.recurring_service import process_recurring_transactions
                count = process_recurring_transactions(db)
                if count > 0:
                    logger.info(f"APScheduler: processed {count} recurring transactions.")
            except Exception as exc:
                logger.error(f"APScheduler recurring job error: {exc}")
            finally:
                db.close()

        scheduler.add_job(run_recurring, "interval", hours=1, id="recurring_transactions")
        scheduler.start()
        logger.info("APScheduler started — recurring transactions will run every hour.")
    except Exception as exc:
        logger.warning(f"APScheduler could not start: {exc}")


@app.get("/redoc", include_in_schema=False)
def redoc_html() -> HTMLResponse:
    return get_redoc_html(
        openapi_url="/openapi.json",
        title="Personal Finance Tracker API — ReDoc",
        redoc_js_url="https://cdn.jsdelivr.net/npm/redoc@2.1.3/bundles/redoc.standalone.js",
    )


@app.get("/health", tags=["health"])
def health_check() -> dict:
    return {"status": "ok", "version": "1.0.0"}
