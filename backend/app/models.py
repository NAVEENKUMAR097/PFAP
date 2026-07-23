"""
Core schema — shared-core Transaction pattern.

Architecture: `transactions` holds what every transaction type has in
common (date, amount, account, type). Type-specific attributes live in
their own detail table, 1:1 linked back to transactions. Expenses,
Income, and Investments each have one detail table. Lending and Borrowing
are a bigger shape: an Agreement (person, due date) 1:1 linked to the
initial cash-movement transaction, plus any number of Repayment rows,
each 1:1 linked to its own repayment transaction. Every real cash
movement — lending out, borrowing in, or repaying either — still lands
in `transactions`, so Dashboard/Analytics never needs a special case; it
just sees more transactions.

Budget is the one entity in this file that deliberately does NOT
participate in that pattern — see the Budget class docstring below.
"""
import enum
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Numeric,
    DateTime,
    Date,
    ForeignKey,
    Boolean,
    Enum as SqlEnum,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .database import Base


class TransactionType(str, enum.Enum):
    expense = "expense"
    income = "income"
    investment = "investment"
    transfer = "transfer"
    refund = "refund"
    lending_disbursement = "lending_disbursement"
    lending_repayment = "lending_repayment"
    borrowing_receipt = "borrowing_receipt"
    borrowing_repayment = "borrowing_repayment"


# ---------------------------------------------------------------------------
# Master data — shared across modules (Settings owns these, per PVD scope)
# ---------------------------------------------------------------------------


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    is_active = Column(Boolean, default=True, nullable=False)

    opening_balance = Column(Numeric(12, 2), nullable=False, default=0)   # <-- new

    transactions = relationship("Transaction", back_populates="account")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    is_active = Column(Boolean, default=True, nullable=False)

    subcategories = relationship("Subcategory", back_populates="category")


class Subcategory(Base):
    __tablename__ = "subcategories"

    id = Column(Integer, primary_key=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    category = relationship("Category", back_populates="subcategories")

    __table_args__ = (UniqueConstraint("category_id", "name", name="uq_subcategory_per_category"),)


class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    is_active = Column(Boolean, default=True, nullable=False)


class Merchant(Base):
    __tablename__ = "merchants"

    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False, unique=True)


class IncomeSource(Base):
    """
    Master data for Income, mirroring how Category serves Expenses.
    Seeded with Salary, Freelance, Refund, Interest, Other — "Refund" is
    the specific source used when recording a refund as Income, per the
    approved business rule (refunds are Income with source = 'Refund').
    """

    __tablename__ = "income_sources"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    is_active = Column(Boolean, default=True, nullable=False)


class InvestmentType(Base):
    """
    Master data for Investments, mirroring Category (Expenses) and
    IncomeSource (Income). Seeded with Mutual Fund, Stocks, Fixed Deposit,
    PPF, Gold, Other.
    """

    __tablename__ = "investment_types"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    is_active = Column(Boolean, default=True, nullable=False)


class Broker(Base):
    """
    Free-text-but-deduplicated, same pattern as Merchant (e.g. "Zerodha"
    and "zerodha" should be one row) — kept as its own table rather than
    reusing Merchant, since a "top merchants" Expense report and a
    "which broker holds the most" Investment report are different
    business questions and shouldn't share one dropdown/table.
    """

    __tablename__ = "brokers"

    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False, unique=True)


class InvestmentHolding(Base):
    """
    Represents a current investment position/holding. Multiple investment
    transactions (SIPs, lumpsum, etc.) accumulate into a single holding
    identified by (investment_type, broker, account). This separates
    transaction history from current portfolio state for accurate analytics.
    """
    __tablename__ = "investment_holdings"

    id = Column(Integer, primary_key=True)
    investment_type_id = Column(Integer, ForeignKey("investment_types.id"), nullable=False)
    broker_id = Column(Integer, ForeignKey("brokers.id"), nullable=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)

    # Portfolio state
    total_invested = Column(Numeric(12, 2), default=0, nullable=False)
    transaction_count = Column(Integer, default=0, nullable=False)
    first_investment_date = Column(Date, nullable=True)
    last_investment_date = Column(Date, nullable=True)

    # Optional: for NAV-based investments (mutual funds, stocks)
    total_units = Column(Numeric(12, 4), nullable=True)
    average_cost_per_unit = Column(Numeric(12, 4), nullable=True)
    current_value = Column(Numeric(12, 2), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    investment_type = relationship("InvestmentType")
    broker = relationship("Broker")
    account = relationship("Account")
    transactions = relationship("InvestmentDetail", back_populates="holding")

    __table_args__ = (
        UniqueConstraint("investment_type_id", "broker_id", "account_id", name="uq_investment_holding"),
    )


class Person(Base):
    """
    Free-text-but-deduplicated, same pattern as Merchant/Broker. Shared
    between Lending and Borrowing — the same person can appear in both
    (you lend to them on one occasion, borrow from them on another) as
    two independent agreements.
    """

    __tablename__ = "people"

    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False, unique=True)
    is_active = Column(Boolean, default=True, nullable=False)


class Budget(Base):
    """
    A monthly spending limit for one category. Deliberately NOT linked to
    Transaction — a budget is a plan ("spend at most X on Food this
    month"), not a cash movement, so it doesn't belong in the shared-core
    transactions pattern the way Expense/Income/Investment/Lending/
    Borrowing do. It only *reads* Expense data (to compute spend); it
    never writes to it.

    "Budgets reset monthly while preserving history" (approved business
    rule) is satisfied by the schema itself: (category_id, month) is
    unique, so each month gets its own row — nothing is ever overwritten,
    and every past month's budget stays queryable.

    spent/remaining/utilization_pct/status are computed at read-time
    (see crud.compute_budget_status) from summing that category's
    expenses for the month — never stored, same reasoning as Lending's
    computed status.
    """

    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    month = Column(String(7), nullable=False)  # "YYYY-MM"
    amount = Column(Numeric(12, 2), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    category = relationship("Category")

    __table_args__ = (UniqueConstraint("category_id", "month", name="uq_budget_category_month"),)


# ---------------------------------------------------------------------------
# Transactional core
# ---------------------------------------------------------------------------


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True)
    transaction_type = Column(SqlEnum(TransactionType), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_recurring = Column(Boolean, default=False, nullable=False)
    recurring_transaction_id = Column(Integer, ForeignKey("recurring_transactions.id"), nullable=True)
    execution_date = Column(Date, nullable=True)
    execution_status = Column(String(20), nullable=True)

    account = relationship("Account", back_populates="transactions")
    recurring_transaction = relationship("RecurringTransaction", back_populates="generated_transactions")
    expense_detail = relationship(
        "ExpenseDetail", back_populates="transaction", uselist=False, cascade="all, delete-orphan"
    )
    income_detail = relationship(
        "IncomeDetail", back_populates="transaction", uselist=False, cascade="all, delete-orphan"
    )
    investment_detail = relationship(
        "InvestmentDetail", back_populates="transaction", uselist=False, cascade="all, delete-orphan"
    )
    lending_disbursement_detail = relationship(
        "LendingAgreement", back_populates="transaction", uselist=False, cascade="all, delete-orphan"
    )
    lending_repayment_detail = relationship(
        "LendingRepayment", back_populates="transaction", uselist=False, cascade="all, delete-orphan"
    )
    borrowing_receipt_detail = relationship(
        "BorrowingAgreement", back_populates="transaction", uselist=False, cascade="all, delete-orphan"
    )
    borrowing_repayment_detail = relationship(
        "BorrowingRepayment", back_populates="transaction", uselist=False, cascade="all, delete-orphan"
    )


class ExpenseDetail(Base):
    """
    Expense-specific attributes. 1:1 with a Transaction row where
    transaction_type == 'expense'. Category and Payment Method are
    mandatory per the approved business rules (PVD/Knowledge Base);
    Subcategory, Merchant, Need/Want and Tags are optional.
    """

    __tablename__ = "expense_details"

    id = Column(Integer, primary_key=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False, unique=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    subcategory_id = Column(Integer, ForeignKey("subcategories.id"), nullable=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), nullable=True)
    payment_method_id = Column(Integer, ForeignKey("payment_methods.id"), nullable=False)
    need_or_want = Column(String(10), nullable=True)  # "need" | "want" | null
    tags = Column(String(255), nullable=True)  # comma-separated for V1; own table in V2 if needed

    transaction = relationship("Transaction", back_populates="expense_detail")
    category = relationship("Category")
    subcategory = relationship("Subcategory")
    merchant = relationship("Merchant")
    payment_method = relationship("PaymentMethod")


class IncomeDetail(Base):
    """
    Income-specific attributes. 1:1 with a Transaction row where
    transaction_type == 'income'. Income Source is mandatory — every
    income transaction must say where the money came from (Salary,
    Refund, etc.); Tags is optional, same as Expense.
    """

    __tablename__ = "income_details"

    id = Column(Integer, primary_key=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False, unique=True)
    income_source_id = Column(Integer, ForeignKey("income_sources.id"), nullable=False)
    tags = Column(String(255), nullable=True)

    transaction = relationship("Transaction", back_populates="income_detail")
    income_source = relationship("IncomeSource")


class InvestmentDetail(Base):
    """
    Investment-specific attributes. 1:1 with a Transaction row where
    transaction_type == 'investment'. Investment Type is mandatory;
    Broker and Tags are optional (an FD at a bank, for instance, may not
    have a "broker" in the usual sense).

    Business rule on record (Knowledge Base): investments reduce
    available cash but remain part of Net Worth — that's a Dashboard/
    Analytics-time calculation, not something enforced at this table
    level; noting it here since it's the reason this transaction_type
    exists as distinct from a plain expense.
    """

    __tablename__ = "investment_details"

    id = Column(Integer, primary_key=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False, unique=True)
    investment_type_id = Column(Integer, ForeignKey("investment_types.id"), nullable=False)
    broker_id = Column(Integer, ForeignKey("brokers.id"), nullable=True)
    holding_id = Column(Integer, ForeignKey("investment_holdings.id"), nullable=True)
    tags = Column(String(255), nullable=True)

    transaction = relationship("Transaction", back_populates="investment_detail")
    investment_type = relationship("InvestmentType")
    broker = relationship("Broker")
    holding = relationship("InvestmentHolding", back_populates="transactions")


class LendingAgreement(Base):
    """
    One row per loan you've given out. 1:1 linked to the *disbursement*
    transaction (transaction_type == 'lending_disbursement') — the
    principal amount and the date money left your account both live on
    that linked Transaction, not duplicated here. due_date and notes are
    loan-level attributes that outlive any single cash movement.

    Deliberately has no stored `status` column — see crud.py's
    compute_lending_status(). Status depends on the sum of repayments and
    today's date versus due_date, both of which change independently of
    this row; storing it would require remembering to keep it in sync on
    every repayment add/delete, which is exactly the kind of fragile
    denormalization Project Rule 4 warns against.
    """

    __tablename__ = "lending_agreements"

    id = Column(Integer, primary_key=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False, unique=True)
    person_id = Column(Integer, ForeignKey("people.id"), nullable=False)
    due_date = Column(Date, nullable=True)
    notes = Column(String(500), nullable=True)

    transaction = relationship("Transaction", back_populates="lending_disbursement_detail")
    person = relationship("Person")
    repayments = relationship(
        "LendingRepayment", back_populates="agreement", cascade="all, delete-orphan"
    )


class LendingRepayment(Base):
    """
    One row per partial repayment received against a LendingAgreement.
    1:1 linked to its own transaction (transaction_type ==
    'lending_repayment') — amount, date, and account of the repayment
    all live on that Transaction.
    """

    __tablename__ = "lending_repayments"

    id = Column(Integer, primary_key=True)
    lending_agreement_id = Column(Integer, ForeignKey("lending_agreements.id"), nullable=False)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False, unique=True)

    agreement = relationship("LendingAgreement", back_populates="repayments")
    transaction = relationship("Transaction", back_populates="lending_repayment_detail")


class BorrowingAgreement(Base):
    """
    Mirrors LendingAgreement exactly, direction reversed. One row per
    loan you've received. 1:1 linked to the *receipt* transaction
    (transaction_type == 'borrowing_receipt') — the principal amount and
    the date money came into your account both live on that linked
    Transaction. Same reasoning as LendingAgreement for why there's no
    stored status column: it's computed in crud.compute_borrowing_status.
    """

    __tablename__ = "borrowing_agreements"

    id = Column(Integer, primary_key=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False, unique=True)
    person_id = Column(Integer, ForeignKey("people.id"), nullable=False)
    due_date = Column(Date, nullable=True)
    notes = Column(String(500), nullable=True)

    transaction = relationship("Transaction", back_populates="borrowing_receipt_detail")
    person = relationship("Person")
    repayments = relationship(
        "BorrowingRepayment", back_populates="agreement", cascade="all, delete-orphan"
    )


class BorrowingRepayment(Base):
    """
    One row per partial repayment you've made against a
    BorrowingAgreement. 1:1 linked to its own transaction
    (transaction_type == 'borrowing_repayment') — this is cash leaving
    your account, the mirror image of LendingRepayment (cash arriving).
    """

    __tablename__ = "borrowing_repayments"

    id = Column(Integer, primary_key=True)
    borrowing_agreement_id = Column(Integer, ForeignKey("borrowing_agreements.id"), nullable=False)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False, unique=True)

    agreement = relationship("BorrowingAgreement", back_populates="repayments")
    transaction = relationship("Transaction", back_populates="borrowing_repayment_detail")


# ---------------------------------------------------------------------------
# Recurring Expenses
# ---------------------------------------------------------------------------

class RecurringFrequency(str, enum.Enum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"
    yearly = "yearly"


class RecurringTransactionType(str, enum.Enum):
    expense = "expense"
    income = "income"
    investment = "investment"
    lending = "lending"
    borrowing = "borrowing"


class RecurringStatus(str, enum.Enum):
    active = "active"
    paused = "paused"
    completed = "completed"
    cancelled = "cancelled"
    failed = "failed"


class RecurringExpense(Base):
    __tablename__ = "recurring_expenses"

    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    subcategory_id = Column(Integer, ForeignKey("subcategories.id"), nullable=True)
    payment_method_id = Column(Integer, ForeignKey("payment_methods.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    merchant_name = Column(String(150), nullable=True)
    need_or_want = Column(String(10), nullable=True)
    notes = Column(String(500), nullable=True)
    tags = Column(String(255), nullable=True)
    frequency = Column(SqlEnum(RecurringFrequency), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    next_due_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    category = relationship("Category")
    subcategory = relationship("Subcategory")
    payment_method = relationship("PaymentMethod")
    account = relationship("Account")


class ExpenseTemplate(Base):
    """
    Reusable expense template for recurring transactions.
    Stores common expense details that can be referenced by multiple recurring rules.
    Example: Netflix subscription template with category, merchant, payment method.
    """
    __tablename__ = "expense_templates"

    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    subcategory_id = Column(Integer, ForeignKey("subcategories.id"), nullable=True)
    payment_method_id = Column(Integer, ForeignKey("payment_methods.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    merchant_name = Column(String(150), nullable=True)
    need_or_want = Column(String(10), nullable=True)
    notes = Column(String(500), nullable=True)
    tags = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    category = relationship("Category")
    subcategory = relationship("Subcategory")
    payment_method = relationship("PaymentMethod")
    account = relationship("Account")


class IncomeTemplate(Base):
    """
    Reusable income template for recurring transactions.
    Stores common income details that can be referenced by multiple recurring rules.
    Example: Salary template with income source and account.
    """
    __tablename__ = "income_templates"

    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    income_source_id = Column(Integer, ForeignKey("income_sources.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    notes = Column(String(500), nullable=True)
    tags = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    income_source = relationship("IncomeSource")
    account = relationship("Account")


# NOTE: There is intentionally NO InvestmentTemplate model.
# Unlike Expense/Income, a recurring investment (SIP) does not create a new
# conceptual entity each time it runs - it adds another contribution to an
# EXISTING InvestmentHolding. The holding's (investment_type_id, broker_id,
# account_id) triplet already IS the identity a template would have stored,
# so a separate template table would just duplicate that identity and risk
# drifting out of sync with the real holding. Recurring investments therefore
# reference investment_holding_id directly (see RecurringTransaction below).


class RecurringTransaction(Base):
    """
    Unified recurring transaction engine that references existing business entities.
    This is an automation engine, not a data-entry module. It stores references to
    existing templates/entities and automates transaction creation based on those references.
    
    Supported transaction types:
    - Expense: References an expense template (Netflix, EMI, Insurance premiums)
    - Income: References an income template (Salary, Rent income)
    - Investment: References an EXISTING investment holding (Monthly SIPs).
      There is no investment template - execution adds a contribution to the
      referenced holding rather than creating a new investment.
    - Lending: References an EXISTING lending agreement (Recurring installment
      repayments received). Execution adds a LendingRepayment against that
      agreement rather than creating a new loan.
    - Borrowing: References an EXISTING borrowing agreement (Recurring
      installment repayments made). Execution adds a BorrowingRepayment
      against that agreement rather than creating a new loan.
    
    Only one reference field is populated based on transaction_type.
    Lifecycle: Active → Paused/Completed/Cancelled/Failed

    account_id: for expense/income this is user-supplied. For investment,
    lending, and borrowing it is NOT user-supplied - it is always derived
    from and kept in sync with the referenced holding/agreement's account,
    so there is a single source of truth for which account the money moves
    through.
    """
    __tablename__ = "recurring_transactions"

    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    transaction_type = Column(SqlEnum(RecurringTransactionType), nullable=False, index=True)
    status = Column(SqlEnum(RecurringStatus), default=RecurringStatus.active, nullable=False, index=True)
    
    # Common fields for all transaction types
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    frequency = Column(SqlEnum(RecurringFrequency), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    next_due_date = Column(Date, nullable=False, index=True)
    notes = Column(String(500), nullable=True)
    tags = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Type-specific reference fields (only one is populated based on transaction_type)
    # References to existing business entities/templates
    expense_template_id = Column(Integer, ForeignKey("expense_templates.id"), nullable=True)
    income_template_id = Column(Integer, ForeignKey("income_templates.id"), nullable=True)
    investment_holding_id = Column(Integer, ForeignKey("investment_holdings.id"), nullable=True)
    lending_id = Column(Integer, ForeignKey("lending_agreements.id"), nullable=True)
    borrowing_id = Column(Integer, ForeignKey("borrowing_agreements.id"), nullable=True)
    
    account = relationship("Account")
    expense_template = relationship("ExpenseTemplate")
    income_template = relationship("IncomeTemplate")
    investment_holding = relationship("InvestmentHolding")
    lending_agreement = relationship("LendingAgreement")
    borrowing_agreement = relationship("BorrowingAgreement")
    generated_transactions = relationship(
        "Transaction",
        back_populates="recurring_transaction",
        foreign_keys="Transaction.recurring_transaction_id",
    )