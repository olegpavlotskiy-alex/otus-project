from __future__ import annotations

import uuid
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.crud.audit_log import create_log
from app.crud.recurring import get_due
from app.models.transaction import Transaction


def _advance_date(current_date: date, frequency: str) -> date:
    try:
        from dateutil.relativedelta import relativedelta

        if frequency == "daily":
            return current_date + timedelta(days=1)
        elif frequency == "weekly":
            return current_date + timedelta(weeks=1)
        elif frequency == "monthly":
            return current_date + relativedelta(months=1)
        elif frequency == "yearly":
            return current_date + relativedelta(years=1)
        else:
            return current_date + timedelta(days=1)
    except ImportError:
        # Fallback without dateutil
        if frequency == "daily":
            return current_date + timedelta(days=1)
        elif frequency == "weekly":
            return current_date + timedelta(weeks=1)
        elif frequency == "monthly":
            # Manual month advancement
            month = current_date.month + 1
            year = current_date.year
            if month > 12:
                month = 1
                year += 1
            import calendar
            last_day = calendar.monthrange(year, month)[1]
            day = min(current_date.day, last_day)
            return date(year, month, day)
        elif frequency == "yearly":
            import calendar
            year = current_date.year + 1
            last_day = calendar.monthrange(year, current_date.month)[1]
            day = min(current_date.day, last_day)
            return date(year, current_date.month, day)
        else:
            return current_date + timedelta(days=1)


def process_recurring_transactions(db: Session) -> int:
    due_items = get_due(db)
    count = 0

    for rec in due_items:
        transaction = Transaction(
            id=str(uuid.uuid4()),
            user_id=rec.user_id,
            category_id=rec.category_id,
            amount=rec.amount,
            original_amount=rec.amount,
            original_currency=rec.currency,
            exchange_rate=1.0,
            date=rec.next_date,
            description=rec.description or f"Recurring: {rec.description}",
            type=rec.type,
            recurring_id=rec.id,
        )
        db.add(transaction)

        # Advance next_date
        rec.next_date = _advance_date(rec.next_date, rec.frequency)

        db.flush()

        create_log(
            db=db,
            user_id=rec.user_id,
            entity_type="transaction",
            entity_id=transaction.id,
            action="create",
            new_values={
                "amount": float(transaction.amount),
                "type": transaction.type,
                "date": str(transaction.date),
                "recurring_id": rec.id,
                "description": transaction.description,
            },
        )
        count += 1

    db.commit()
    return count
