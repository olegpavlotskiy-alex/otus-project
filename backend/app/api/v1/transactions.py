from __future__ import annotations

import json
import math
from datetime import date

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.crud import audit_log as audit_crud
from app.crud import transaction as transaction_crud
from app.models.user import User
from app.schemas.transaction import (
    PaginatedTransactions,
    TransactionCreate,
    TransactionFilter,
    TransactionOut,
    TransactionUpdate,
)
from app.services import csv_service

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _model_to_dict(obj) -> dict:
    result = {}
    for col in obj.__table__.columns:
        val = getattr(obj, col.name)
        if val is not None:
            result[col.name] = str(val)
        else:
            result[col.name] = None
    return result


@router.get("/export")
def export_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.schemas.transaction import TransactionFilter

    filters = TransactionFilter(page=1, size=10000)
    items, _ = transaction_crud.get_filtered(db, current_user.id, filters)
    csv_content = csv_service.export_transactions(items)

    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions.csv"},
    )


@router.get("", response_model=PaginatedTransactions)
def get_transactions(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    category_id: str | None = Query(default=None),
    type: str | None = Query(default=None),
    amount_min: float | None = Query(default=None),
    amount_max: float | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedTransactions:
    filters = TransactionFilter(
        date_from=date_from,
        date_to=date_to,
        category_id=category_id,
        type=type,
        amount_min=amount_min,
        amount_max=amount_max,
        page=page,
        size=size,
    )
    items, total = transaction_crud.get_filtered(db, current_user.id, filters)
    pages = math.ceil(total / size) if total > 0 else 1
    return PaginatedTransactions(items=items, total=total, page=page, size=size, pages=pages)


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TransactionOut:
    transaction = transaction_crud.create(db, current_user.id, data)
    audit_crud.create_log(
        db=db,
        user_id=current_user.id,
        entity_type="transaction",
        entity_id=transaction.id,
        action="create",
        new_values=_model_to_dict(transaction),
    )
    return transaction


@router.put("/{tx_id}", response_model=TransactionOut)
def update_transaction(
    tx_id: str,
    data: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TransactionOut:
    transaction = transaction_crud.get_by_id(db, current_user.id, tx_id)
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    old_values = _model_to_dict(transaction)
    transaction = transaction_crud.update(db, transaction, data)
    audit_crud.create_log(
        db=db,
        user_id=current_user.id,
        entity_type="transaction",
        entity_id=transaction.id,
        action="update",
        old_values=old_values,
        new_values=_model_to_dict(transaction),
    )
    return transaction


@router.delete("/{tx_id}", response_model=dict)
def delete_transaction(
    tx_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    transaction = transaction_crud.get_by_id(db, current_user.id, tx_id)
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    old_values = _model_to_dict(transaction)
    audit_crud.create_log(
        db=db,
        user_id=current_user.id,
        entity_type="transaction",
        entity_id=transaction.id,
        action="delete",
        old_values=old_values,
    )
    transaction_crud.delete(db, transaction)
    return {"ok": True}


@router.post("/import", response_model=dict)
def import_transactions(
    file: UploadFile = File(...),
    mapping: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    try:
        mapping_dict = json.loads(mapping)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid mapping JSON",
        )

    file_content = file.file.read()
    count = csv_service.import_transactions(db, current_user.id, file_content, mapping_dict)
    return {"imported": count}
