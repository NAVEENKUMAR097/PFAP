from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db

router = APIRouter(prefix="/budgets", tags=["budgets"])


# ---------------------------------------------------------------------------
# Mapper
# ---------------------------------------------------------------------------

def _to_budget_out(db: Session, budget: models.Budget) -> schemas.BudgetOut:
    spent = crud.get_category_spend(db, budget.category_id, budget.month)
    computed = crud.compute_budget_status(budget.amount, spent)

    return schemas.BudgetOut(
        id=budget.id,
        category=budget.category,
        month=budget.month,
        amount=budget.amount,
        spent=spent,
        remaining=computed["remaining"],
        utilization_pct=computed["utilization_pct"],
        status=computed["status"],
    )


# ---------------------------------------------------------------------------
# Validation Helpers
# ---------------------------------------------------------------------------

def _validate_budget_references(db: Session, category_id: int) -> None:
    if db.get(models.Category, category_id) is None:
        raise HTTPException(status_code=400, detail="category_id does not exist")


def _get_budget_or_404(db: Session, budget_id: int) -> models.Budget:
    budget = crud.get_budget(db, budget_id)
    if budget is None:
        raise HTTPException(status_code=404, detail="Budget not found")
    return budget


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

@router.post("", response_model=schemas.BudgetOut, status_code=201)
def add_budget(
    payload: schemas.BudgetCreate,
    db: Session = Depends(get_db),
):
    _validate_budget_references(db, payload.category_id)

    existing = crud.get_budget_by_category_and_month(db, payload.category_id, payload.month)
    if existing is not None:
        raise HTTPException(
            status_code=400,
            detail="A budget already exists for this category and month. Use PUT to update it instead.",
        )

    budget = crud.create_budget(db, payload)

    return _to_budget_out(db, budget)


# ---------------------------------------------------------------------------
# Read All (for a given month)
# ---------------------------------------------------------------------------

@router.get("", response_model=list[schemas.BudgetOut])
def get_budgets(
    month: str,
    db: Session = Depends(get_db),
):
    """month is required ("YYYY-MM") — a budget list only makes sense
    scoped to one month, unlike Expenses/Income where "all time" is a
    reasonable default."""
    budgets = crud.list_budgets(db, month)
    return [_to_budget_out(db, b) for b in budgets]


# ---------------------------------------------------------------------------
# Read One
# ---------------------------------------------------------------------------

@router.get("/{budget_id}", response_model=schemas.BudgetOut)
def get_budget(
    budget_id: int,
    db: Session = Depends(get_db),
):
    budget = _get_budget_or_404(db, budget_id)
    return _to_budget_out(db, budget)


# ---------------------------------------------------------------------------
# Update (amount only — see crud.update_budget for why)
# ---------------------------------------------------------------------------

@router.put("/{budget_id}", response_model=schemas.BudgetOut)
def update_budget(
    budget_id: int,
    payload: schemas.BudgetCreate,
    db: Session = Depends(get_db),
):
    budget = _get_budget_or_404(db, budget_id)

    updated = crud.update_budget(db, budget, payload.amount)

    return _to_budget_out(db, updated)


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

@router.delete("/{budget_id}", status_code=204)
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
):
    budget = _get_budget_or_404(db, budget_id)

    crud.delete_budget(db, budget)

    return None