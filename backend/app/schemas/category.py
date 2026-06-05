
from typing import Literal

from pydantic import BaseModel


class CategoryCreate(BaseModel):
    name: str
    icon: str = "💰"
    color: str = "#6366f1"
    type: Literal["income", "expense"]


class CategoryUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None
    color: str | None = None
    type: Literal["income", "expense"] | None = None


class CategoryOut(BaseModel):
    id: str
    user_id: str
    name: str
    icon: str
    color: str
    type: str

    model_config = {"from_attributes": True}
