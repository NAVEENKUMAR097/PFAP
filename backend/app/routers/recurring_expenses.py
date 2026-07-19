from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/recurring", tags=["recurring"])


def _out(obj) -> schemas.RecurringExpenseOut:
    return schemas.RecurringExpenseOut.model_validate(obj)


@router.get("/", response_model=list[schemas.RecurringExpenseOut])
def list_recurring(db: Session = Depends(get_db)):
    return [_out(r) for r in crud.list_recurring_expenses(db)]


@router.post("/", response_model=schemas.RecurringExpenseOut, status_code=201)
def create_recurring(payload: schemas.RecurringExpenseCreate, db: Session = Depends(get_db)):
    return _out(crud.create_recurring_expense(db, payload))


@router.get("/{recurring_id}", response_model=schemas.RecurringExpenseOut)
def get_recurring(recurring_id: int, db: Session = Depends(get_db)):
    obj = crud.get_recurring_expense(db, recurring_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Recurring expense not found")
    return _out(obj)


@router.put("/{recurring_id}", response_model=schemas.RecurringExpenseOut)
def update_recurring(recurring_id: int, payload: schemas.RecurringExpenseCreate, db: Session = Depends(get_db)):
    obj = crud.get_recurring_expense(db, recurring_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Recurring expense not found")
    return _out(crud.update_recurring_expense(db, obj, payload))


@router.delete("/{recurring_id}", status_code=204)
def delete_recurring(recurring_id: int, db: Session = Depends(get_db)):
    obj = crud.get_recurring_expense(db, recurring_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Recurring expense not found")
    crud.delete_recurring_expense(db, obj)


@router.post("/{recurring_id}/log-now", response_model=schemas.ExpenseOut)
def log_now(recurring_id: int, db: Session = Depends(get_db)):
    obj = crud.get_recurring_expense(db, recurring_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Recurring expense not found")
    transaction = crud.log_recurring_now(db, obj)
    return schemas.ExpenseOut.model_validate(transaction)
