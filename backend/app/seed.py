"""
Seed data — runs once at startup (idempotent: checks before inserting).

Without this, a fresh database has no categories/payment methods/account/
income sources/investment types to select from, and the "Add" forms are
unusable on first run. These are sensible V1 defaults; all of them are
editable/deletable later through Settings (deletion blocked only if
referenced, per the approved business rule).
"""
from sqlalchemy.orm import Session

from . import models

DEFAULT_CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Health", "Other"]
DEFAULT_PAYMENT_METHODS = ["Cash", "UPI", "Debit Card", "Credit Card"]
DEFAULT_ACCOUNT = "Primary"
DEFAULT_INCOME_SOURCES = ["Salary", "Freelance", "Refund", "Interest", "Other"]
DEFAULT_INVESTMENT_TYPES = ["Mutual Fund", "Stocks", "Fixed Deposit", "PPF", "Gold", "Other"]


def run_seed(db: Session) -> None:
    if db.query(models.Category).count() == 0:
        db.add_all(models.Category(name=name) for name in DEFAULT_CATEGORIES)

    if db.query(models.PaymentMethod).count() == 0:
        db.add_all(models.PaymentMethod(name=name) for name in DEFAULT_PAYMENT_METHODS)

    if db.query(models.Account).count() == 0:
        db.add(models.Account(name=DEFAULT_ACCOUNT))

    if db.query(models.IncomeSource).count() == 0:
        db.add_all(models.IncomeSource(name=name) for name in DEFAULT_INCOME_SOURCES)

    if db.query(models.InvestmentType).count() == 0:
        db.add_all(models.InvestmentType(name=name) for name in DEFAULT_INVESTMENT_TYPES)

    db.commit()