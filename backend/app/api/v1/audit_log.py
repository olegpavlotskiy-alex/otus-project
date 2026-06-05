from __future__ import annotations

import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.crud import audit_log as audit_crud
from app.models.user import User
from app.schemas.audit_log import AuditLogOut, PaginatedAuditLog

router = APIRouter(prefix="/audit-log", tags=["audit-log"])


@router.get("", response_model=PaginatedAuditLog)
def get_audit_log(
    entity_type: str | None = Query(default=None),
    action: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedAuditLog:
    items, total = audit_crud.get_paginated(
        db=db,
        user_id=current_user.id,
        entity_type=entity_type,
        action=action,
        page=page,
        size=size,
    )
    pages = math.ceil(total / size) if total > 0 else 1
    return PaginatedAuditLog(items=items, total=total, page=page, size=size, pages=pages)
