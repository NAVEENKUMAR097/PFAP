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
"""
import enum
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
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


# ---------------------------------------------------------------------------
# Transactional core
# ---------------------------------------------------------------------------


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True)
    transaction_type = Column(SqlEnum(TransactionType), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    account = relationship("Account", back_populates="transactions")
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
    tags = Column(String(255), nullable=True)

    transaction = relationship("Transaction", back_populates="investment_detail")
    investment_type = relationship("InvestmentType")
    broker = relationship("Broker")


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