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


def get_or_create_broker(db: Session, name: str) -> models.Broker:
    """Same dedup pattern as get_or_create_merchant, for Investments."""
    existing = (
        db.query(models.Broker)
        .filter(func.lower(models.Broker.name) == name.strip().lower())
        .first()
    )
    if existing:
        return existing

    broker = models.Broker(name=name.strip())
    db.add(broker)
    db.flush()
    return broker


def get_or_create_person(db: Session, name: str) -> models.Person:
    """Same dedup pattern as get_or_create_merchant/broker, for Lending/Borrowing."""
    existing = (
        db.query(models.Person)
        .filter(func.lower(models.Person.name) == name.strip().lower())
        .first()
    )
    if existing:
        return existing

    person = models.Person(name=name.strip())
    db.add(person)
    db.flush()
    return person


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

# ---------------------------------------------------------------------------
# Single Expense
# ---------------------------------------------------------------------------

def get_expense(db: Session, expense_id: int) -> models.Transaction | None:
    """
    Returns a single expense transaction.

    Used by:
        - GET /expenses/{id}
        - PUT /expenses/{id}
        - DELETE /expenses/{id}
    """

    return (
        db.query(models.Transaction)
        .filter(
            models.Transaction.id == expense_id,
            models.Transaction.transaction_type == models.TransactionType.expense,
        )
        .first()
    )


# ---------------------------------------------------------------------------
# Update Expense
# ---------------------------------------------------------------------------

def update_expense(
    db: Session,
    transaction: models.Transaction,
    payload: schemas.ExpenseCreate,
) -> models.Transaction:

    merchant = None

    if payload.merchant_name:
        merchant = get_or_create_merchant(db, payload.merchant_name)

    transaction.date = payload.date
    transaction.amount = payload.amount
    transaction.account_id = payload.account_id
    transaction.notes = payload.notes

    detail = transaction.expense_detail

    detail.category_id = payload.category_id
    detail.subcategory_id = payload.subcategory_id
    detail.payment_method_id = payload.payment_method_id
    detail.need_or_want = payload.need_or_want
    detail.tags = payload.tags
    detail.merchant_id = merchant.id if merchant else None

    db.commit()
    db.refresh(transaction)

    return transaction


# ---------------------------------------------------------------------------
# Delete Expense
# ---------------------------------------------------------------------------

def delete_expense(
    db: Session,
    transaction: models.Transaction,
) -> None:

    db.delete(transaction)

    db.commit()


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


# ---------------------------------------------------------------------------
# Create Income
# ---------------------------------------------------------------------------

def create_income(db: Session, payload: schemas.IncomeCreate) -> models.Transaction:
    transaction = models.Transaction(
        transaction_type=models.TransactionType.income,
        date=payload.date,
        amount=payload.amount,
        account_id=payload.account_id,
        notes=payload.notes,
    )
    db.add(transaction)
    db.flush()  # get transaction.id before creating the linked detail row

    detail = models.IncomeDetail(
        transaction_id=transaction.id,
        income_source_id=payload.income_source_id,
        tags=payload.tags,
    )
    db.add(detail)
    db.commit()
    db.refresh(transaction)
    return transaction


# ---------------------------------------------------------------------------
# Read Incomes
# ---------------------------------------------------------------------------

def list_incomes(db: Session, month: str | None = None) -> list[models.Transaction]:
    """
    Mirrors list_expenses exactly — same month-filter shape, same
    newest-first ordering, so the Income and Expenses pages behave
    identically from the user's perspective.
    """
    query = db.query(models.Transaction).filter(
        models.Transaction.transaction_type == models.TransactionType.income
    )
    if month:
        year, mon = (int(p) for p in month.split("-"))
        start = date_type(year, mon, 1)
        end = date_type(year, mon, monthrange(year, mon)[1])
        query = query.filter(models.Transaction.date.between(start, end))

    return query.order_by(models.Transaction.date.desc(), models.Transaction.id.desc()).all()


# ---------------------------------------------------------------------------
# Single Income
# ---------------------------------------------------------------------------

def get_income(db: Session, income_id: int) -> models.Transaction | None:
    """
    Used by:
        - GET /income/{id}
        - PUT /income/{id}
        - DELETE /income/{id}
    """

    return (
        db.query(models.Transaction)
        .filter(
            models.Transaction.id == income_id,
            models.Transaction.transaction_type == models.TransactionType.income,
        )
        .first()
    )


# ---------------------------------------------------------------------------
# Update Income
# ---------------------------------------------------------------------------

def update_income(
    db: Session,
    transaction: models.Transaction,
    payload: schemas.IncomeCreate,
) -> models.Transaction:

    transaction.date = payload.date
    transaction.amount = payload.amount
    transaction.account_id = payload.account_id
    transaction.notes = payload.notes

    detail = transaction.income_detail

    detail.income_source_id = payload.income_source_id
    detail.tags = payload.tags

    db.commit()
    db.refresh(transaction)

    return transaction


# ---------------------------------------------------------------------------
# Delete Income
# ---------------------------------------------------------------------------

def delete_income(
    db: Session,
    transaction: models.Transaction,
) -> None:

    db.delete(transaction)

    db.commit()


# ---------------------------------------------------------------------------
# Create Investment
# ---------------------------------------------------------------------------

def create_investment(db: Session, payload: schemas.InvestmentCreate) -> models.Transaction:
    broker = None
    if payload.broker_name:
        broker = get_or_create_broker(db, payload.broker_name)

    transaction = models.Transaction(
        transaction_type=models.TransactionType.investment,
        date=payload.date,
        amount=payload.amount,
        account_id=payload.account_id,
        notes=payload.notes,
    )
    db.add(transaction)
    db.flush()  # get transaction.id before creating the linked detail row

    detail = models.InvestmentDetail(
        transaction_id=transaction.id,
        investment_type_id=payload.investment_type_id,
        broker_id=broker.id if broker else None,
        tags=payload.tags,
    )
    db.add(detail)
    db.commit()
    db.refresh(transaction)
    return transaction


# ---------------------------------------------------------------------------
# Read Investments
# ---------------------------------------------------------------------------

def list_investments(db: Session, month: str | None = None) -> list[models.Transaction]:
    """Mirrors list_expenses / list_incomes exactly."""
    query = db.query(models.Transaction).filter(
        models.Transaction.transaction_type == models.TransactionType.investment
    )
    if month:
        year, mon = (int(p) for p in month.split("-"))
        start = date_type(year, mon, 1)
        end = date_type(year, mon, monthrange(year, mon)[1])
        query = query.filter(models.Transaction.date.between(start, end))

    return query.order_by(models.Transaction.date.desc(), models.Transaction.id.desc()).all()


# ---------------------------------------------------------------------------
# Single Investment
# ---------------------------------------------------------------------------

def get_investment(db: Session, investment_id: int) -> models.Transaction | None:
    """
    Used by:
        - GET /investments/{id}
        - PUT /investments/{id}
        - DELETE /investments/{id}
    """

    return (
        db.query(models.Transaction)
        .filter(
            models.Transaction.id == investment_id,
            models.Transaction.transaction_type == models.TransactionType.investment,
        )
        .first()
    )


# ---------------------------------------------------------------------------
# Update Investment
# ---------------------------------------------------------------------------

def update_investment(
    db: Session,
    transaction: models.Transaction,
    payload: schemas.InvestmentCreate,
) -> models.Transaction:

    broker = None
    if payload.broker_name:
        broker = get_or_create_broker(db, payload.broker_name)

    transaction.date = payload.date
    transaction.amount = payload.amount
    transaction.account_id = payload.account_id
    transaction.notes = payload.notes

    detail = transaction.investment_detail

    detail.investment_type_id = payload.investment_type_id
    detail.tags = payload.tags
    detail.broker_id = broker.id if broker else None

    db.commit()
    db.refresh(transaction)

    return transaction


# ---------------------------------------------------------------------------
# Delete Investment
# ---------------------------------------------------------------------------

def delete_investment(
    db: Session,
    transaction: models.Transaction,
) -> None:

    db.delete(transaction)

    db.commit()


# ---------------------------------------------------------------------------
# Lending — status computation (never stored, always derived)
# ---------------------------------------------------------------------------

def compute_lending_status(agreement: models.LendingAgreement, today: date_type) -> dict:
    principal = agreement.transaction.amount
    total_repaid = sum(r.transaction.amount for r in agreement.repayments)
    remaining = round(principal - total_repaid, 2)

    if remaining <= 0:
        status = "settled"
    elif agreement.due_date is not None and agreement.due_date < today and remaining > 0:
        status = "overdue"
    elif total_repaid > 0:
        status = "partially_repaid"
    else:
        status = "active"

    return {
        "total_repaid": round(total_repaid, 2),
        "remaining": remaining,
        "status": status,
    }


# ---------------------------------------------------------------------------
# Create Lending
# ---------------------------------------------------------------------------

def create_lending(db: Session, payload: schemas.LendingCreate) -> models.LendingAgreement:
    person = get_or_create_person(db, payload.person_name)

    transaction = models.Transaction(
        transaction_type=models.TransactionType.lending_disbursement,
        date=payload.date,
        amount=payload.amount,
        account_id=payload.account_id,
        notes=None,
    )
    db.add(transaction)
    db.flush()  # get transaction.id before creating the linked agreement row

    agreement = models.LendingAgreement(
        transaction_id=transaction.id,
        person_id=person.id,
        due_date=payload.due_date,
        notes=payload.notes,
    )
    db.add(agreement)
    db.commit()
    db.refresh(agreement)
    return agreement


# ---------------------------------------------------------------------------
# Read Lendings
# ---------------------------------------------------------------------------

def list_lendings(db: Session) -> list[models.LendingAgreement]:
    return db.query(models.LendingAgreement).order_by(models.LendingAgreement.id.desc()).all()


# ---------------------------------------------------------------------------
# Single Lending
# ---------------------------------------------------------------------------

def get_lending(db: Session, lending_id: int) -> models.LendingAgreement | None:
    """
    Used by:
        - GET /lending/{id}
        - PUT /lending/{id}
        - DELETE /lending/{id}
        - POST /lending/{id}/repayments
        - DELETE /lending/{id}/repayments/{repayment_id}
    """
    return (
        db.query(models.LendingAgreement)
        .filter(models.LendingAgreement.id == lending_id)
        .first()
    )


# ---------------------------------------------------------------------------
# Update Lending
# ---------------------------------------------------------------------------

def update_lending(
    db: Session,
    agreement: models.LendingAgreement,
    payload: schemas.LendingCreate,
) -> models.LendingAgreement:

    person = get_or_create_person(db, payload.person_name)

    agreement.transaction.date = payload.date
    agreement.transaction.amount = payload.amount
    agreement.transaction.account_id = payload.account_id

    agreement.person_id = person.id
    agreement.due_date = payload.due_date
    agreement.notes = payload.notes

    db.commit()
    db.refresh(agreement)

    return agreement


# ---------------------------------------------------------------------------
# Delete Lending
# ---------------------------------------------------------------------------

def delete_lending(db: Session, agreement: models.LendingAgreement) -> None:
    """
    Deletes every repayment's underlying Transaction first (which cascades
    to remove each LendingRepayment row via the Transaction-side cascade),
    then deletes the disbursement Transaction (which cascades to remove
    the LendingAgreement itself). Deleting agreement.repayments directly
    would remove the junction rows but orphan their Transaction rows —
    the actual cash-movement records — which must not be left behind.
    """
    for repayment in list(agreement.repayments):
        db.delete(repayment.transaction)

    db.delete(agreement.transaction)
    db.commit()


# ---------------------------------------------------------------------------
# Add Lending Repayment
# ---------------------------------------------------------------------------

def add_lending_repayment(
    db: Session,
    agreement: models.LendingAgreement,
    payload: schemas.LendingRepaymentCreate,
) -> models.LendingRepayment:

    transaction = models.Transaction(
        transaction_type=models.TransactionType.lending_repayment,
        date=payload.date,
        amount=payload.amount,
        account_id=payload.account_id,
        notes=payload.notes,
    )
    db.add(transaction)
    db.flush()

    repayment = models.LendingRepayment(
        lending_agreement_id=agreement.id,
        transaction_id=transaction.id,
    )
    db.add(repayment)
    db.commit()
    db.refresh(repayment)
    return repayment


# ---------------------------------------------------------------------------
# Delete Lending Repayment
# ---------------------------------------------------------------------------

def delete_lending_repayment(db: Session, repayment: models.LendingRepayment) -> None:
    """Deleting the Transaction cascades to remove the LendingRepayment row too."""
    db.delete(repayment.transaction)
    db.commit()


def get_lending_repayment(
    db: Session, agreement: models.LendingAgreement, repayment_id: int
) -> models.LendingRepayment | None:
    return (
        db.query(models.LendingRepayment)
        .filter(
            models.LendingRepayment.id == repayment_id,
            models.LendingRepayment.lending_agreement_id == agreement.id,
        )
        .first()
    )


# ---------------------------------------------------------------------------
# Borrowing — status computation (never stored, always derived)
# ---------------------------------------------------------------------------

def compute_borrowing_status(agreement: models.BorrowingAgreement, today: date_type) -> dict:
    """Mirrors compute_lending_status exactly."""
    principal = agreement.transaction.amount
    total_repaid = sum(r.transaction.amount for r in agreement.repayments)
    remaining = round(principal - total_repaid, 2)

    if remaining <= 0:
        status = "settled"
    elif agreement.due_date is not None and agreement.due_date < today and remaining > 0:
        status = "overdue"
    elif total_repaid > 0:
        status = "partially_repaid"
    else:
        status = "active"

    return {
        "total_repaid": round(total_repaid, 2),
        "remaining": remaining,
        "status": status,
    }


# ---------------------------------------------------------------------------
# Create Borrowing
# ---------------------------------------------------------------------------

def create_borrowing(db: Session, payload: schemas.BorrowingCreate) -> models.BorrowingAgreement:
    person = get_or_create_person(db, payload.person_name)

    transaction = models.Transaction(
        transaction_type=models.TransactionType.borrowing_receipt,
        date=payload.date,
        amount=payload.amount,
        account_id=payload.account_id,
        notes=None,
    )
    db.add(transaction)
    db.flush()

    agreement = models.BorrowingAgreement(
        transaction_id=transaction.id,
        person_id=person.id,
        due_date=payload.due_date,
        notes=payload.notes,
    )
    db.add(agreement)
    db.commit()
    db.refresh(agreement)
    return agreement


# ---------------------------------------------------------------------------
# Read Borrowings
# ---------------------------------------------------------------------------

def list_borrowings(db: Session) -> list[models.BorrowingAgreement]:
    return db.query(models.BorrowingAgreement).order_by(models.BorrowingAgreement.id.desc()).all()


# ---------------------------------------------------------------------------
# Single Borrowing
# ---------------------------------------------------------------------------

def get_borrowing(db: Session, borrowing_id: int) -> models.BorrowingAgreement | None:
    """
    Used by:
        - GET /borrowing/{id}
        - PUT /borrowing/{id}
        - DELETE /borrowing/{id}
        - POST /borrowing/{id}/repayments
        - DELETE /borrowing/{id}/repayments/{repayment_id}
    """
    return (
        db.query(models.BorrowingAgreement)
        .filter(models.BorrowingAgreement.id == borrowing_id)
        .first()
    )


# ---------------------------------------------------------------------------
# Update Borrowing
# ---------------------------------------------------------------------------

def update_borrowing(
    db: Session,
    agreement: models.BorrowingAgreement,
    payload: schemas.BorrowingCreate,
) -> models.BorrowingAgreement:

    person = get_or_create_person(db, payload.person_name)

    agreement.transaction.date = payload.date
    agreement.transaction.amount = payload.amount
    agreement.transaction.account_id = payload.account_id

    agreement.person_id = person.id
    agreement.due_date = payload.due_date
    agreement.notes = payload.notes

    db.commit()
    db.refresh(agreement)

    return agreement


# ---------------------------------------------------------------------------
# Delete Borrowing
# ---------------------------------------------------------------------------

def delete_borrowing(db: Session, agreement: models.BorrowingAgreement) -> None:
    """Mirrors delete_lending exactly — see that function's docstring."""
    for repayment in list(agreement.repayments):
        db.delete(repayment.transaction)

    db.delete(agreement.transaction)
    db.commit()


# ---------------------------------------------------------------------------
# Add Borrowing Repayment
# ---------------------------------------------------------------------------

def add_borrowing_repayment(
    db: Session,
    agreement: models.BorrowingAgreement,
    payload: schemas.BorrowingRepaymentCreate,
) -> models.BorrowingRepayment:

    transaction = models.Transaction(
        transaction_type=models.TransactionType.borrowing_repayment,
        date=payload.date,
        amount=payload.amount,
        account_id=payload.account_id,
        notes=payload.notes,
    )
    db.add(transaction)
    db.flush()

    repayment = models.BorrowingRepayment(
        borrowing_agreement_id=agreement.id,
        transaction_id=transaction.id,
    )
    db.add(repayment)
    db.commit()
    db.refresh(repayment)
    return repayment


# ---------------------------------------------------------------------------
# Delete Borrowing Repayment
# ---------------------------------------------------------------------------

def delete_borrowing_repayment(db: Session, repayment: models.BorrowingRepayment) -> None:
    db.delete(repayment.transaction)
    db.commit()


def get_borrowing_repayment(
    db: Session, agreement: models.BorrowingAgreement, repayment_id: int
) -> models.BorrowingRepayment | None:
    return (
        db.query(models.BorrowingRepayment)
        .filter(
            models.BorrowingRepayment.id == repayment_id,
            models.BorrowingRepayment.borrowing_agreement_id == agreement.id,
        )
        .first()
    )