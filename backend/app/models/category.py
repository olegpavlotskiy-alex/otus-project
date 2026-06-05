from __future__ import annotations

import uuid

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    icon: Mapped[str] = mapped_column(String, default="💰")
    color: Mapped[str] = mapped_column(String(7), default="#6366f1")
    type: Mapped[str] = mapped_column(Enum("income", "expense", name="category_type", native_enum=False), nullable=False)

    user: Mapped[User] = relationship("User", back_populates="categories")
    transactions: Mapped[list[Transaction]] = relationship("Transaction", back_populates="category")
    budgets: Mapped[list[Budget]] = relationship("Budget", back_populates="category")
    recurring_transactions: Mapped[list[RecurringTransaction]] = relationship("RecurringTransaction", back_populates="category")
