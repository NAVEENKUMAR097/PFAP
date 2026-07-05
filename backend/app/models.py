"""
Core schema — shared-core Transaction pattern.

Architecture: `transactions` holds what every transaction type has in
common (date, amount, account, type). Type-specific attributes live in
their own detail table, 1:1 linked back to transactions (`expense_details`
today; `income_details` / `investment_details` follow the same pattern
when those modules are built). This keeps Dashboard/Analytics queries
simple (aggregate over `transactions` alone) while every column still has
a single clear purpose — no nullable "only used if type=X" columns, per
Project Rule 4.
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