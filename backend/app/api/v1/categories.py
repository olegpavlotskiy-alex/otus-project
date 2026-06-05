from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.crud import audit_log as audit_crud
from app.crud import category as category_crud
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])


def _model_to_dict(obj) -> dict:
    result = {}
    for col in obj.__table__.columns:
        val = getattr(obj, col.name)
        result[col.name] = str(val) if val is not None else None
    return result


@router.get("", response_model=list[CategoryOut])
def get_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[CategoryOut]:
    return category_crud.get_all(db, current_user.id)


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CategoryOut:
    category = category_crud.create(db, current_user.id, data)
    audit_crud.create_log(
        db=db,
        user_id=current_user.id,
        entity_type="category",
        entity_id=category.id,
        action="create",
        new_values=_model_to_dict(category),
    )
    return category


@router.put("/{cat_id}", response_model=CategoryOut)
def update_category(
    cat_id: str,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CategoryOut:
    category = category_crud.get_by_id(db, current_user.id, cat_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    old_values = _model_to_dict(category)
    category = category_crud.update(db, category, data)
    audit_crud.create_log(
        db=db,
        user_id=current_user.id,
        entity_type="category",
        entity_id=category.id,
        action="update",
        old_values=old_values,
        new_values=_model_to_dict(category),
    )
    return category


@router.delete("/{cat_id}", response_model=dict)
def delete_category(
    cat_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    category = category_crud.get_by_id(db, current_user.id, cat_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    old_values = _model_to_dict(category)
    audit_crud.create_log(
        db=db,
        user_id=current_user.id,
        entity_type="category",
        entity_id=category.id,
        action="delete",
        old_values=old_values,
    )
    category_crud.delete(db, category)
    return {"ok": True}
