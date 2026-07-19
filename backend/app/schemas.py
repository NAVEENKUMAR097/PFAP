"""
Pydantic schemas — the API's request/response contract.

Kept separate from models.py deliberately: SQLAlchemy models describe how
data is *stored*; Pydantic schemas describe how data is *exchanged* over
the API. Conflating them means every internal DB column is implicitly
part of the public API contract, which becomes a problem the moment they
need to diverge (e.g. exposing a computed field, or hiding an internal id).
"""
from datetime import date as date_type, datetime
from typing import Optional, Literal

from pydantic import BaseModel, Field, ConfigDict, field_validator

class MasterDataCreatePayload(BaseModel):
    """Used by master_data.py's create/update endpoints — both just send {"name": "..."}."""
    name: str = Field(min_length=1, max_length=150)


# ---- Master data (simple read schemas for dropdowns) ----------------------


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class CategoryCreate(BaseModel):
    name: str = Field(..., max_length=100)


class PaymentMethodCreate(BaseModel):
    name: str = Field(..., max_length=100)


class AccountCreate(BaseModel):
    name: str = Field(..., max_length=100)


class IncomeSourceCreate(BaseModel):
    name: str = Field(..., max_length=100)


class InvestmentTypeCreate(BaseModel):
    name: str = Field(..., max_length=100)


class PersonCreate(BaseModel):
    name: str = Field(..., max_length=150)


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


class InvestmentHoldingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    investment_type: InvestmentTypeOut
    broker: Optional[BrokerOut]
    account: AccountOut
    total_invested: float
    transaction_count: int
    first_investment_date: Optional[date_type]
    last_investment_date: Optional[date_type]
    total_units: Optional[float]
    average_cost_per_unit: Optional[float]
    current_value: Optional[float]
    # NOTE: these are DateTime columns on the model (created_at/updated_at
    # carry a real timestamp, not just a date) - typing them as date_type
    # here made every GET /investment-holdings response with a real
    # timestamp fail Pydantic validation (non-midnight time rejected).
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Transaction Templates (for recurring references)
# ---------------------------------------------------------------------------

class ExpenseTemplateCreate(BaseModel):
    name: str = Field(..., max_length=150)
    amount: float = Field(gt=0)
    category_id: int
    subcategory_id: Optional[int] = None
    payment_method_id: int
    account_id: int
    merchant_name: Optional[str] = Field(default=None, max_length=150)
    need_or_want: Optional[Literal["need", "want"]] = None
    notes: Optional[str] = Field(default=None, max_length=500)
    tags: Optional[str] = Field(default=None, max_length=255)

class ExpenseTemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    amount: float
    category: CategoryOut
    subcategory: Optional[SubcategoryOut]
    payment_method: PaymentMethodOut
    account: AccountOut
    merchant_name: Optional[str]
    need_or_want: Optional[str]
    notes: Optional[str]
    tags: Optional[str]
    is_active: bool


class IncomeTemplateCreate(BaseModel):
    name: str = Field(..., max_length=150)
    amount: float = Field(gt=0)
    income_source_id: int
    account_id: int
    notes: Optional[str] = Field(default=None, max_length=500)
    tags: Optional[str] = Field(default=None, max_length=255)

class IncomeTemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    amount: float
    income_source: IncomeSourceOut
    account: AccountOut
    notes: Optional[str]
    tags: Optional[str]
    is_active: bool


# NOTE: There is intentionally no InvestmentTemplateCreate / InvestmentTemplateOut.
# Recurring investments reference an existing InvestmentHolding (InvestmentHoldingOut,
# defined above) instead of a template - see models.RecurringTransaction docstring.


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


# ---- Budget ----------------------------------------------------------


class BudgetCreate(BaseModel):
    """
    One budget = one category's spending limit for one month.
    (category_id, month) is unique at the DB level — creating a second
    budget for the same category+month is rejected with 400, not silently
    overwritten; use PUT to change an existing month's limit instead.
    """

    category_id: int
    month: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$", description='"YYYY-MM"')
    amount: float = Field(gt=0, description="Must be a positive number")


class BudgetOut(BaseModel):
    """
    spent, remaining, utilization_pct, and status are computed at
    read-time (see crud.compute_budget_status) from summing this
    category's expenses in this month — never stored.
    """

    id: int
    category: CategoryOut
    month: str
    amount: float
    spent: float
    remaining: float
    utilization_pct: float
    status: Literal["under", "near", "exceeded"]


# ---- Dashboard ----------------------------------------------------------


class DashboardSummary(BaseModel):
    month: str  # "YYYY-MM"
    total_expense: float
    transaction_count: int
    average_daily_expense: float
    largest_expense: float


# ---- Analytics ----------------------------------------------------------


class AnalyticsKpi(BaseModel):
    id: str
    label: str
    value: float
    helper: str


class AnalyticsMonthlyPoint(BaseModel):
    month: str
    income: float
    expenses: float
    investments: float
    cash_flow: float


class AnalyticsCategorySpend(BaseModel):
    category_id: int
    category_name: str
    amount: float
    percentage: float


class AnalyticsBreakdownItem(BaseModel):
    label: str
    amount: float
    count: int
    percentage: float


class AnalyticsBudgetSignal(BaseModel):
    category_id: int
    category_name: str
    budget_amount: float
    spent: float
    remaining: float
    utilization_pct: float
    status: Literal["under", "near", "exceeded"]


class AnalyticsLoanSummary(BaseModel):
    principal: float
    repaid: float
    outstanding: float
    active_count: int
    overdue_count: int
    settled_count: int
    recovery_pct: float


class AnalyticsCashFlowItem(BaseModel):
    label: str
    amount: float
    direction: Literal["inflow", "outflow", "neutral"]


class AnalyticsHealthFactor(BaseModel):
    label: str
    score: int
    helper: str


class AnalyticsHealthScore(BaseModel):
    score: int
    label: str
    factors: list[AnalyticsHealthFactor]


class AnalyticsInsight(BaseModel):
    severity: Literal["positive", "warning", "neutral"]
    title: str
    detail: str


class AnalyticsSummary(BaseModel):
    month: str
    executive_summary: list[AnalyticsKpi]
    spending_kpis: list[AnalyticsKpi]
    monthly_trend: list[AnalyticsMonthlyPoint]
    category_spend: list[AnalyticsCategorySpend]
    top_merchants: list[AnalyticsBreakdownItem]
    need_want: list[AnalyticsBreakdownItem]
    payment_methods: list[AnalyticsBreakdownItem]
    income_sources: list[AnalyticsBreakdownItem]
    investment_allocation: list[AnalyticsBreakdownItem]
    investment_holdings: list[AnalyticsBreakdownItem]
    budget_signals: list[AnalyticsBudgetSignal]
    lending_summary: AnalyticsLoanSummary
    borrowing_summary: AnalyticsLoanSummary
    cash_flow: list[AnalyticsCashFlowItem]
    health_score: AnalyticsHealthScore
    insights: list[AnalyticsInsight]


# ---------------------------------------------------------------------------
# Recurring Expenses
# ---------------------------------------------------------------------------

class RecurringExpenseCreate(BaseModel):
    name: str
    amount: float
    frequency: Literal["daily", "weekly", "monthly", "yearly"]
    start_date: date_type
    end_date: Optional[date_type] = None
    next_due_date: date_type
    category_id: int
    subcategory_id: Optional[int] = None
    payment_method_id: int
    account_id: int
    merchant_name: Optional[str] = None
    need_or_want: Optional[Literal["need", "want"]] = None
    notes: Optional[str] = None
    tags: Optional[str] = None


class RecurringExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    amount: float
    frequency: str
    start_date: date_type
    end_date: Optional[date_type]
    next_due_date: date_type
    is_active: bool
    merchant_name: Optional[str]
    need_or_want: Optional[str]
    notes: Optional[str]
    tags: Optional[str]
    category: CategoryOut
    subcategory: Optional[SubcategoryOut]
    payment_method: PaymentMethodOut
    account: AccountOut


# ---------------------------------------------------------------------------
# Recurring Transactions (New unified system)
# ---------------------------------------------------------------------------

class RecurringTransactionCreate(BaseModel):
    """
    Unified recurring transaction creation using template/entity references.
    Only one reference field should be populated based on transaction_type.

    account_id: required for expense/income/lending/borrowing. Must be left
    unset (None) for investment - the account is derived from
    investment_holding_id instead, so there's one source of truth for which
    account an investment's money moves through.
    """
    name: str = Field(..., max_length=150)
    amount: float = Field(gt=0, description="Must be a positive number")
    transaction_type: Literal["expense", "income", "investment", "lending", "borrowing"]
    frequency: Literal["daily", "weekly", "monthly", "yearly"]
    start_date: date_type
    end_date: Optional[date_type] = None
    next_due_date: date_type
    account_id: Optional[int] = None
    notes: Optional[str] = Field(default=None, max_length=500)
    tags: Optional[str] = Field(default=None, max_length=255)
    
    # Type-specific reference fields (only one should be populated based on transaction_type)
    expense_template_id: Optional[int] = None
    income_template_id: Optional[int] = None
    investment_holding_id: Optional[int] = None
    lending_id: Optional[int] = None
    borrowing_id: Optional[int] = None


class RecurringTransactionUpdate(BaseModel):
    """
    Update recurring transaction. All fields optional to support partial updates.

    account_id: for investment rules, do not set this directly - set
    investment_holding_id instead, and account_id is kept in sync automatically.
    """
    name: Optional[str] = Field(default=None, max_length=150)
    amount: Optional[float] = Field(default=None, gt=0)
    transaction_type: Optional[Literal["expense", "income", "investment", "lending", "borrowing"]] = None
    status: Optional[Literal["active", "paused", "completed", "cancelled", "failed"]] = None
    frequency: Optional[Literal["daily", "weekly", "monthly", "yearly"]] = None
    start_date: Optional[date_type] = None
    end_date: Optional[date_type] = None
    next_due_date: Optional[date_type] = None
    account_id: Optional[int] = None
    notes: Optional[str] = Field(default=None, max_length=500)
    tags: Optional[str] = Field(default=None, max_length=255)
    
    # Type-specific reference fields (only one should be populated based on transaction_type)
    expense_template_id: Optional[int] = None
    income_template_id: Optional[int] = None
    investment_holding_id: Optional[int] = None
    lending_id: Optional[int] = None
    borrowing_id: Optional[int] = None


class RecurringTransactionOut(BaseModel):
    """
    Output schema with template/entity reference relationships.
    The actual transaction details are retrieved from the referenced template
    (expense/income) or holding (investment).
    """
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    amount: float
    transaction_type: str
    status: str
    frequency: str
    start_date: date_type
    end_date: Optional[date_type]
    next_due_date: date_type
    notes: Optional[str]
    tags: Optional[str]
    created_at: date_type

    @field_validator("created_at", mode="before")
    @classmethod
    def normalize_created_at(cls, value):
        if isinstance(value, datetime):
            return value.date()
        return value
    
    # Common relations
    account: AccountOut
    
    # Type-specific references (only one populated based on transaction_type)
    expense_template: Optional["ExpenseTemplateOut"] = None
    income_template: Optional["IncomeTemplateOut"] = None
    investment_holding: Optional["InvestmentHoldingOut"] = None
    lending_agreement: Optional["LendingOut"] = None
    borrowing_agreement: Optional["BorrowingOut"] = None
    
    generated_transaction_ids: list[int] = Field(default_factory=list)


class RecurringTransactionLogOut(BaseModel):
    """
    Output for log-now endpoint showing the created transaction.
    Type varies based on transaction_type.
    """
    transaction_type: str
    transaction_id: int
    date: date_type
    amount: float
    message: str