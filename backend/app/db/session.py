from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

# SQLite doesn't support pool_size/max_overflow; detect and configure accordingly
_db_url = settings.DATABASE_URL
_is_sqlite = _db_url.startswith("sqlite")

if _is_sqlite:
    engine = create_engine(
        _db_url,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(
        _db_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass
