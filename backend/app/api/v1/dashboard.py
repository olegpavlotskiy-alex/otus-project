from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    today = date.today()
    first_of_month = date(today.year, today.month, 1)

    # All-time totals
    all_income = (
        db.query(func.sum(Transaction.amount))
        .filter(Transaction.user_id == current_user.id, Transaction.type == "income")
        .scalar()
        or 0.0
    )
    all_expense = (
        db.query(func.sum(Transaction.amount))
        .filter(Transaction.user_id == current_user.id, Transaction.type == "expense")
        .scalar()
        or 0.0
    )
    tx_count = (
        db.query(func.count(Transaction.id))
        .filter(Transaction.user_id == current_user.id)
        .scalar()
        or 0
    )

    # Current month
    month_income = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
            Transaction.date >= first_of_month,
            Transaction.date <= today,
        )
        .scalar()
        or 0.0
    )
    month_expense = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            Transaction.date >= first_of_month,
            Transaction.date <= today,
        )
        .scalar()
        or 0.0
    )

    return {
        "total_income": float(all_income),
        "total_expense": float(all_expense),
        "balance": float(all_income) - float(all_expense),
        "transaction_count": tx_count,
        "current_month_income": float(month_income),
        "current_month_expense": float(month_expense),
    }


@router.get("/expenses-by-category")
def get_expenses_by_category(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    today = date.today()
    first_of_month = date(today.year, today.month, 1)

    results = (
        db.query(
            Transaction.category_id,
            Category.name.label("category_name"),
            Category.color.label("category_color"),
            func.sum(Transaction.amount).label("total_amount"),
        )
        .join(Category, Transaction.category_id == Category.id, isouter=True)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            Transaction.date >= first_of_month,
            Transaction.date <= today,
        )
        .group_by(Transaction.category_id, Category.name, Category.color)
        .order_by(func.sum(Transaction.amount).desc())
        .all()
    )

    return [
        {
            "category_id": row.category_id,
            "category_name": row.category_name or "Uncategorized",
            "category_color": row.category_color or "#6366f1",
            "total_amount": float(row.total_amount),
        }
        for row in results
    ]


@router.get("/monthly-trend")
def get_monthly_trend(
    months: int = Query(default=6, ge=1, le=24),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    from dateutil.relativedelta import relativedelta

    today = date.today()
    result = []

    for i in range(months - 1, -1, -1):
        target = today - relativedelta(months=i)
        year = target.year
        month = target.month
        import calendar
        last_day = calendar.monthrange(year, month)[1]
        first_day = date(year, month, 1)
        end_day = date(year, month, last_day)

        income = (
            db.query(func.sum(Transaction.amount))
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.type == "income",
                Transaction.date >= first_day,
                Transaction.date <= end_day,
            )
            .scalar()
            or 0.0
        )
        expense = (
            db.query(func.sum(Transaction.amount))
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.type == "expense",
                Transaction.date >= first_day,
                Transaction.date <= end_day,
            )
            .scalar()
            or 0.0
        )
        result.append({
            "year": year,
            "month": month,
            "income": float(income),
            "expense": float(expense),
        })

    return result


@router.get("/top-categories")
def get_top_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    today = date.today()
    first_of_month = date(today.year, today.month, 1)

    results = (
        db.query(
            Transaction.category_id,
            Category.name.label("category_name"),
            Category.color.label("category_color"),
            Category.icon.label("category_icon"),
            func.sum(Transaction.amount).label("total_amount"),
        )
        .join(Category, Transaction.category_id == Category.id, isouter=True)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            Transaction.date >= first_of_month,
            Transaction.date <= today,
        )
        .group_by(Transaction.category_id, Category.name, Category.color, Category.icon)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(5)
        .all()
    )

    return [
        {
            "category_id": row.category_id,
            "category_name": row.category_name or "Uncategorized",
            "category_color": row.category_color or "#6366f1",
            "category_icon": row.category_icon or "💰",
            "total_amount": float(row.total_amount),
        }
        for row in results
    ]
