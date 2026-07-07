from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db

router = APIRouter(prefix="/lending", tags=["lending"])


# ---------------------------------------------------------------------------
# Mappers
# ---------------------------------------------------------------------------

def _to_repayment_out(repayment: models.LendingRepayment) -> schemas.LendingRepaymentOut:
    txn = repayment.transaction
    return schemas.LendingRepaymentOut(
        id=repayment.id,
        date=txn.date,
        amount=txn.amount,
        notes=txn.notes,
        account=txn.account,
    )


def _to_lending_out(agreement: models.LendingAgreement) -> schemas.LendingOut:
    txn = agreement.transaction
    computed = crud.compute_lending_status(agreement, today=date.today())

    return schemas.LendingOut(
        id=agreement.id,
        date=txn.date,
        amount=txn.amount,
        account=txn.account,
        person=agreement.person,
        due_date=agreement.due_date,
        notes=agreement.notes,
        total_repaid=computed["total_repaid"],
        remaining=computed["remaining"],
        status=computed["status"],
        repayments=[_to_repayment_out(r) for r in agreement.repayments],
    )


# ---------------------------------------------------------------------------
# Validation Helpers
# ---------------------------------------------------------------------------

def _validate_lending_references(db: Session, account_id: int) -> None:
    if db.get(models.Account, account_id) is None:
        raise HTTPException(status_code=400, detail="account_id does not exist")


def _get_agreement_or_404(db: Session, lending_id: int) -> models.LendingAgreement:
    agreement = crud.get_lending(db, lending_id)
    if agreement is None:
        raise HTTPException(status_code=404, detail="Lending agreement not found")
    return agreement


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

@router.post("", response_model=schemas.LendingOut, status_code=201)
def add_lending(
    payload: schemas.LendingCreate,
    db: Session = Depends(get_db),
):
    _validate_lending_references(db, payload.account_id)

    agreement = crud.create_lending(db, payload)

    return _to_lending_out(agreement)


# ---------------------------------------------------------------------------
# Read All
# ---------------------------------------------------------------------------

@router.get("", response_model=list[schemas.LendingOut])
def get_lendings(db: Session = Depends(get_db)):
    agreements = crud.list_lendings(db)
    return [_to_lending_out(a) for a in agreements]


# ---------------------------------------------------------------------------
# Read One
# ---------------------------------------------------------------------------

@router.get("/{lending_id}", response_model=schemas.LendingOut)
def get_lending(
    lending_id: int,
    db: Session = Depends(get_db),
):
    agreement = _get_agreement_or_404(db, lending_id)
    return _to_lending_out(agreement)


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------

@router.put("/{lending_id}", response_model=schemas.LendingOut)
def update_lending(
    lending_id: int,
    payload: schemas.LendingCreate,
    db: Session = Depends(get_db),
):
    agreement = _get_agreement_or_404(db, lending_id)

    _validate_lending_references(db, payload.account_id)

    updated = crud.update_lending(db, agreement, payload)

    return _to_lending_out(updated)


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

@router.delete("/{lending_id}", status_code=204)
def delete_lending(
    lending_id: int,
    db: Session = Depends(get_db),
):
    agreement = _get_agreement_or_404(db, lending_id)

    crud.delete_lending(db, agreement)

    return None


# ---------------------------------------------------------------------------
# Add Repayment (nested sub-resource)
# ---------------------------------------------------------------------------

@router.post("/{lending_id}/repayments", response_model=schemas.LendingOut, status_code=201)
def add_repayment(
    lending_id: int,
    payload: schemas.LendingRepaymentCreate,
    db: Session = Depends(get_db),
):
    agreement = _get_agreement_or_404(db, lending_id)

    _validate_lending_references(db, payload.account_id)

    crud.add_lending_repayment(db, agreement, payload)

    # Returns the whole updated agreement (not just the new repayment) so
    # the frontend gets fresh total_repaid/remaining/status in one response
    # instead of needing a second GET.
    db.refresh(agreement)
    return _to_lending_out(agreement)


# ---------------------------------------------------------------------------
# Delete Repayment (nested sub-resource)
# ---------------------------------------------------------------------------

@router.delete("/{lending_id}/repayments/{repayment_id}", response_model=schemas.LendingOut)
def delete_repayment(
    lending_id: int,
    repayment_id: int,
    db: Session = Depends(get_db),
):
    agreement = _get_agreement_or_404(db, lending_id)

    repayment = crud.get_lending_repayment(db, agreement, repayment_id)
    if repayment is None:
        raise HTTPException(status_code=404, detail="Repayment not found on this agreement")

    crud.delete_lending_repayment(db, repayment)

    db.refresh(agreement)
    return _to_lending_out(agreement)