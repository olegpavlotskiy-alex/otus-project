from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransactionFilter, TransactionUpdate


def get_filtered(
    db: Session, user_id: str, filters: TransactionFilter
) -> tuple[list[Transaction], int]:
    query = (
        db.query(Transaction)
        .options(joinedload(Transaction.category))
        .filter(Transaction.user_id == user_id)
    )

    if filters.date_from is not None:
        query = query.filter(Transaction.date >= filters.date_from)
    if filters.date_to is not None:
        query = query.filter(Transaction.date <= filters.date_to)
    if filters.category_id is not None:
        query = query.filter(Transaction.category_id == filters.category_id)
    if filters.type is not None:
        query = query.filter(Transaction.type == filters.type)
    if filters.amount_min is not None:
        query = query.filter(Transaction.amount >= filters.amount_min)
    if filters.amount_max is not None:
        query = query.filter(Transaction.amount <= filters.amount_max)

    total = query.count()
    items = (
        query.order_by(Transaction.date.desc(), Transaction.created_at.desc())
        .offset((filters.page - 1) * filters.size)
        .limit(filters.size)
        .all()
    )
    return items, total


def get_by_id(db: Session, user_id: str, tx_id: str) -> Transaction | None:
    return (
        db.query(Transaction)
        .options(joinedload(Transaction.category))
        .filter(Transaction.user_id == user_id, Transaction.id == tx_id)
        .first()
    )


def create(db: Session, user_id: str, data: TransactionCreate) -> Transaction:
    transaction = Transaction(
        user_id=user_id,
        category_id=data.category_id,
        amount=data.amount,
        original_amount=data.original_amount,
        original_currency=data.original_currency,
        exchange_rate=data.exchange_rate,
        date=data.date,
        description=data.description,
        type=data.type,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    # Reload with category relationship
    return get_by_id(db, user_id, transaction.id) or transaction


def update(db: Session, transaction: Transaction, data: TransactionUpdate) -> Transaction:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(transaction, field, value)
    db.commit()
    db.refresh(transaction)
    return transaction


def delete(db: Session, transaction: Transaction) -> None:
    db.delete(transaction)
    db.commit()
