"""
CRUD layer.

All direct database queries live here, not in routers. This keeps route
handlers focused on HTTP concerns (status codes, request parsing) while
query logic — the part likely to get more complex as Analytics grows —
stays in one place and is reusable/testable independent of FastAPI.
"""
from calendar import monthrange
from datetime import date as date_type, datetime
from typing import Optional

from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models, schemas

import logging

logger = logging.getLogger(__name__)


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


def _month_bounds(month: str) -> tuple[date_type, date_type]:
    year, mon = (int(p) for p in month.split("-"))
    return date_type(year, mon, 1), date_type(year, mon, monthrange(year, mon)[1])


def _shift_month(month: str, offset: int) -> str:
    year, mon = (int(p) for p in month.split("-"))
    zero_based = (year * 12 + mon - 1) + offset
    shifted_year = zero_based // 12
    shifted_month = zero_based % 12 + 1
    return f"{shifted_year:04d}-{shifted_month:02d}"


def _sum_transactions(
    db: Session,
    transaction_type: models.TransactionType,
    month: str,
) -> float:
    start, end = _month_bounds(month)
    total = (
        db.query(func.sum(models.Transaction.amount))
        .filter(
            models.Transaction.transaction_type == transaction_type,
            models.Transaction.date.between(start, end),
        )
        .scalar()
    )
    return round(total or Decimal("0.00"), 2)


def _format_need_want_label(value: str | None) -> str:
    return {
        "need": "Need",
        "want": "Want",
    }.get(value, "Unclassified")


def _build_loan_summary(
    agreements: list[models.LendingAgreement] | list[models.BorrowingAgreement],
    compute_status,
) -> schemas.AnalyticsLoanSummary:
    principal = round(
      sum((agreement.transaction.amount for agreement in agreements), Decimal("0.00")), 2
  )
    repaid = round(
      sum(
          (sum((r.transaction.amount for r in agreement.repayments), Decimal("0.00"))
           for agreement in agreements),
          Decimal("0.00"),
      ),
      2,
  )
    outstanding = round(principal - repaid, 2)
    active_count = 0
    overdue_count = 0
    settled_count = 0

    for agreement in agreements:
        status = compute_status(agreement, date_type.today())["status"]
        if status == "settled":
            settled_count += 1
        elif status == "overdue":
            overdue_count += 1
        else:
            active_count += 1

    recovery_pct = round((repaid / principal) * 100, 1) if principal > 0 else 0.0
    return schemas.AnalyticsLoanSummary(
        principal=principal,
        repaid=repaid,
        outstanding=outstanding,
        active_count=active_count,
        overdue_count=overdue_count,
        settled_count=settled_count,
        recovery_pct=recovery_pct,
    )


def _compute_health_score(
    savings_rate: float,
    budget_utilization: float,
    overdue_loans: int,
) -> schemas.AnalyticsHealthScore:
    savings_factor = round(max(0.0, min(40.0, savings_rate * 0.4)))
    budget_factor = 30 if budget_utilization == 0 else round(max(0.0, (100.0 - min(budget_utilization, 100.0)) * 0.3))
    loan_factor = 30 if overdue_loans == 0 else 15 if overdue_loans == 1 else 5
    score = min(100, savings_factor + budget_factor + loan_factor)

    if score >= 80:
        label = "Healthy"
    elif score >= 60:
        label = "Stable"
    elif score >= 40:
        label = "Needs attention"
    else:
        label = "At risk"

    return schemas.AnalyticsHealthScore(
        score=score,
        label=label,
        factors=[
            schemas.AnalyticsHealthFactor(
                label="Savings rate",
                score=savings_factor,
                helper="Higher savings improve monthly resilience.",
            ),
            schemas.AnalyticsHealthFactor(
                label="Budget discipline",
                score=budget_factor,
                helper="Spending under budget strengthens control.",
            ),
            schemas.AnalyticsHealthFactor(
                label="Loan health",
                score=loan_factor,
                helper="On-time loan management reduces risk.",
            ),
        ],
    )


def _build_analytics_insights(
    monthly_income: float,
    monthly_expense: float,
    monthly_investment: float,
    total_budget_spent: float,
    budget_utilization: float,
    lending_summary: schemas.AnalyticsLoanSummary,
    borrowing_summary: schemas.AnalyticsLoanSummary,
    top_merchant_share: float,
) -> list[schemas.AnalyticsInsight]:
    insights: list[schemas.AnalyticsInsight] = []
    net_flow = round(monthly_income - monthly_expense - monthly_investment, 2)

    if net_flow < 0:
        insights.append(
            schemas.AnalyticsInsight(
                severity="warning",
                title="Cash flow is negative",
                detail="Your spending and investments exceeded income this month. Review top categories or income opportunities.",
            )
        )

    if budget_utilization > 100:
        insights.append(
            schemas.AnalyticsInsight(
                severity="warning",
                title="Budget exceeded",
                detail="One or more budgets are over their limit. Trim spending or adjust the next month’s plan.",
            )
        )

    if lending_summary.overdue_count > 0:
        insights.append(
            schemas.AnalyticsInsight(
                severity="warning",
                title="Lending overdue",
                detail=f"{lending_summary.overdue_count} loan(s) you gave are past due. Follow up with borrowers before balances grow.",
            )
        )

    if borrowing_summary.overdue_count > 0:
        insights.append(
            schemas.AnalyticsInsight(
                severity="warning",
                title="Borrowing overdue",
                detail=f"{borrowing_summary.overdue_count} loan(s) you owe are past due. Prioritize repayments to avoid missed deadlines.",
            )
        )

    if top_merchant_share >= 35:
        insights.append(
            schemas.AnalyticsInsight(
                severity="warning",
                title="Spending concentration",
                detail="Your top merchant accounts for a large share of expenses. Diversify vendors or review recurring costs.",
            )
        )

    if not insights:
        insights.append(
            schemas.AnalyticsInsight(
                severity="positive",
                title="Good momentum",
                detail="Income, budgets, and loan status are in balance this month. Keep monitoring category spend and cash flow.",
            )
        )

    return insights


def get_analytics_summary(db: Session, month: str) -> schemas.AnalyticsSummary:
    """
    Read-only analytics assembled from source transactions and budget rows.
    No metrics are stored, which keeps Analytics aligned with the project's
    computed-value rule: source data is the truth, reports are derived.
    """
    monthly_income = _sum_transactions(db, models.TransactionType.income, month)
    monthly_expense = _sum_transactions(db, models.TransactionType.expense, month)
    monthly_investment = _sum_transactions(db, models.TransactionType.investment, month)
    savings = round(monthly_income - monthly_expense - monthly_investment, 2)
    savings_rate = float(round((savings / monthly_income) * 100, 1)) if monthly_income > 0 else 0.0

    lending_summary = _build_loan_summary(list_lendings(db), compute_lending_status)
    borrowing_summary = _build_loan_summary(list_borrowings(db), compute_borrowing_status)

    budgets = list_budgets(db, month)
    total_budget = round(sum(b.amount for b in budgets), 2)
    total_budget_spent = round(sum(get_category_spend(db, b.category_id, month) for b in budgets), 2)
    budget_utilization = (
      float(round((total_budget_spent / total_budget) * 100, 1)) if total_budget > 0 else 0.0
    )

    budget_signals = [
        schemas.AnalyticsBudgetSignal(
            category_id=b.category_id,
            category_name=b.category.name if getattr(b, "category", None) is not None else "Unknown",
            budget_amount=round(b.amount, 2),
            spent=spent,
            remaining=round(b.amount - spent, 2),
            utilization_pct=round((spent / b.amount) * 100, 1) if b.amount > 0 else 0.0,
            status=compute_budget_status(b.amount, spent)["status"],
        )
        for b in budgets
        for spent in [get_category_spend(db, b.category_id, month)]
    ]

    # This is not full net worth: PFAP does not yet track opening balances
    # or asset market values. It is the net position visible from recorded
    # V1 transactions and loan balances.
    
    tracked_position = round(
        monthly_income
        - monthly_expense
        + monthly_investment
        + lending_summary.outstanding
        - borrowing_summary.outstanding,
        2,
    )

    start, end = _month_bounds(month)
    trend: list[schemas.AnalyticsMonthlyPoint] = []
    for offset in range(-5, 1):
        trend_month = _shift_month(month, offset)
        income = _sum_transactions(db, models.TransactionType.income, trend_month)
        expenses = _sum_transactions(db, models.TransactionType.expense, trend_month)
        investments = _sum_transactions(db, models.TransactionType.investment, trend_month)
        trend.append(
            schemas.AnalyticsMonthlyPoint(
                month=trend_month,
                income=income,
                expenses=expenses,
                investments=investments,
                cash_flow=round(income - expenses - investments, 2),
            )
        )

    category_rows = (
        db.query(
            models.Category.id,
            models.Category.name,
            func.sum(models.Transaction.amount),
        )
        .join(models.ExpenseDetail, models.ExpenseDetail.category_id == models.Category.id)
        .join(models.Transaction, models.Transaction.id == models.ExpenseDetail.transaction_id)
        .filter(
            models.Transaction.transaction_type == models.TransactionType.expense,
            models.Transaction.date.between(start, end),
        )
        .group_by(models.Category.id, models.Category.name)
        .order_by(func.sum(models.Transaction.amount).desc())
        .all()
    )
    category_total = sum((row[2] or Decimal("0") for row in category_rows), Decimal("0"))
    category_spend = [
        schemas.AnalyticsCategorySpend(
            category_id=row[0],
            category_name=row[1],
            amount=round((row[2] or 0), 2),
            percentage=round(((row[2] or 0) / category_total) * 100, 1)
            if category_total > 0
            else 0.0,
        )
        for row in category_rows
    ]

    top_merchant_rows = (
        db.query(
            models.Merchant.id,
            models.Merchant.name,
            func.sum(models.Transaction.amount),
            func.count(models.Transaction.id),
        )
        .join(models.ExpenseDetail, models.ExpenseDetail.merchant_id == models.Merchant.id)
        .join(models.Transaction, models.Transaction.id == models.ExpenseDetail.transaction_id)
        .filter(
            models.Transaction.transaction_type == models.TransactionType.expense,
            models.Transaction.date.between(start, end),
        )
        .group_by(models.Merchant.id, models.Merchant.name)
        .order_by(func.sum(models.Transaction.amount).desc())
        .limit(5)
        .all()
    )
    top_merchants = [
        schemas.AnalyticsBreakdownItem(
            label=row[1],
            amount=round((row[2] or 0), 2),
            count=int(row[3] or 0),
            percentage=round(((row[2] or 0) / monthly_expense) * 100, 1)
            if monthly_expense > 0
            else 0.0,
        )
        for row in top_merchant_rows
    ]
    top_merchant_share = top_merchants[0].percentage if top_merchants else 0.0

    need_want_rows = (
        db.query(
            models.ExpenseDetail.need_or_want,
            func.sum(models.Transaction.amount),
            func.count(models.Transaction.id),
        )
        .join(models.Transaction, models.Transaction.id == models.ExpenseDetail.transaction_id)
        .filter(
            models.Transaction.transaction_type == models.TransactionType.expense,
            models.Transaction.date.between(start, end),
        )
        .group_by(models.ExpenseDetail.need_or_want)
        .all()
    )
    need_want = [
        schemas.AnalyticsBreakdownItem(
            label=_format_need_want_label(row[0]),
            amount=round((row[1] or 0), 2),
            count=int(row[2] or 0),
            percentage=round(((row[1] or 0) / category_total) * 100, 1)
            if category_total > 0
            else 0.0,
        )
        for row in need_want_rows
    ]

    payment_method_rows = (
        db.query(
            models.PaymentMethod.id,
            models.PaymentMethod.name,
            func.sum(models.Transaction.amount),
            func.count(models.Transaction.id),
        )
        .join(models.ExpenseDetail, models.ExpenseDetail.payment_method_id == models.PaymentMethod.id)
        .join(models.Transaction, models.Transaction.id == models.ExpenseDetail.transaction_id)
        .filter(
            models.Transaction.transaction_type == models.TransactionType.expense,
            models.Transaction.date.between(start, end),
        )
        .group_by(models.PaymentMethod.id, models.PaymentMethod.name)
        .order_by(func.sum(models.Transaction.amount).desc())
        .all()
    )
    payment_methods = [
        schemas.AnalyticsBreakdownItem(
            label=row[1],
            amount=round((row[2] or 0), 2),
            count=int(row[3] or 0),
            percentage=round(((row[2] or 0) / category_total) * 100, 1)
            if category_total > 0
            else 0.0,
        )
        for row in payment_method_rows
    ]

    income_source_rows = (
        db.query(
            models.IncomeSource.id,
            models.IncomeSource.name,
            func.sum(models.Transaction.amount),
            func.count(models.Transaction.id),
        )
        .join(models.IncomeDetail, models.IncomeDetail.income_source_id == models.IncomeSource.id)
        .join(models.Transaction, models.Transaction.id == models.IncomeDetail.transaction_id)
        .filter(
            models.Transaction.transaction_type == models.TransactionType.income,
            models.Transaction.date.between(start, end),
        )
        .group_by(models.IncomeSource.id, models.IncomeSource.name)
        .order_by(func.sum(models.Transaction.amount).desc())
        .all()
    )
    income_sources = [
        schemas.AnalyticsBreakdownItem(
            label=row[1],
            amount=round((row[2] or 0), 2),
            count=int(row[3] or 0),
            percentage=round(((row[2] or 0) / monthly_income) * 100, 1)
            if monthly_income > 0
            else 0.0,
        )
        for row in income_source_rows
    ]

    investment_alloc_rows = (
        db.query(
            models.InvestmentType.id,
            models.InvestmentType.name,
            func.sum(models.Transaction.amount),
            func.count(models.Transaction.id),
        )
        .join(models.InvestmentDetail, models.InvestmentDetail.investment_type_id == models.InvestmentType.id)
        .join(models.Transaction, models.Transaction.id == models.InvestmentDetail.transaction_id)
        .filter(
            models.Transaction.transaction_type == models.TransactionType.investment,
            models.Transaction.date.between(start, end),
        )
        .group_by(models.InvestmentType.id, models.InvestmentType.name)
        .order_by(func.sum(models.Transaction.amount).desc())
        .all()
    )
    investment_allocation = [
        schemas.AnalyticsBreakdownItem(
            label=row[1],
            amount=round((row[2] or 0), 2),
            count=int(row[3] or 0),
            percentage=round(((row[2] or 0) / monthly_investment) * 100, 1)
            if monthly_investment > 0
            else 0.0,
        )
        for row in investment_alloc_rows
    ]

    # Investment holdings - current portfolio state
    holdings_rows = (
        db.query(
            models.InvestmentHolding.id,
            models.InvestmentType.name.label("investment_type_name"),
            models.Broker.name.label("broker_name"),
            models.Account.name.label("account_name"),
            models.InvestmentHolding.total_invested,
            models.InvestmentHolding.transaction_count,
        )
        .join(models.InvestmentType, models.InvestmentHolding.investment_type_id == models.InvestmentType.id)
        .join(models.Account, models.InvestmentHolding.account_id == models.Account.id)
        .outerjoin(models.Broker, models.InvestmentHolding.broker_id == models.Broker.id)
        .order_by(models.InvestmentHolding.total_invested.desc())
        .all()
    )
    total_portfolio_value = sum((row.total_invested or 0) for row in holdings_rows)
    investment_holdings = [
        schemas.AnalyticsBreakdownItem(
            label=f"{row.investment_type_name}" + (f" ({row.broker_name})" if row.broker_name else ""),
            amount=round((row.total_invested or 0), 2),
            count=int(row.transaction_count or 0),
            percentage=round(((row.total_invested or 0) / total_portfolio_value) * 100, 1)
            if total_portfolio_value > 0
            else 0.0,
        )
        for row in holdings_rows
    ]

    days_in_month = monthrange(int(month.split("-")[0]), int(month.split("-")[1]))[1]
    expense_count = (
        db.query(func.count(models.Transaction.id))
        .filter(
            models.Transaction.transaction_type == models.TransactionType.expense,
            models.Transaction.date.between(start, end),
        )
        .scalar()
    ) or 0
    largest_expense = (
        db.query(func.max(models.Transaction.amount))
        .filter(
            models.Transaction.transaction_type == models.TransactionType.expense,
            models.Transaction.date.between(start, end),
        )
        .scalar()
    ) or 0.0

    spending_kpis = [
        schemas.AnalyticsKpi(
            id="expense_count",
            label="Expense transactions",
            value=float(expense_count),
            helper="Number of expenses recorded this month",
        ),
        schemas.AnalyticsKpi(
            id="avg_daily_expense",
            label="Average daily spend",
            value=round(monthly_expense / days_in_month, 2) if days_in_month else 0.0,
            helper="Average expense per calendar day",
        ),
        schemas.AnalyticsKpi(
            id="largest_expense",
            label="Largest expense",
            value=round(float(largest_expense), 2),
            helper="Highest single expense transaction",
        ),
        schemas.AnalyticsKpi(
            id="top_merchant_share",
            label="Top merchant share",
            value=top_merchant_share,
            helper="Share of total spend by the largest merchant",
        ),
    ]

    cash_flow = [
        schemas.AnalyticsCashFlowItem(label="Income", amount=monthly_income, direction="inflow"),
        schemas.AnalyticsCashFlowItem(label="Expenses", amount=monthly_expense, direction="outflow"),
        schemas.AnalyticsCashFlowItem(label="Investments", amount=monthly_investment, direction="outflow"),
        schemas.AnalyticsCashFlowItem(
            label="Net savings",
            amount=round(monthly_income - monthly_expense - monthly_investment, 2),
            direction="inflow" if monthly_income - monthly_expense - monthly_investment > 0 else "outflow"
            if monthly_income - monthly_expense - monthly_investment < 0
            else "neutral",
        ),
    ]

    health_score = _compute_health_score(savings_rate, budget_utilization, lending_summary.overdue_count + borrowing_summary.overdue_count)

    insights = _build_analytics_insights(
        monthly_income,
        monthly_expense,
        monthly_investment,
        total_budget_spent,
        budget_utilization,
        lending_summary,
        borrowing_summary,
        top_merchant_share,
    )

    return schemas.AnalyticsSummary(
        month=month,
        executive_summary=[
            schemas.AnalyticsKpi(
                id="income",
                label="Monthly income",
                value=monthly_income,
                helper="Total income recorded this month.",
            ),
            schemas.AnalyticsKpi(
                id="expenses",
                label="Monthly expenses",
                value=monthly_expense,
                helper="Total expense cash flow this month.",
            ),
            schemas.AnalyticsKpi(
                id="investments",
                label="Monthly investments",
                value=monthly_investment,
                helper="Money moved into investments.",
            ),
            schemas.AnalyticsKpi(
                id="savings",
                label="Savings",
                value=savings,
                helper=f"{savings_rate}% of income after expenses and investments.",
            ),
            schemas.AnalyticsKpi(
                id="budget_utilization",
                label="Budget utilization",
                value=budget_utilization,
                helper="Percent of monthly budget used.",
            ),
            schemas.AnalyticsKpi(
                id="loan_exposure",
                label="Loan exposure",
                value=round(lending_summary.outstanding + borrowing_summary.outstanding, 2),
                helper="Total outstanding loan balances.",
            ),
        ],
        spending_kpis=spending_kpis,
        monthly_trend=trend,
        category_spend=category_spend,
        top_merchants=top_merchants,
        need_want=need_want,
        payment_methods=payment_methods,
        income_sources=income_sources,
        investment_allocation=investment_allocation,
        investment_holdings=investment_holdings,
        budget_signals=budget_signals,
        lending_summary=lending_summary,
        borrowing_summary=borrowing_summary,
        cash_flow=cash_flow,
        health_score=health_score,
        insights=insights,
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

def _get_or_create_investment_holding(
    db: Session,
    investment_type_id: int,
    broker_id: Optional[int],
    account_id: int,
) -> models.InvestmentHolding:
    """Find existing holding or create a new one."""
    holding = (
        db.query(models.InvestmentHolding)
        .filter(
            models.InvestmentHolding.investment_type_id == investment_type_id,
            models.InvestmentHolding.broker_id == broker_id,
            models.InvestmentHolding.account_id == account_id,
        )
        .first()
    )
    
    if not holding:
        holding = models.InvestmentHolding(
            investment_type_id=investment_type_id,
            broker_id=broker_id,
            account_id=account_id,
            total_invested=0,
            transaction_count=0,
        )
        db.add(holding)
        db.flush()
    
    return holding


def _update_investment_holding(
    db: Session,
    holding: models.InvestmentHolding,
    amount: float,
    investment_date: date_type,
) -> None:
    """Update holding totals after a new investment transaction."""
    holding.total_invested += amount
    holding.transaction_count += 1
    
    if holding.first_investment_date is None or investment_date < holding.first_investment_date:
        holding.first_investment_date = investment_date
    
    if holding.last_investment_date is None or investment_date > holding.last_investment_date:
        holding.last_investment_date = investment_date
    
    holding.updated_at = datetime.utcnow()


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

    # Get or create the holding
    holding = _get_or_create_investment_holding(
        db,
        payload.investment_type_id,
        broker.id if broker else None,
        payload.account_id,
    )

    detail = models.InvestmentDetail(
        transaction_id=transaction.id,
        investment_type_id=payload.investment_type_id,
        broker_id=broker.id if broker else None,
        holding_id=holding.id,
        tags=payload.tags,
    )
    db.add(detail)
    
    # Update holding totals
    _update_investment_holding(db, holding, payload.amount, payload.date)
    
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


# ---------------------------------------------------------------------------
# Budget — spend computation (reads Expense data, never writes to it)
# ---------------------------------------------------------------------------

def get_category_spend(db: Session, category_id: int, month: str) -> float:
    """
    Sums actual Expense transactions for one category in one month.
    Joins through ExpenseDetail (which holds category_id) back to
    Transaction (which holds amount/date) — the same shared-core join
    every other "category spend" question in this app will eventually use.
    """
    year, mon = (int(p) for p in month.split("-"))
    start = date_type(year, mon, 1)
    end = date_type(year, mon, monthrange(year, mon)[1])

    total = (
        db.query(func.sum(models.Transaction.amount))
        .join(models.ExpenseDetail, models.ExpenseDetail.transaction_id == models.Transaction.id)
        .filter(
            models.Transaction.transaction_type == models.TransactionType.expense,
            models.ExpenseDetail.category_id == category_id,
            models.Transaction.date.between(start, end),
        )
        .scalar()
    )
    return round(total or Decimal("0.00"), 2)


def compute_budget_status(amount: float, spent: float) -> dict:
    remaining = round(amount - spent, 2)
    utilization_pct = round((spent / amount) * 100, 1) if amount > 0 else 0.0

    if spent > amount:
        status = "exceeded"
    elif utilization_pct >= 80:
        status = "near"
    else:
        status = "under"

    return {
        "remaining": remaining,
        "utilization_pct": utilization_pct,
        "status": status,
    }


# ---------------------------------------------------------------------------
# Create Budget
# ---------------------------------------------------------------------------

def create_budget(db: Session, payload: schemas.BudgetCreate) -> models.Budget:
    budget = models.Budget(
        category_id=payload.category_id,
        month=payload.month,
        amount=payload.amount,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


# ---------------------------------------------------------------------------
# Read Budgets
# ---------------------------------------------------------------------------

def list_budgets(db: Session, month: str) -> list[models.Budget]:
    return (
        db.query(models.Budget)
        .filter(models.Budget.month == month)
        .join(models.Category)
        .order_by(models.Category.name)
        .all()
    )


def get_budget_by_category_and_month(
    db: Session, category_id: int, month: str
) -> models.Budget | None:
    """Used to enforce the one-budget-per-category-per-month rule on create."""
    return (
        db.query(models.Budget)
        .filter(models.Budget.category_id == category_id, models.Budget.month == month)
        .first()
    )


# ---------------------------------------------------------------------------
# Single Budget
# ---------------------------------------------------------------------------

def get_budget(db: Session, budget_id: int) -> models.Budget | None:
    return db.query(models.Budget).filter(models.Budget.id == budget_id).first()


# ---------------------------------------------------------------------------
# Update Budget
# ---------------------------------------------------------------------------

def update_budget(db: Session, budget: models.Budget, amount: float) -> models.Budget:
    """
    Only the amount is editable. Category and month are treated as fixed
    once created — if you want a different category or month, delete
    this budget and create a new one; changing them in place would make
    "budgets reset monthly while preserving history" ambiguous (which
    month's history does an edited row belong to?).
    """
    budget.amount = amount
    db.commit()
    db.refresh(budget)
    return budget


# ---------------------------------------------------------------------------
# Delete Budget
# ---------------------------------------------------------------------------

def delete_budget(db: Session, budget: models.Budget) -> None:
    db.delete(budget)
    db.commit()


# ---------------------------------------------------------------------------
# Recurring Expenses
# ---------------------------------------------------------------------------

def _advance_due_date(current: date_type, frequency: str) -> date_type:
    if frequency == "daily":
        from datetime import timedelta
        return current + timedelta(days=1)
    if frequency == "weekly":
        from datetime import timedelta
        return current + timedelta(weeks=1)
    if frequency == "monthly":
        month = current.month + 1 if current.month < 12 else 1
        year = current.year if current.month < 12 else current.year + 1
        day = min(current.day, monthrange(year, month)[1])
        return date_type(year, month, day)
    if frequency == "yearly":
        year = current.year + 1
        day = min(current.day, monthrange(year, current.month)[1])
        return date_type(year, current.month, day)
    return current


def list_recurring_expenses(db: Session) -> list[models.RecurringExpense]:
    return (
        db.query(models.RecurringExpense)
        .filter(models.RecurringExpense.is_active == True)
        .order_by(models.RecurringExpense.next_due_date)
        .all()
    )


def get_recurring_expense(db: Session, recurring_id: int) -> models.RecurringExpense | None:
    return db.query(models.RecurringExpense).filter(models.RecurringExpense.id == recurring_id).first()


def create_recurring_expense(
    db: Session, payload: schemas.RecurringExpenseCreate
) -> models.RecurringExpense:
    obj = models.RecurringExpense(
        name=payload.name,
        amount=payload.amount,
        frequency=models.RecurringFrequency(payload.frequency),
        start_date=payload.start_date,
        end_date=payload.end_date,
        next_due_date=payload.next_due_date,
        category_id=payload.category_id,
        subcategory_id=payload.subcategory_id,
        payment_method_id=payload.payment_method_id,
        account_id=payload.account_id,
        merchant_name=payload.merchant_name,
        need_or_want=payload.need_or_want,
        notes=payload.notes,
        tags=payload.tags,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_recurring_expense(
    db: Session,
    obj: models.RecurringExpense,
    payload: schemas.RecurringExpenseCreate,
) -> models.RecurringExpense:
    obj.name = payload.name
    obj.amount = payload.amount
    obj.frequency = models.RecurringFrequency(payload.frequency)
    obj.start_date = payload.start_date
    obj.end_date = payload.end_date
    obj.next_due_date = payload.next_due_date
    obj.category_id = payload.category_id
    obj.subcategory_id = payload.subcategory_id
    obj.payment_method_id = payload.payment_method_id
    obj.account_id = payload.account_id
    obj.merchant_name = payload.merchant_name
    obj.need_or_want = payload.need_or_want
    obj.notes = payload.notes
    obj.tags = payload.tags
    db.commit()
    db.refresh(obj)
    return obj


def delete_recurring_expense(db: Session, obj: models.RecurringExpense) -> None:
    obj.is_active = False
    db.commit()


def log_recurring_now(db: Session, obj: models.RecurringExpense) -> models.Transaction:
    expense_payload = schemas.ExpenseCreate(
        date=date_type.today(),
        amount=obj.amount,
        account_id=obj.account_id,
        category_id=obj.category_id,
        payment_method_id=obj.payment_method_id,
        subcategory_id=obj.subcategory_id,
        merchant_name=obj.merchant_name,
        need_or_want=obj.need_or_want,
        notes=obj.notes or f"[Recurring] {obj.name}",
        tags=obj.tags,
    )
    transaction = create_expense(db, expense_payload)
    obj.next_due_date = _advance_due_date(obj.next_due_date, obj.frequency.value)
    db.commit()
    return transaction


# ---------------------------------------------------------------------------
# Transaction Templates (for recurring references)
# ---------------------------------------------------------------------------

def list_expense_templates(db: Session) -> list[models.ExpenseTemplate]:
    """List all active expense templates."""
    return db.query(models.ExpenseTemplate).filter(
        models.ExpenseTemplate.is_active == True
    ).order_by(models.ExpenseTemplate.name).all()

def create_expense_template(db: Session, payload: schemas.ExpenseTemplateCreate) -> models.ExpenseTemplate:
    """Create a new expense template."""
    if db.get(models.Category, payload.category_id) is None:
        raise ValueError("category_id does not exist")
    if payload.subcategory_id and db.get(models.Subcategory, payload.subcategory_id) is None:
        raise ValueError("subcategory_id does not exist")
    if db.get(models.PaymentMethod, payload.payment_method_id) is None:
        raise ValueError("payment_method_id does not exist")
    if db.get(models.Account, payload.account_id) is None:
        raise ValueError("account_id does not exist")

    template = models.ExpenseTemplate(
        name=payload.name,
        amount=payload.amount,
        category_id=payload.category_id,
        subcategory_id=payload.subcategory_id,
        payment_method_id=payload.payment_method_id,
        account_id=payload.account_id,
        merchant_name=payload.merchant_name,
        need_or_want=payload.need_or_want,
        notes=payload.notes,
        tags=payload.tags,
        is_active=True,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template

def list_income_templates(db: Session) -> list[models.IncomeTemplate]:
    """List all active income templates."""
    return db.query(models.IncomeTemplate).filter(
        models.IncomeTemplate.is_active == True
    ).order_by(models.IncomeTemplate.name).all()

def create_income_template(db: Session, payload: schemas.IncomeTemplateCreate) -> models.IncomeTemplate:
    """Create a new income template."""
    if db.get(models.IncomeSource, payload.income_source_id) is None:
        raise ValueError("income_source_id does not exist")
    if db.get(models.Account, payload.account_id) is None:
        raise ValueError("account_id does not exist")

    template = models.IncomeTemplate(
        name=payload.name,
        amount=payload.amount,
        income_source_id=payload.income_source_id,
        account_id=payload.account_id,
        notes=payload.notes,
        tags=payload.tags,
        is_active=True,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template

# NOTE: There is intentionally no list_investment_templates / create_investment_template.
# See the note above models.RecurringTransaction - recurring investments reference an
# existing InvestmentHolding directly instead of a template.


# ---------------------------------------------------------------------------
# Recurring Transactions (New unified system)
# ---------------------------------------------------------------------------

def _validate_recurring_transaction_payload(
    db: Session, payload: schemas.RecurringTransactionCreate
) -> None:
    """
    Validate that exactly one reference is present based on transaction_type.

    account_id is handled differently per type:
    - expense/income: account_id is required and user-supplied.
    - investment/lending/borrowing: account_id must NOT be supplied by the
      caller. It is always derived from the referenced holding/agreement,
      so there is a single source of truth for which account the money
      moves through.
    """
    transaction_type = payload.transaction_type

    if transaction_type == "investment":
        if payload.investment_holding_id is None:
            raise ValueError("investment_holding_id is required for investment transactions")
        if db.get(models.InvestmentHolding, payload.investment_holding_id) is None:
            raise ValueError("investment_holding_id does not exist")
        if payload.account_id is not None:
            raise ValueError(
                "account_id must not be provided for investment transactions; "
                "it is derived from investment_holding_id"
            )
        return

    if transaction_type == "lending":
        if payload.lending_id is None:
            raise ValueError("lending_id is required for lending transactions")
        if db.get(models.LendingAgreement, payload.lending_id) is None:
            raise ValueError("lending_id does not exist")
        if payload.account_id is not None:
            raise ValueError(
                "account_id must not be provided for lending transactions; "
                "it is derived from the referenced lending agreement"
            )
        return

    if transaction_type == "borrowing":
        if payload.borrowing_id is None:
            raise ValueError("borrowing_id is required for borrowing transactions")
        if db.get(models.BorrowingAgreement, payload.borrowing_id) is None:
            raise ValueError("borrowing_id does not exist")
        if payload.account_id is not None:
            raise ValueError(
                "account_id must not be provided for borrowing transactions; "
                "it is derived from the referenced borrowing agreement"
            )
        return

    if payload.account_id is None:
        raise ValueError("account_id is required")
    if db.get(models.Account, payload.account_id) is None:
        raise ValueError("account_id does not exist")

    if transaction_type == "expense":
        if payload.expense_template_id is None:
            raise ValueError("expense_template_id is required for expense transactions")
        if db.get(models.ExpenseTemplate, payload.expense_template_id) is None:
            raise ValueError("expense_template_id does not exist")

    elif transaction_type == "income":
        if payload.income_template_id is None:
            raise ValueError("income_template_id is required for income transactions")
        if db.get(models.IncomeTemplate, payload.income_template_id) is None:
            raise ValueError("income_template_id does not exist")


def list_recurring_transactions(
    db: Session, 
    transaction_type: str | None = None,
    status: str | None = None
) -> list[models.RecurringTransaction]:
    """
    List recurring transactions with optional filtering by type and status.
    Ordered by next_due_date ascending.
    By default, excludes cancelled transactions unless explicitly requested.
    """
    query = db.query(models.RecurringTransaction)
    
    # By default, exclude cancelled transactions
    if status is None:
        query = query.filter(models.RecurringTransaction.status != models.RecurringStatus.cancelled)
    
    if transaction_type:
        query = query.filter(
            models.RecurringTransaction.transaction_type == models.RecurringTransactionType(transaction_type)
        )
    
    if status:
        query = query.filter(
            models.RecurringTransaction.status == models.RecurringStatus(status)
        )
    
    return query.order_by(models.RecurringTransaction.next_due_date).all()


def get_recurring_transaction(db: Session, recurring_id: int) -> models.RecurringTransaction | None:
    return db.query(models.RecurringTransaction).filter(
        models.RecurringTransaction.id == recurring_id
    ).first()


def create_recurring_transaction(
    db: Session, payload: schemas.RecurringTransactionCreate
) -> models.RecurringTransaction:
    """
    Create a new recurring transaction using template references.
    Only one reference field should be populated based on transaction_type.
    """
    _validate_recurring_transaction_payload(db, payload)

    # For investment/lending/borrowing, account_id is derived from the
    # referenced holding/agreement, never user-supplied.
    if payload.transaction_type == "investment":
        holding = db.get(models.InvestmentHolding, payload.investment_holding_id)
        account_id = holding.account_id
    elif payload.transaction_type == "lending":
        agreement = db.get(models.LendingAgreement, payload.lending_id)
        account_id = agreement.transaction.account_id
    elif payload.transaction_type == "borrowing":
        agreement = db.get(models.BorrowingAgreement, payload.borrowing_id)
        account_id = agreement.transaction.account_id
    else:
        account_id = payload.account_id

    obj = models.RecurringTransaction(
        name=payload.name,
        amount=payload.amount,
        transaction_type=models.RecurringTransactionType(payload.transaction_type),
        status=models.RecurringStatus.active,
        account_id=account_id,
        frequency=models.RecurringFrequency(payload.frequency),
        start_date=payload.start_date,
        end_date=payload.end_date,
        next_due_date=payload.next_due_date,
        notes=payload.notes,
        tags=payload.tags,
        # Type-specific references
        expense_template_id=payload.expense_template_id,
        income_template_id=payload.income_template_id,
        investment_holding_id=payload.investment_holding_id,
        lending_id=payload.lending_id,
        borrowing_id=payload.borrowing_id,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_recurring_transaction(
    db: Session,
    obj: models.RecurringTransaction,
    payload: schemas.RecurringTransactionUpdate,
) -> models.RecurringTransaction:
    """
    Update a recurring transaction. Only updates fields that are provided.
    """
    if payload.name is not None:
        obj.name = payload.name
    if payload.amount is not None:
        obj.amount = payload.amount
    if payload.transaction_type is not None:
        obj.transaction_type = models.RecurringTransactionType(payload.transaction_type)
    if payload.status is not None:
        obj.status = models.RecurringStatus(payload.status)
    if payload.frequency is not None:
        obj.frequency = models.RecurringFrequency(payload.frequency)
    if payload.start_date is not None:
        obj.start_date = payload.start_date
    if payload.end_date is not None:
        obj.end_date = payload.end_date
    if payload.next_due_date is not None:
        obj.next_due_date = payload.next_due_date
    if payload.notes is not None:
        obj.notes = payload.notes
    if payload.tags is not None:
        obj.tags = payload.tags

    # Type-specific references
    if payload.expense_template_id is not None:
        obj.expense_template_id = payload.expense_template_id
    if payload.income_template_id is not None:
        obj.income_template_id = payload.income_template_id

    # Investment holding drives account_id; the two must never drift apart.
    if payload.investment_holding_id is not None:
        holding = db.get(models.InvestmentHolding, payload.investment_holding_id)
        if holding is None:
            raise ValueError("investment_holding_id does not exist")
        obj.investment_holding_id = holding.id
        obj.account_id = holding.account_id

    # Lending/Borrowing agreement drives account_id, same reasoning as investment.
    if payload.lending_id is not None:
        agreement = db.get(models.LendingAgreement, payload.lending_id)
        if agreement is None:
            raise ValueError("lending_id does not exist")
        obj.lending_id = agreement.id
        obj.account_id = agreement.transaction.account_id

    if payload.borrowing_id is not None:
        agreement = db.get(models.BorrowingAgreement, payload.borrowing_id)
        if agreement is None:
            raise ValueError("borrowing_id does not exist")
        obj.borrowing_id = agreement.id
        obj.account_id = agreement.transaction.account_id

    if payload.account_id is not None:
        if obj.transaction_type in (
            models.RecurringTransactionType.investment,
            models.RecurringTransactionType.lending,
            models.RecurringTransactionType.borrowing,
        ):
            raise ValueError(
                f"account_id must not be set directly for {obj.transaction_type.value} "
                "transactions; it is derived from the referenced holding/agreement"
            )
        obj.account_id = payload.account_id

    db.commit()
    db.refresh(obj)
    return obj


def delete_recurring_transaction(db: Session, obj: models.RecurringTransaction) -> None:
    """
    Soft delete by setting status to cancelled.
    """
    obj.status = models.RecurringStatus.cancelled
    db.commit()


def _create_expense_from_recurring(
    db: Session, obj: models.RecurringTransaction
) -> models.Transaction:
    """Create an expense transaction from a recurring expense rule.

    All expense-specific attributes (category, payment method, etc.) live on
    the linked ExpenseTemplate, not on the RecurringTransaction itself.
    """
    template = obj.expense_template
    if template is None:
        raise ValueError("Recurring expense rule has no linked expense_template")

    expense_payload = schemas.ExpenseCreate(
        date=obj.next_due_date,
        amount=obj.amount,
        account_id=obj.account_id,
        category_id=template.category_id,
        payment_method_id=template.payment_method_id,
        subcategory_id=template.subcategory_id,
        merchant_name=template.merchant_name,
        need_or_want=template.need_or_want,
        notes=obj.notes or f"[Recurring] {obj.name}",
        tags=obj.tags or template.tags,
    )
    transaction = create_expense(db, expense_payload)
    transaction.is_recurring = True
    transaction.recurring_transaction_id = obj.id
    transaction.execution_date = obj.next_due_date
    transaction.execution_status = "generated"
    db.commit()
    db.refresh(transaction)
    return transaction


def _create_income_from_recurring(
    db: Session, obj: models.RecurringTransaction
) -> models.Transaction:
    """Create an income transaction from a recurring income rule.

    income_source lives on the linked IncomeTemplate, not on RecurringTransaction.
    """
    template = obj.income_template
    if template is None:
        raise ValueError("Recurring income rule has no linked income_template")

    income_payload = schemas.IncomeCreate(
        date=obj.next_due_date,
        amount=obj.amount,
        account_id=obj.account_id,
        income_source_id=template.income_source_id,
        notes=obj.notes or f"[Recurring] {obj.name}",
        tags=obj.tags or template.tags,
    )
    transaction = create_income(db, income_payload)
    transaction.is_recurring = True
    transaction.recurring_transaction_id = obj.id
    transaction.execution_date = obj.next_due_date
    transaction.execution_status = "generated"
    db.commit()
    db.refresh(transaction)
    return transaction


def _create_investment_from_recurring(
    db: Session, obj: models.RecurringTransaction
) -> models.Transaction:
    """Create an investment transaction from a recurring investment (SIP) rule.

    Unlike expense/income, this does NOT go through create_investment(), because
    create_investment() resolves (investment_type, broker, account) to a holding
    via get-or-create - which could silently create a second holding if the
    triplet ever drifted. A recurring investment already knows its exact,
    existing holding, so we attach the new Transaction/InvestmentDetail to it
    directly and update its running totals. No new InvestmentHolding is ever
    created here.
    """
    holding = obj.investment_holding
    if holding is None:
        raise ValueError("Recurring investment rule has no linked investment_holding")

    transaction = models.Transaction(
        transaction_type=models.TransactionType.investment,
        date=obj.next_due_date,
        amount=obj.amount,
        account_id=holding.account_id,
        notes=obj.notes or f"[Recurring SIP] {obj.name}",
    )
    db.add(transaction)
    db.flush()  # get transaction.id before creating the linked detail row

    detail = models.InvestmentDetail(
        transaction_id=transaction.id,
        investment_type_id=holding.investment_type_id,
        broker_id=holding.broker_id,
        holding_id=holding.id,
        tags=obj.tags,
    )
    db.add(detail)

    _update_investment_holding(db, holding, obj.amount, obj.next_due_date)

    transaction.is_recurring = True
    transaction.recurring_transaction_id = obj.id
    transaction.execution_date = obj.next_due_date
    transaction.execution_status = "generated"
    db.commit()
    db.refresh(transaction)
    return transaction


def _create_lending_from_recurring(
    db: Session, obj: models.RecurringTransaction
) -> models.LendingRepayment:
    """
    Execute a recurring lending rule: add a repayment against the EXISTING
    lending agreement obj.lending_id references. This never creates a new
    LendingAgreement - it reuses add_lending_repayment(), the same business
    logic the manual "add repayment" endpoint uses, so outstanding balance
    (computed by compute_lending_status from the sum of repayments) updates
    automatically with no separate write.
    """
    agreement = obj.lending_agreement
    if agreement is None:
        raise ValueError("Recurring lending rule has no linked lending_agreement")

    repayment_payload = schemas.LendingRepaymentCreate(
        date=obj.next_due_date,
        amount=obj.amount,
        account_id=obj.account_id,
        notes=obj.notes or f"[Recurring] {obj.name}",
    )
    repayment = add_lending_repayment(db, agreement, repayment_payload)

    transaction = repayment.transaction
    transaction.is_recurring = True
    transaction.recurring_transaction_id = obj.id
    transaction.execution_date = obj.next_due_date
    transaction.execution_status = "generated"
    db.commit()
    db.refresh(repayment)
    return repayment


def _create_borrowing_from_recurring(
    db: Session, obj: models.RecurringTransaction
) -> models.BorrowingRepayment:
    """
    Execute a recurring borrowing rule: add a repayment against the EXISTING
    borrowing agreement obj.borrowing_id references. Mirrors
    _create_lending_from_recurring exactly, direction reversed.
    """
    agreement = obj.borrowing_agreement
    if agreement is None:
        raise ValueError("Recurring borrowing rule has no linked borrowing_agreement")

    repayment_payload = schemas.BorrowingRepaymentCreate(
        date=obj.next_due_date,
        amount=obj.amount,
        account_id=obj.account_id,
        notes=obj.notes or f"[Recurring] {obj.name}",
    )
    repayment = add_borrowing_repayment(db, agreement, repayment_payload)

    transaction = repayment.transaction
    transaction.is_recurring = True
    transaction.recurring_transaction_id = obj.id
    transaction.execution_date = obj.next_due_date
    transaction.execution_status = "generated"
    db.commit()
    db.refresh(repayment)
    return repayment


def log_recurring_transaction_now(
    db: Session, obj: models.RecurringTransaction
) -> schemas.RecurringTransactionLogOut:
    """
    Execute a recurring transaction now by creating the appropriate transaction type.
    Returns information about the created transaction.
    """
    if obj.status != models.RecurringStatus.active:
        raise ValueError("Cannot log a recurring transaction that is not active")
    
    transaction_id = None
    transaction_type = obj.transaction_type.value
    execution_date = obj.next_due_date
    
    try:
        if obj.transaction_type == models.RecurringTransactionType.expense:
            transaction = _create_expense_from_recurring(db, obj)
            transaction_id = transaction.id
        elif obj.transaction_type == models.RecurringTransactionType.income:
            transaction = _create_income_from_recurring(db, obj)
            transaction_id = transaction.id
        elif obj.transaction_type == models.RecurringTransactionType.investment:
            transaction = _create_investment_from_recurring(db, obj)
            transaction_id = transaction.id
        elif obj.transaction_type == models.RecurringTransactionType.lending:
            repayment = _create_lending_from_recurring(db, obj)
            transaction_id = repayment.transaction.id
        elif obj.transaction_type == models.RecurringTransactionType.borrowing:
            repayment = _create_borrowing_from_recurring(db, obj)
            transaction_id = repayment.transaction.id
        else:
            raise ValueError(f"Unsupported transaction type: {obj.transaction_type}")
        
        # Advance the next due date
        obj.next_due_date = _advance_due_date(obj.next_due_date, obj.frequency.value)
        
        # Check if we've reached the end date
        if obj.end_date and obj.next_due_date > obj.end_date:
            obj.status = models.RecurringStatus.completed
        
        db.commit()
        
        return schemas.RecurringTransactionLogOut(
            transaction_type=transaction_type,
            transaction_id=transaction_id,
            date=execution_date,
            amount=obj.amount,
            message=f"Successfully created {transaction_type} transaction"
        )
    
    except Exception as e:
        obj.status = models.RecurringStatus.failed
        db.commit()
        raise ValueError(f"Failed to create transaction: {str(e)}")


# ---------------------------------------------------------------------------
# Lifecycle Management Functions
# ---------------------------------------------------------------------------

def pause_recurring_transaction(db: Session, obj: models.RecurringTransaction) -> models.RecurringTransaction:
    """Pause a recurring transaction."""
    obj.status = models.RecurringStatus.paused
    db.commit()
    db.refresh(obj)
    return obj


def resume_recurring_transaction(db: Session, obj: models.RecurringTransaction) -> models.RecurringTransaction:
    """Resume a paused recurring transaction."""
    if obj.status != models.RecurringStatus.paused:
        raise ValueError("Can only resume paused transactions")
    obj.status = models.RecurringStatus.active
    db.commit()
    db.refresh(obj)
    return obj


def skip_recurring_transaction(
    db: Session, obj: models.RecurringTransaction, reason: str | None = None
) -> models.RecurringTransaction:
    """
    Skip the next due date for a recurring transaction.
    Advances next_due_date without creating a transaction.
    """
    if obj.status != models.RecurringStatus.active:
        raise ValueError("Can only skip active transactions")
    
    obj.next_due_date = _advance_due_date(obj.next_due_date, obj.frequency.value)
    
    # Check if we've reached the end date
    if obj.end_date and obj.next_due_date > obj.end_date:
        obj.status = models.RecurringStatus.completed
    
    if reason:
        obj.notes = f"{obj.notes or ''} [Skipped: {reason}]".strip()
    
    db.commit()
    db.refresh(obj)
    return obj


def complete_recurring_transaction(db: Session, obj: models.RecurringTransaction) -> models.RecurringTransaction:
    """Mark a recurring transaction as completed."""
    obj.status = models.RecurringStatus.completed
    db.commit()
    db.refresh(obj)
    return obj


def cancel_recurring_transaction(db: Session, obj: models.RecurringTransaction) -> models.RecurringTransaction:
    """Cancel a recurring transaction."""
    obj.status = models.RecurringStatus.cancelled
    db.commit()
    db.refresh(obj)
    return obj


# NOTE: The one-time RecurringExpense -> RecurringTransaction migration
# function was removed. There is no legacy production data to migrate, and
# it predated the template/holding-reference architecture (it does not
# apply against the current schema). If a legacy RecurringExpense import is
# ever needed, it must be rebuilt against ExpenseTemplate, not written
# directly.


# ---------------------------------------------------------------------------
# Scheduler Function
# ---------------------------------------------------------------------------

def process_due_recurring_transactions(db: Session) -> dict:
    """
    Process all recurring transactions that are due today or overdue.
    Returns statistics about processing results.
    """
    today = date_type.today()
    due_transactions = db.query(models.RecurringTransaction).filter(
        models.RecurringTransaction.status == models.RecurringStatus.active,
        models.RecurringTransaction.next_due_date <= today
    ).all()
    
    processed_count = 0
    failed_count = 0
    skipped_count = 0
    errors = []
    
    for recurring in due_transactions:
        try:
            # Check if end date has passed
            if recurring.end_date and today > recurring.end_date:
                recurring.status = models.RecurringStatus.completed
                db.commit()
                skipped_count += 1
                continue
            
            # Process the transaction
            log_recurring_transaction_now(db, recurring)
            processed_count += 1
        except Exception as e:
            failed_count += 1
            errors.append(f"Failed to process recurring {recurring.id}: {str(e)}")
    
    return {
        "total_due": len(due_transactions),
        "processed": processed_count,
        "failed": failed_count,
        "skipped": skipped_count,
        "errors": errors
    }