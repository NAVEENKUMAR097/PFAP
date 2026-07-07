from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db

router = APIRouter(prefix="/income", tags=["income"])


# ---------------------------------------------------------------------------
# Mapper
# ---------------------------------------------------------------------------

def _to_income_out(transaction) -> schemas.IncomeOut:
    detail = transaction.income_detail

    return schemas.IncomeOut(
        id=transaction.id,
        date=transaction.date,
        amount=transaction.amount,
        notes=transaction.notes,
        account=transaction.account,
        income_source=detail.income_source,
        tags=detail.tags,
    )

# ---------------------------------------------------------------------------
# Validation Helpers
# ---------------------------------------------------------------------------

def _validate_income_references(
    db: Session,
    payload: schemas.IncomeCreate,
) -> None:

    if db.get(models.Account, payload.account_id) is None:
        raise HTTPException(
            status_code=400,
            detail="account_id does not exist",
        )

    if db.get(models.IncomeSource, payload.income_source_id) is None:
        raise HTTPException(
            status_code=400,
            detail="income_source_id does not exist",
        )


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

@router.post("", response_model=schemas.IncomeOut, status_code=201)
def add_income(
    payload: schemas.IncomeCreate,
    db: Session = Depends(get_db),
):
    _validate_income_references(
    db,
    payload,
)

    transaction = crud.create_income(db, payload)

    return _to_income_out(transaction)


# ---------------------------------------------------------------------------
# Read All
# ---------------------------------------------------------------------------

@router.get("", response_model=list[schemas.IncomeOut])
def get_incomes(
    month: Optional[str] = None,
    db: Session = Depends(get_db),
):
    transactions = crud.list_incomes(
        db,
        month=month,
    )

    return [
        _to_income_out(transaction)
        for transaction in transactions
    ]


# ---------------------------------------------------------------------------
# Read One
# ---------------------------------------------------------------------------

@router.get("/{income_id}", response_model=schemas.IncomeOut)
def get_income(
    income_id: int,
    db: Session = Depends(get_db),
):
    transaction = crud.get_income(
        db,
        income_id,
    )

    if transaction is None:
        raise HTTPException(
            status_code=404,
            detail="Income not found",
        )

    return _to_income_out(transaction)


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------

@router.put("/{income_id}", response_model=schemas.IncomeOut)
def update_income(
    income_id: int,
    payload: schemas.IncomeCreate,
    db: Session = Depends(get_db),
):
    transaction = crud.get_income(
        db,
        income_id,
    )

    if transaction is None:
        raise HTTPException(
            status_code=404,
            detail="Income not found",
        )

    _validate_income_references(
    db,
    payload,
)

    updated = crud.update_income(
        db,
        transaction,
        payload,
    )

    return _to_income_out(updated)


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

@router.delete("/{income_id}", status_code=204)
def delete_income(
    income_id: int,
    db: Session = Depends(get_db),
):
    transaction = crud.get_income(
        db,
        income_id,
    )

    if transaction is None:
        raise HTTPException(
            status_code=404,
            detail="Income not found",
        )

    crud.delete_income(
        db,
        transaction,
    )

    return None