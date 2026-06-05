
from pydantic import BaseModel

from app.schemas.category import CategoryOut


class BudgetCreate(BaseModel):
    category_id: str
    year: int
    month: int
    limit_amount: float
    currency: str = "USD"


class BudgetUpdate(BaseModel):
    category_id: str | None = None
    year: int | None = None
    month: int | None = None
    limit_amount: float | None = None
    currency: str | None = None


class BudgetOut(BaseModel):
    id: str
    user_id: str
    category_id: str
    year: int
    month: int
    limit_amount: float
    currency: str
    spent_amount: float = 0.0
    category: CategoryOut | None = None

    model_config = {"from_attributes": True}
