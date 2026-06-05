
from datetime import date
from typing import Literal

from pydantic import BaseModel

from app.schemas.category import CategoryOut


class RecurringCreate(BaseModel):
    category_id: str
    amount: float
    currency: str = "USD"
    description: str = ""
    type: Literal["income", "expense"]
    frequency: Literal["daily", "weekly", "monthly", "yearly"]
    next_date: date


class RecurringUpdate(BaseModel):
    category_id: str | None = None
    amount: float | None = None
    currency: str | None = None
    description: str | None = None
    type: Literal["income", "expense"] | None = None
    frequency: Literal["daily", "weekly", "monthly", "yearly"] | None = None
    next_date: date | None = None
    is_active: bool | None = None


class RecurringOut(BaseModel):
    id: str
    user_id: str
    category_id: str
    amount: float
    currency: str
    description: str
    type: str
    frequency: str
    next_date: date
    is_active: bool
    category: CategoryOut | None = None

    model_config = {"from_attributes": True}
