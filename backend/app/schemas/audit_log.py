
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: str
    user_id: str
    entity_type: str
    entity_id: str
    action: str
    old_values: dict[str, Any] | None
    new_values: dict[str, Any] | None
    timestamp: datetime

    model_config = {"from_attributes": True}


class PaginatedAuditLog(BaseModel):
    items: list[AuditLogOut]
    total: int
    page: int
    size: int
    pages: int
