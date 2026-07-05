from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db

router = APIRouter(prefix="/expenses", tags=["expenses"])


def _to_expense_out(transaction) -> schemas.ExpenseOut:
    """
    Assembles the flat ExpenseOut response from a Transaction row plus its
    linked ExpenseDetail — built explicitly here rather than relying on
    Pydantic's from_attributes across two joined tables, since the two
    ORM objects don't share a single flat attribute namespace.
    """
    detail = transaction.expense_detail
    return schemas.ExpenseOut(
        id=transaction.id,
        date=transaction.date,
        amount=transaction.amount,
        notes=transaction.notes,
        account=transaction.account,
        category=detail.category,
        subcategory=detail.subcategory,
        merchant=detail.merchant,
        payment_method=detail.payment_method,
        need_or_want=detail.need_or_want,
        tags=detail.tags,
    )


@router.post("", response_model=schemas.ExpenseOut, status_code=201)
def add_expense(payload: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    category = db.get(models.Category, payload.category_id)
    if category is None:
        raise HTTPException(status_code=400, detail="category_id does not exist")

    transaction = crud.create_expense(db, payload)
    return _to_expense_out(transaction)


@router.get("", response_model=list[schemas.ExpenseOut])
def get_expenses(month: Optional[str] = None, db: Session = Depends(get_db)):
    """month: optional "YYYY-MM" filter, e.g. /expenses?month=2026-07"""
    transactions = crud.list_expenses(db, month=month)
    return [_to_expense_out(t) for t in transactions]