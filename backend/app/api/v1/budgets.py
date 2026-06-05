from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.crud import audit_log as audit_crud
from app.crud import budget as budget_crud
from app.models.user import User
from app.schemas.budget import BudgetCreate, BudgetOut, BudgetUpdate

router = APIRouter(prefix="/budgets", tags=["budgets"])


def _model_to_dict(obj) -> dict:
    result = {}
    for col in obj.__table__.columns:
        val = getattr(obj, col.name)
        result[col.name] = str(val) if val is not None else None
    return result


@router.get("", response_model=list[BudgetOut])
def get_budgets(
    year: int | None = Query(default=None),
    month: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[BudgetOut]:
    budgets = budget_crud.get_all(db, current_user.id, year=year, month=month)
    result = []
    for budget in budgets:
        spent = budget_crud.get_spent_for_budget(db, budget)
        budget_out = BudgetOut.model_validate(budget)
        budget_out.spent_amount = spent
        result.append(budget_out)
    return result


@router.post("", response_model=BudgetOut, status_code=status.HTTP_201_CREATED)
def create_budget(
    data: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BudgetOut:
    budget = budget_crud.create(db, current_user.id, data)
    audit_crud.create_log(
        db=db,
        user_id=current_user.id,
        entity_type="budget",
        entity_id=budget.id,
        action="create",
        new_values=_model_to_dict(budget),
    )
    spent = budget_crud.get_spent_for_budget(db, budget)
    budget_out = BudgetOut.model_validate(budget)
    budget_out.spent_amount = spent
    return budget_out


@router.put("/{budget_id}", response_model=BudgetOut)
def update_budget(
    budget_id: str,
    data: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BudgetOut:
    budget = budget_crud.get_by_id(db, current_user.id, budget_id)
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")

    old_values = _model_to_dict(budget)
    budget = budget_crud.update(db, budget, data)
    audit_crud.create_log(
        db=db,
        user_id=current_user.id,
        entity_type="budget",
        entity_id=budget.id,
        action="update",
        old_values=old_values,
        new_values=_model_to_dict(budget),
    )
    spent = budget_crud.get_spent_for_budget(db, budget)
    budget_out = BudgetOut.model_validate(budget)
    budget_out.spent_amount = spent
    return budget_out


@router.delete("/{budget_id}", response_model=dict)
def delete_budget(
    budget_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    budget = budget_crud.get_by_id(db, current_user.id, budget_id)
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")

    old_values = _model_to_dict(budget)
    audit_crud.create_log(
        db=db,
        user_id=current_user.id,
        entity_type="budget",
        entity_id=budget.id,
        action="delete",
        old_values=old_values,
    )
    budget_crud.delete(db, budget)
    return {"ok": True}
