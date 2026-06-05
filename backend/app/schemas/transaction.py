
import datetime as _dt
from typing import Literal, Optional

from pydantic import BaseModel

from app.schemas.category import CategoryOut

# Aliases to avoid Python 3.12 class-body shadowing: 'date: date | None = None'
# assigns date=None first, then evaluates 'date | None' where date is already None.
_Date = _dt.date
_Datetime = _dt.datetime


class TransactionCreate(BaseModel):
    category_id: Optional[str] = None
    amount: float
    original_amount: float
    original_currency: str
    exchange_rate: float = 1.0
    date: _Date
    description: str = ""
    type: Literal["income", "expense"]


class TransactionUpdate(BaseModel):
    category_id: Optional[str] = None
    amount: Optional[float] = None
    original_amount: Optional[float] = None
    original_currency: Optional[str] = None
    exchange_rate: Optional[float] = None
    date: Optional[_Date] = None
    description: Optional[str] = None
    type: Optional[Literal["income", "expense"]] = None


class TransactionOut(BaseModel):
    id: str
    user_id: str
    category_id: Optional[str] = None
    amount: float
    original_amount: float
    original_currency: str
    exchange_rate: float
    date: _Date
    description: str
    type: str
    recurring_id: Optional[str] = None
    created_at: _Datetime
    updated_at: _Datetime
    category: Optional[CategoryOut] = None

    model_config = {"from_attributes": True}


class TransactionFilter(BaseModel):
    date_from: Optional[_Date] = None
    date_to: Optional[_Date] = None
    category_id: Optional[str] = None
    type: Optional[Literal["income", "expense"]] = None
    amount_min: Optional[float] = None
    amount_max: Optional[float] = None
    page: int = 1
    size: int = 20


class PaginatedTransactions(BaseModel):
    items: list[TransactionOut]
    total: int
    page: int
    size: int
    pages: int
