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


@router.get("/income-sources", response_model=list[schemas.IncomeSourceOut])
def get_income_sources(db: Session = Depends(get_db)):
    return (
        db.query(models.IncomeSource)
        .filter(models.IncomeSource.is_active.is_(True))
        .order_by(models.IncomeSource.name)
        .all()
    )


@router.get("/investment-types", response_model=list[schemas.InvestmentTypeOut])
def get_investment_types(db: Session = Depends(get_db)):
    return (
        db.query(models.InvestmentType)
        .filter(models.InvestmentType.is_active.is_(True))
        .order_by(models.InvestmentType.name)
        .all()
    )


@router.get("/people", response_model=list[schemas.PersonOut])
def get_people(db: Session = Depends(get_db)):
    """
    People aren't pre-seeded (unlike Category/IncomeSource/InvestmentType)
    — they're created on-demand the first time you type a new name into
    the Lending form (see get_or_create_person in crud.py). This endpoint
    lists whoever already exists, so the form can offer autocomplete
    instead of you retyping "Rahul" and risking a near-duplicate entry.
    """
    return db.query(models.Person).filter(models.Person.is_active.is_(True)).order_by(models.Person.name).all()