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


class IncomeSourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class InvestmentTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class BrokerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class PersonOut(BaseModel):
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


# ---- Income -------------------------------------------------------------


class IncomeCreate(BaseModel):
    """
    Mirrors ExpenseCreate's shape. Amount, date, account, and income
    source are mandatory; tags is optional. No category/payment-method
    concept for income — those are Expense-specific attributes.
    """

    date: date_type
    amount: float = Field(gt=0, description="Must be a positive number")
    account_id: int
    income_source_id: int
    notes: Optional[str] = Field(default=None, max_length=500)
    tags: Optional[str] = Field(default=None, max_length=255)


class IncomeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date: date_type
    amount: float
    notes: Optional[str]
    account: AccountOut
    income_source: IncomeSourceOut
    tags: Optional[str]


# ---- Investments ----------------------------------------------------------


class InvestmentCreate(BaseModel):
    """
    Amount, date, account, and investment type are mandatory. Broker is
    optional free text (auto-created/deduplicated, same UX as Expense's
    merchant_name) since not every investment has one (e.g. a bank FD).
    """

    date: date_type
    amount: float = Field(gt=0, description="Must be a positive number")
    account_id: int
    investment_type_id: int
    broker_name: Optional[str] = Field(default=None, max_length=150)
    notes: Optional[str] = Field(default=None, max_length=500)
    tags: Optional[str] = Field(default=None, max_length=255)


class InvestmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date: date_type
    amount: float
    notes: Optional[str]
    account: AccountOut
    investment_type: InvestmentTypeOut
    broker: Optional[BrokerOut]
    tags: Optional[str]


# ---- Lending ----------------------------------------------------------


class LendingCreate(BaseModel):
    """
    Creates the loan AND its disbursement transaction in one call.
    person_name is free text, auto-created/deduplicated (same pattern as
    merchant_name/broker_name) — unlike those, it's mandatory, since a
    loan without a person doesn't mean anything.
    """

    date: date_type
    amount: float = Field(gt=0, description="Principal amount lent")
    account_id: int
    person_name: str = Field(max_length=150)
    due_date: Optional[date_type] = None
    notes: Optional[str] = Field(default=None, max_length=500)


class LendingRepaymentCreate(BaseModel):
    date: date_type
    amount: float = Field(gt=0, description="Must be a positive number")
    account_id: int
    notes: Optional[str] = Field(default=None, max_length=500)


class LendingRepaymentOut(BaseModel):
    """
    Deliberately NOT built with from_attributes — date/amount/account
    live on the linked Transaction, not directly on LendingRepayment, so
    the router's mapper assembles this explicitly (same reason
    ExpenseOut/IncomeOut/InvestmentOut mappers do the same thing).
    """

    id: int
    date: date_type
    amount: float
    notes: Optional[str]
    account: AccountOut


class LendingOut(BaseModel):
    """
    total_repaid, remaining, and status are computed at read-time (see
    crud.compute_lending_status) — never stored, so they can never drift
    out of sync with the actual repayment history.
    """

    id: int
    date: date_type
    amount: float
    account: AccountOut
    person: PersonOut
    due_date: Optional[date_type]
    notes: Optional[str]
    total_repaid: float
    remaining: float
    status: Literal["active", "partially_repaid", "settled", "overdue"]
    repayments: list[LendingRepaymentOut]


# ---- Borrowing ------------------------------------------------------------


class BorrowingCreate(BaseModel):
    """
    Mirrors LendingCreate exactly, direction reversed — this creates the
    loan you've RECEIVED, plus its receipt transaction.
    """

    date: date_type
    amount: float = Field(gt=0, description="Principal amount borrowed")
    account_id: int
    person_name: str = Field(max_length=150)
    due_date: Optional[date_type] = None
    notes: Optional[str] = Field(default=None, max_length=500)


class BorrowingRepaymentCreate(BaseModel):
    date: date_type
    amount: float = Field(gt=0, description="Must be a positive number")
    account_id: int
    notes: Optional[str] = Field(default=None, max_length=500)


class BorrowingRepaymentOut(BaseModel):
    id: int
    date: date_type
    amount: float
    notes: Optional[str]
    account: AccountOut


class BorrowingOut(BaseModel):
    """Mirrors LendingOut exactly — same computed-status approach."""

    id: int
    date: date_type
    amount: float
    account: AccountOut
    person: PersonOut
    due_date: Optional[date_type]
    notes: Optional[str]
    total_repaid: float
    remaining: float
    status: Literal["active", "partially_repaid", "settled", "overdue"]
    repayments: list[BorrowingRepaymentOut]


# ---- Dashboard ----------------------------------------------------------


class DashboardSummary(BaseModel):
    month: str  # "YYYY-MM"
    total_expense: float
    transaction_count: int
    average_daily_expense: float
    largest_expense: float