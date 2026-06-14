from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session, joinedload

from app.models.recurring import RecurringTransaction
from app.schemas.recurring import RecurringCreate, RecurringUpdate


def get_all(db: Session, user_id: str) -> list[RecurringTransaction]:
    return (
        db.query(RecurringTransaction)
        .options(joinedload(RecurringTransaction.category))
        .filter(RecurringTransaction.user_id == user_id)
        .all()
    )


def get_by_id(db: Session, user_id: str, rec_id: str) -> RecurringTransaction | None:
    return (
        db.query(RecurringTransaction)
        .options(joinedload(RecurringTransaction.category))
        .filter(RecurringTransaction.user_id == user_id, RecurringTransaction.id == rec_id)
        .first()
    )


def create(db: Session, user_id: str, data: RecurringCreate) -> RecurringTransaction:
    rec = RecurringTransaction(
        user_id=user_id,
        category_id=data.category_id,
        amount=data.amount,
        currency=data.currency,
        description=data.description,
        type=data.type,
        frequency=data.frequency,
        next_date=data.next_date,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return get_by_id(db, user_id, rec.id) or rec


def update(db: Session, rec: RecurringTransaction, data: RecurringUpdate) -> RecurringTransaction:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(rec, field, value)
    db.commit()
    db.refresh(rec)
    return rec


def delete(db: Session, rec: RecurringTransaction) -> None:
    db.delete(rec)
    db.commit()


def get_due(db: Session) -> list[RecurringTransaction]:
    today = date.today()
    return (
        db.query(RecurringTransaction)
        .filter(
            RecurringTransaction.is_active,
            RecurringTransaction.next_date <= today,
        )
        .all()
    )
