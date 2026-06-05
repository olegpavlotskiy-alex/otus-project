from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def create_log(
    db: Session,
    user_id: str,
    entity_type: str,
    entity_id: str,
    action: str,
    old_values: dict[str, Any] | None = None,
    new_values: dict[str, Any] | None = None,
) -> AuditLog:
    log = AuditLog(
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        old_values=old_values,
        new_values=new_values,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_paginated(
    db: Session,
    user_id: str,
    entity_type: str | None = None,
    action: str | None = None,
    page: int = 1,
    size: int = 20,
) -> tuple[list[AuditLog], int]:
    query = db.query(AuditLog).filter(AuditLog.user_id == user_id)

    if entity_type is not None:
        query = query.filter(AuditLog.entity_type == entity_type)
    if action is not None:
        query = query.filter(AuditLog.action == action)

    total = query.count()
    items = (
        query.order_by(AuditLog.timestamp.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )
    return items, total
