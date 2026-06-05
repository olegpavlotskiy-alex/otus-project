from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    preferred_currency: Mapped[str] = mapped_column(String(3), default="USD")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    categories: Mapped[list[Category]] = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    transactions: Mapped[list[Transaction]] = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    budgets: Mapped[list[Budget]] = relationship("Budget", back_populates="user", cascade="all, delete-orphan")
    recurring_transactions: Mapped[list[RecurringTransaction]] = relationship("RecurringTransaction", back_populates="user", cascade="all, delete-orphan")
    audit_logs: Mapped[list[AuditLog]] = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
