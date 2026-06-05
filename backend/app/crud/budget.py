from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.budget import Budget
from app.models.transaction import Transaction
from app.schemas.budget import BudgetCreate, BudgetUpdate


def get_all(db: Session, user_id: str, year: int | None = None, month: int | None = None) -> list[Budget]:
    query = (
        db.query(Budget)
        .options(joinedload(Budget.category))
        .filter(Budget.user_id == user_id)
    )
    if year is not None:
        query = query.filter(Budget.year == year)
    if month is not None:
        query = query.filter(Budget.month == month)
    return query.all()


def get_by_id(db: Session, user_id: str, budget_id: str) -> Budget | None:
    return (
        db.query(Budget)
        .options(joinedload(Budget.category))
        .filter(Budget.user_id == user_id, Budget.id == budget_id)
        .first()
    )


def create(db: Session, user_id: str, data: BudgetCreate) -> Budget:
    budget = Budget(
        user_id=user_id,
        category_id=data.category_id,
        year=data.year,
        month=data.month,
        limit_amount=data.limit_amount,
        currency=data.currency,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return get_by_id(db, user_id, budget.id) or budget


def update(db: Session, budget: Budget, data: BudgetUpdate) -> Budget:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(budget, field, value)
    db.commit()
    db.refresh(budget)
    return budget


def delete(db: Session, budget: Budget) -> None:
    db.delete(budget)
    db.commit()


def get_spent_for_budget(db: Session, budget: Budget) -> float:
    from datetime import date
    import calendar

    _, last_day = calendar.monthrange(budget.year, budget.month)
    date_from = date(budget.year, budget.month, 1)
    date_to = date(budget.year, budget.month, last_day)

    result = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == budget.user_id,
            Transaction.category_id == budget.category_id,
            Transaction.type == "expense",
            Transaction.date >= date_from,
            Transaction.date <= date_to,
        )
        .scalar()
    )
    return float(result or 0.0)
