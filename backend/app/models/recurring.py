from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Boolean, Date, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class RecurringTransaction(Base):
    __tablename__ = "recurring_transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    category_id: Mapped[str] = mapped_column(String(36), ForeignKey("categories.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    description: Mapped[str] = mapped_column(Text, default="")
    type: Mapped[str] = mapped_column(Enum("income", "expense", name="recurring_type", native_enum=False), nullable=False)
    frequency: Mapped[str] = mapped_column(
        Enum("daily", "weekly", "monthly", "yearly", name="recurring_frequency", native_enum=False), nullable=False
    )
    next_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    user: Mapped[User] = relationship("User", back_populates="recurring_transactions")
    category: Mapped[Category] = relationship("Category", back_populates="recurring_transactions")
    transactions: Mapped[list[Transaction]] = relationship("Transaction", back_populates="recurring")
