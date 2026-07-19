from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db

router = APIRouter(prefix="/recurring-transactions", tags=["recurring-transactions"])


# ---------------------------------------------------------------------------
# Mapper
# ---------------------------------------------------------------------------

def _to_recurring_transaction_out(obj: models.RecurringTransaction) -> schemas.RecurringTransactionOut:
    """Map RecurringTransaction model to output schema."""
    payload = schemas.RecurringTransactionOut.model_validate(obj)
    payload.generated_transaction_ids = [
        tx.id for tx in sorted(obj.generated_transactions, key=lambda item: item.id)
    ]
    return payload


# ---------------------------------------------------------------------------
# CRUD Endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=list[schemas.RecurringTransactionOut])
def list_recurring_transactions(
    transaction_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    List all recurring transactions with optional filtering.
    
    Query parameters:
    - transaction_type: Filter by type (expense, income, investment, lending, borrowing)
    - status: Filter by status (active, paused, completed, cancelled, failed)
    """
    transactions = crud.list_recurring_transactions(
        db,
        transaction_type=transaction_type,
        status=status
    )
    return [_to_recurring_transaction_out(t) for t in transactions]


@router.post("", response_model=schemas.RecurringTransactionOut, status_code=201)
def create_recurring_transaction(
    payload: schemas.RecurringTransactionCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new recurring transaction.
    
    The required fields depend on the transaction_type:
    - expense: category_id, payment_method_id (required)
    - income: income_source_id (required)
    - investment: investment_type_id (required)
    - lending/borrowing: person_name (required)
    """
    try:
        obj = crud.create_recurring_transaction(db, payload)
        return _to_recurring_transaction_out(obj)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{recurring_id}", response_model=schemas.RecurringTransactionOut)
def get_recurring_transaction(
    recurring_id: int,
    db: Session = Depends(get_db),
):
    """Get a specific recurring transaction by ID."""
    obj = crud.get_recurring_transaction(db, recurring_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    return _to_recurring_transaction_out(obj)


@router.put("/{recurring_id}", response_model=schemas.RecurringTransactionOut)
def update_recurring_transaction(
    recurring_id: int,
    payload: schemas.RecurringTransactionUpdate,
    db: Session = Depends(get_db),
):
    """
    Update a recurring transaction.
    
    All fields are optional - only provided fields will be updated.
    This allows changing amount, schedule, status, or type-specific fields.
    """
    obj = crud.get_recurring_transaction(db, recurring_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    
    try:
        updated = crud.update_recurring_transaction(db, obj, payload)
        return _to_recurring_transaction_out(updated)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{recurring_id}", status_code=204)
def delete_recurring_transaction(
    recurring_id: int,
    db: Session = Depends(get_db),
):
    """
    Delete (cancel) a recurring transaction.
    
    This is a soft delete - the status is set to 'cancelled'
    rather than removing the record from the database.
    """
    obj = crud.get_recurring_transaction(db, recurring_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    
    crud.delete_recurring_transaction(db, obj)
    return None


# ---------------------------------------------------------------------------
# Lifecycle Management Endpoints
# ---------------------------------------------------------------------------

@router.post("/{recurring_id}/log-now", response_model=schemas.RecurringTransactionLogOut)
def log_recurring_transaction_now(
    recurring_id: int,
    db: Session = Depends(get_db),
):
    """
    Execute a recurring transaction immediately.
    
    Creates the appropriate transaction type (expense, income, investment, etc.)
    based on the recurring transaction's configuration and advances the next_due_date.
    """
    obj = crud.get_recurring_transaction(db, recurring_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    
    try:
        result = crud.log_recurring_transaction_now(db, obj)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{recurring_id}/pause", response_model=schemas.RecurringTransactionOut)
def pause_recurring_transaction(
    recurring_id: int,
    db: Session = Depends(get_db),
):
    """
    Pause a recurring transaction.
    
    Paused transactions will not be processed by the scheduler
    until resumed.
    """
    obj = crud.get_recurring_transaction(db, recurring_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    
    try:
        paused = crud.pause_recurring_transaction(db, obj)
        return _to_recurring_transaction_out(paused)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{recurring_id}/resume", response_model=schemas.RecurringTransactionOut)
def resume_recurring_transaction(
    recurring_id: int,
    db: Session = Depends(get_db),
):
    """
    Resume a paused recurring transaction.
    
    Only transactions with status 'paused' can be resumed.
    """
    obj = crud.get_recurring_transaction(db, recurring_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    
    try:
        resumed = crud.resume_recurring_transaction(db, obj)
        return _to_recurring_transaction_out(resumed)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{recurring_id}/skip", response_model=schemas.RecurringTransactionOut)
def skip_recurring_transaction(
    recurring_id: int,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Skip the next due date for a recurring transaction.
    
    Advances next_due_date without creating a transaction.
    Optional reason can be provided for documentation.
    """
    obj = crud.get_recurring_transaction(db, recurring_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    
    try:
        skipped = crud.skip_recurring_transaction(db, obj, reason)
        return _to_recurring_transaction_out(skipped)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{recurring_id}/complete", response_model=schemas.RecurringTransactionOut)
def complete_recurring_transaction(
    recurring_id: int,
    db: Session = Depends(get_db),
):
    """
    Mark a recurring transaction as completed.
    
    Completed transactions will not be processed further.
    """
    obj = crud.get_recurring_transaction(db, recurring_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    
    completed = crud.complete_recurring_transaction(db, obj)
    return _to_recurring_transaction_out(completed)


@router.post("/{recurring_id}/cancel", response_model=schemas.RecurringTransactionOut)
def cancel_recurring_transaction(
    recurring_id: int,
    db: Session = Depends(get_db),
):
    """
    Cancel a recurring transaction.
    
    Cancelled transactions will not be processed further.
    This is equivalent to DELETE but keeps the record with status.
    """
    obj = crud.get_recurring_transaction(db, recurring_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    
    cancelled = crud.cancel_recurring_transaction(db, obj)
    return _to_recurring_transaction_out(cancelled)


# NOTE: The one-time /migrate-from-expenses endpoint was removed. There is
# no legacy production data to migrate, and the underlying crud function
# predated the template/holding-reference architecture.


# ---------------------------------------------------------------------------
# Scheduler Endpoint (for manual testing)
# ---------------------------------------------------------------------------

@router.post("/process-due", response_model=dict)
def process_due_transactions(
    db: Session = Depends(get_db),
):
    """
    Process all recurring transactions that are due today or overdue.
    
    This endpoint is primarily for testing and manual execution.
    In production, this would be called by a background scheduler.
    Returns statistics about processing results.
    """
    result = crud.process_due_recurring_transactions(db)
    return result