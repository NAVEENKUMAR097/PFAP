from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db

router = APIRouter(prefix="/investments", tags=["investments"])


# ---------------------------------------------------------------------------
# Mapper
# ---------------------------------------------------------------------------




def _to_investment_out(transaction) -> schemas.InvestmentOut:
    detail = transaction.investment_detail

    return schemas.InvestmentOut(
        id=transaction.id,
        date=transaction.date,
        amount=transaction.amount,
        notes=transaction.notes,
        account=transaction.account,
        investment_type=detail.investment_type,
        broker=detail.broker,
        tags=detail.tags,
    )

# ---------------------------------------------------------------------------
# Validation Helpers
# ---------------------------------------------------------------------------

def _validate_investment_references(
    db: Session,
    payload: schemas.InvestmentCreate,
) -> None:

    if db.get(models.Account, payload.account_id) is None:
        raise HTTPException(
            status_code=400,
            detail="account_id does not exist",
        )

    if db.get(models.InvestmentType, payload.investment_type_id) is None:
        raise HTTPException(
            status_code=400,
            detail="investment_type_id does not exist",
        )


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

@router.post("", response_model=schemas.InvestmentOut, status_code=201)
def add_investment(
    payload: schemas.InvestmentCreate,
    db: Session = Depends(get_db),
):
    _validate_investment_references(
    db,
    payload,
)

    transaction = crud.create_investment(db, payload)

    return _to_investment_out(transaction)


# ---------------------------------------------------------------------------
# Read All
# ---------------------------------------------------------------------------

@router.get("", response_model=list[schemas.InvestmentOut])
def get_investments(
    month: Optional[str] = None,
    db: Session = Depends(get_db),
):
    transactions = crud.list_investments(
        db,
        month=month,
    )

    return [
        _to_investment_out(transaction)
        for transaction in transactions
    ]

# NOTE: Holdings are listed via the dedicated investment_holdings router
# (GET /investment-holdings), not here. Do not add a holdings endpoint to
# this router - that would duplicate it under a second path.


# ---------------------------------------------------------------------------
# Read One
# ---------------------------------------------------------------------------

# @router.get("/investments/holdings", response_model=list[schemas.InvestmentHoldingOut])
# def get_investment_holdings(db: Session = Depends(get_db)):
#     return crud.list_investment_holdings(db)


@router.get("/investments/holdings/{holding_id}/transactions", response_model=list[schemas.InvestmentLogEntryOut])
def get_holding_transactions(holding_id: int, db: Session = Depends(get_db)):
    return crud.list_holding_transactions(db, holding_id)



@router.get("/{investment_id}", response_model=schemas.InvestmentOut)
def get_investment(
    investment_id: int,
    db: Session = Depends(get_db),
):
    transaction = crud.get_investment(
        db,
        investment_id,
    )

    if transaction is None:
        raise HTTPException(
            status_code=404,
            detail="Investment not found",
        )

    return _to_investment_out(transaction)


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------

@router.put("/{investment_id}", response_model=schemas.InvestmentOut)
def update_investment(
    investment_id: int,
    payload: schemas.InvestmentCreate,
    db: Session = Depends(get_db),
):
    transaction = crud.get_investment(
        db,
        investment_id,
    )

    if transaction is None:
        raise HTTPException(
            status_code=404,
            detail="Investment not found",
        )

    _validate_investment_references(
    db,
    payload,
)

    updated = crud.update_investment(
        db,
        transaction,
        payload,
    )

    return _to_investment_out(updated)


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

@router.delete("/{investment_id}", status_code=204)
def delete_investment(
    investment_id: int,
    db: Session = Depends(get_db),
):
    transaction = crud.get_investment(
        db,
        investment_id,
    )

    if transaction is None:
        raise HTTPException(
            status_code=404,
            detail="Investment not found",
        )

    crud.delete_investment(
        db,
        transaction,
    )

    return None