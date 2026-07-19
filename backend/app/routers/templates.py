from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, schemas, models
from ..database import get_db

router = APIRouter(prefix="/templates", tags=["Templates"])


# Expense Templates
@router.get("/expenses", response_model=list[schemas.ExpenseTemplateOut])
def list_expense_templates(db: Session = Depends(get_db)):
    """List all active expense templates."""
    return crud.list_expense_templates(db)


@router.post("/expenses", response_model=schemas.ExpenseTemplateOut)
def create_expense_template(
    payload: schemas.ExpenseTemplateCreate,
    db: Session = Depends(get_db)
):
    """Create a new expense template."""
    try:
        return crud.create_expense_template(db, payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# Income Templates
@router.get("/income", response_model=list[schemas.IncomeTemplateOut])
def list_income_templates(db: Session = Depends(get_db)):
    """List all active income templates."""
    return crud.list_income_templates(db)


@router.post("/income", response_model=schemas.IncomeTemplateOut)
def create_income_template(
    payload: schemas.IncomeTemplateCreate,
    db: Session = Depends(get_db)
):
    """Create a new income template."""
    try:
        return crud.create_income_template(db, payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# NOTE: There is intentionally no "Investment Templates" section here.
# Recurring investments (SIPs) reference an EXISTING InvestmentHolding
# instead of a template - see models.RecurringTransaction's docstring and
# crud._validate_recurring_transaction_payload. To populate a "pick a SIP
# target" dropdown on the frontend, list holdings via the investments
# router (e.g. GET /investments/holdings), not this templates router.