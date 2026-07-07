from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db

router = APIRouter(prefix="/borrowing", tags=["borrowing"])


# ---------------------------------------------------------------------------
# Mappers
# ---------------------------------------------------------------------------

def _to_repayment_out(repayment: models.BorrowingRepayment) -> schemas.BorrowingRepaymentOut:
    txn = repayment.transaction
    return schemas.BorrowingRepaymentOut(
        id=repayment.id,
        date=txn.date,
        amount=txn.amount,
        notes=txn.notes,
        account=txn.account,
    )


def _to_borrowing_out(agreement: models.BorrowingAgreement) -> schemas.BorrowingOut:
    txn = agreement.transaction
    computed = crud.compute_borrowing_status(agreement, today=date.today())

    return schemas.BorrowingOut(
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

def _validate_borrowing_references(db: Session, account_id: int) -> None:
    if db.get(models.Account, account_id) is None:
        raise HTTPException(status_code=400, detail="account_id does not exist")


def _get_agreement_or_404(db: Session, borrowing_id: int) -> models.BorrowingAgreement:
    agreement = crud.get_borrowing(db, borrowing_id)
    if agreement is None:
        raise HTTPException(status_code=404, detail="Borrowing agreement not found")
    return agreement


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

@router.post("", response_model=schemas.BorrowingOut, status_code=201)
def add_borrowing(
    payload: schemas.BorrowingCreate,
    db: Session = Depends(get_db),
):
    _validate_borrowing_references(db, payload.account_id)

    agreement = crud.create_borrowing(db, payload)

    return _to_borrowing_out(agreement)


# ---------------------------------------------------------------------------
# Read All
# ---------------------------------------------------------------------------

@router.get("", response_model=list[schemas.BorrowingOut])
def get_borrowings(db: Session = Depends(get_db)):
    agreements = crud.list_borrowings(db)
    return [_to_borrowing_out(a) for a in agreements]


# ---------------------------------------------------------------------------
# Read One
# ---------------------------------------------------------------------------

@router.get("/{borrowing_id}", response_model=schemas.BorrowingOut)
def get_borrowing(
    borrowing_id: int,
    db: Session = Depends(get_db),
):
    agreement = _get_agreement_or_404(db, borrowing_id)
    return _to_borrowing_out(agreement)


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------

@router.put("/{borrowing_id}", response_model=schemas.BorrowingOut)
def update_borrowing(
    borrowing_id: int,
    payload: schemas.BorrowingCreate,
    db: Session = Depends(get_db),
):
    agreement = _get_agreement_or_404(db, borrowing_id)

    _validate_borrowing_references(db, payload.account_id)

    updated = crud.update_borrowing(db, agreement, payload)

    return _to_borrowing_out(updated)


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

@router.delete("/{borrowing_id}", status_code=204)
def delete_borrowing(
    borrowing_id: int,
    db: Session = Depends(get_db),
):
    agreement = _get_agreement_or_404(db, borrowing_id)

    crud.delete_borrowing(db, agreement)

    return None


# ---------------------------------------------------------------------------
# Add Repayment (nested sub-resource)
# ---------------------------------------------------------------------------

@router.post("/{borrowing_id}/repayments", response_model=schemas.BorrowingOut, status_code=201)
def add_repayment(
    borrowing_id: int,
    payload: schemas.BorrowingRepaymentCreate,
    db: Session = Depends(get_db),
):
    agreement = _get_agreement_or_404(db, borrowing_id)

    _validate_borrowing_references(db, payload.account_id)

    crud.add_borrowing_repayment(db, agreement, payload)

    db.refresh(agreement)
    return _to_borrowing_out(agreement)


# ---------------------------------------------------------------------------
# Delete Repayment (nested sub-resource)
# ---------------------------------------------------------------------------

@router.delete("/{borrowing_id}/repayments/{repayment_id}", response_model=schemas.BorrowingOut)
def delete_repayment(
    borrowing_id: int,
    repayment_id: int,
    db: Session = Depends(get_db),
):
    agreement = _get_agreement_or_404(db, borrowing_id)

    repayment = crud.get_borrowing_repayment(db, agreement, repayment_id)
    if repayment is None:
        raise HTTPException(status_code=404, detail="Repayment not found on this agreement")

    crud.delete_borrowing_repayment(db, repayment)

    db.refresh(agreement)
    return _to_borrowing_out(agreement)