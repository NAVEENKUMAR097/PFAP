"""
CRUD layer.

All direct database queries live here, not in routers. This keeps route
handlers focused on HTTP concerns (status codes, request parsing) while
query logic — the part likely to get more complex as Analytics grows —
stays in one place and is reusable/testable independent of FastAPI.
"""
from calendar import monthrange
from datetime import date as date_type

from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models, schemas


def get_or_create_merchant(db: Session, name: str) -> models.Merchant:
    """
    Merchants are free-text from the user's perspective but deduplicated
    in storage (case-insensitive) — "Swiggy" and "swiggy" should be the
    same merchant for reporting purposes ("which merchant receives the
    most money?" only works if names are consolidated).
    """
    existing = (
        db.query(models.Merchant)
        .filter(func.lower(models.Merchant.name) == name.strip().lower())
        .first()
    )
    if existing:
        return existing

    merchant = models.Merchant(name=name.strip())
    db.add(merchant)
    db.flush()  # get merchant.id without committing yet
    return merchant


def create_expense(db: Session, payload: schemas.ExpenseCreate) -> models.Transaction:
    merchant = None
    if payload.merchant_name:
        merchant = get_or_create_merchant(db, payload.merchant_name)

    transaction = models.Transaction(
        transaction_type=models.TransactionType.expense,
        date=payload.date,
        amount=payload.amount,
        account_id=payload.account_id,
        notes=payload.notes,
    )
    db.add(transaction)
    db.flush()  # get transaction.id before creating the linked detail row

    detail = models.ExpenseDetail(
        transaction_id=transaction.id,
        category_id=payload.category_id,
        subcategory_id=payload.subcategory_id,
        merchant_id=merchant.id if merchant else None,
        payment_method_id=payload.payment_method_id,
        need_or_want=payload.need_or_want,
        tags=payload.tags,
    )
    db.add(detail)
    db.commit()
    db.refresh(transaction)
    return transaction


def list_expenses(db: Session, month: str | None = None) -> list[models.Transaction]:
    """
    Returns expense transactions, optionally filtered to a single month
    ("YYYY-MM"). Ordered newest-first — that's what a "recent expenses"
    list on the Expenses page and Dashboard both want by default.
    """
    query = db.query(models.Transaction).filter(
        models.Transaction.transaction_type == models.TransactionType.expense
    )
    if month:
        year, mon = (int(p) for p in month.split("-"))
        start = date_type(year, mon, 1)
        end = date_type(year, mon, monthrange(year, mon)[1])
        query = query.filter(models.Transaction.date.between(start, end))

    return query.order_by(models.Transaction.date.desc(), models.Transaction.id.desc()).all()


def get_dashboard_summary(db: Session, month: str) -> schemas.DashboardSummary:
    expenses = list_expenses(db, month=month)
    total = sum(t.amount for t in expenses)
    count = len(expenses)
    days_in_month = monthrange(int(month.split("-")[0]), int(month.split("-")[1]))[1]

    return schemas.DashboardSummary(
        month=month,
        total_expense=round(total, 2),
        transaction_count=count,
        average_daily_expense=round(total / days_in_month, 2) if days_in_month else 0,
        largest_expense=round(max((t.amount for t in expenses), default=0), 2),
    )