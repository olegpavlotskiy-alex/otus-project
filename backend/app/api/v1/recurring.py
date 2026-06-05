from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.crud import audit_log as audit_crud
from app.crud import recurring as recurring_crud
from app.models.user import User
from app.schemas.recurring import RecurringCreate, RecurringOut, RecurringUpdate
from app.services.recurring_service import process_recurring_transactions

router = APIRouter(prefix="/recurring", tags=["recurring"])


def _model_to_dict(obj) -> dict:
    result = {}
    for col in obj.__table__.columns:
        val = getattr(obj, col.name)
        result[col.name] = str(val) if val is not None else None
    return result


@router.get("", response_model=list[RecurringOut])
def get_recurring(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[RecurringOut]:
    return recurring_crud.get_all(db, current_user.id)


@router.post("", response_model=RecurringOut, status_code=status.HTTP_201_CREATED)
def create_recurring(
    data: RecurringCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RecurringOut:
    rec = recurring_crud.create(db, current_user.id, data)
    audit_crud.create_log(
        db=db,
        user_id=current_user.id,
        entity_type="recurring",
        entity_id=rec.id,
        action="create",
        new_values=_model_to_dict(rec),
    )
    return rec


@router.put("/{rec_id}", response_model=RecurringOut)
def update_recurring(
    rec_id: str,
    data: RecurringUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RecurringOut:
    rec = recurring_crud.get_by_id(db, current_user.id, rec_id)
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurring transaction not found")

    old_values = _model_to_dict(rec)
    rec = recurring_crud.update(db, rec, data)
    audit_crud.create_log(
        db=db,
        user_id=current_user.id,
        entity_type="recurring",
        entity_id=rec.id,
        action="update",
        old_values=old_values,
        new_values=_model_to_dict(rec),
    )
    return rec


@router.delete("/{rec_id}", response_model=dict)
def delete_recurring(
    rec_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    rec = recurring_crud.get_by_id(db, current_user.id, rec_id)
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurring transaction not found")

    old_values = _model_to_dict(rec)
    audit_crud.create_log(
        db=db,
        user_id=current_user.id,
        entity_type="recurring",
        entity_id=rec.id,
        action="delete",
        old_values=old_values,
    )
    recurring_crud.delete(db, rec)
    return {"ok": True}


@router.post("/process", response_model=dict)
def process_recurring(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    created = process_recurring_transactions(db)
    return {"created": created}
