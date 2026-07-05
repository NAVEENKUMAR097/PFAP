from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(tags=["master-data"])


@router.get("/categories", response_model=list[schemas.CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).filter(models.Category.is_active.is_(True)).order_by(models.Category.name).all()


@router.get("/payment-methods", response_model=list[schemas.PaymentMethodOut])
def get_payment_methods(db: Session = Depends(get_db)):
    return (
        db.query(models.PaymentMethod)
        .filter(models.PaymentMethod.is_active.is_(True))
        .order_by(models.PaymentMethod.name)
        .all()
    )


@router.get("/accounts", response_model=list[schemas.AccountOut])
def get_accounts(db: Session = Depends(get_db)):
    return db.query(models.Account).filter(models.Account.is_active.is_(True)).order_by(models.Account.name).all()