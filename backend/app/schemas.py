"""
Pydantic schemas — the API's request/response contract.

Kept separate from models.py deliberately: SQLAlchemy models describe how
data is *stored*; Pydantic schemas describe how data is *exchanged* over
the API. Conflating them means every internal DB column is implicitly
part of the public API contract, which becomes a problem the moment they
need to diverge (e.g. exposing a computed field, or hiding an internal id).
"""
from datetime import date as date_type
from typing import Optional, Literal

from pydantic import BaseModel, Field, ConfigDict


# ---- Master data (simple read schemas for dropdowns) ----------------------


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class SubcategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    category_id: int


class PaymentMethodOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class AccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class MerchantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


# ---- Expenses ---------------------------------------------------------


class ExpenseCreate(BaseModel):
    """
    Mirrors the approved business rule: amount, date, category, and
    payment method are mandatory; everything else is optional.
    """

    date: date_type
    amount: float = Field(gt=0, description="Must be a positive number")
    account_id: int
    category_id: int
    payment_method_id: int
    subcategory_id: Optional[int] = None
    merchant_name: Optional[str] = Field(default=None, max_length=150)
    need_or_want: Optional[Literal["need", "want"]] = None
    notes: Optional[str] = Field(default=None, max_length=500)
    tags: Optional[str] = Field(default=None, max_length=255)


class ExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date: date_type
    amount: float
    notes: Optional[str]
    account: AccountOut
    category: CategoryOut
    subcategory: Optional[SubcategoryOut]
    merchant: Optional[MerchantOut]
    payment_method: PaymentMethodOut
    need_or_want: Optional[str]
    tags: Optional[str]


# ---- Dashboard ----------------------------------------------------------


class DashboardSummary(BaseModel):
    month: str  # "YYYY-MM"
    total_expense: float
    transaction_count: int
    average_daily_expense: float
    largest_expense: float