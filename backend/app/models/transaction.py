from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, Text, event
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    category_id: Mapped[str] = mapped_column(String(36), ForeignKey("categories.id"), nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    original_amount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    original_currency: Mapped[str] = mapped_column(String(3), nullable=False)
    exchange_rate: Mapped[float] = mapped_column(Numeric(15, 6), default=1.0)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    type: Mapped[str] = mapped_column(Enum("income", "expense", name="transaction_type", native_enum=False), nullable=False)
    recurring_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("recurring_transactions.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[User] = relationship("User", back_populates="transactions")
    category: Mapped[Category | None] = relationship("Category", back_populates="transactions")
    recurring: Mapped[RecurringTransaction | None] = relationship("RecurringTransaction", back_populates="transactions")


@event.listens_for(Transaction, "before_update")
def before_transaction_update(mapper, connection, target):
    target.updated_at = datetime.utcnow()
