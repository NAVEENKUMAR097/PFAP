from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db

router = APIRouter(tags=["master-data"])


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------

@router.get("/categories", response_model=list[schemas.CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).filter(models.Category.is_active.is_(True)).order_by(models.Category.name).all()


@router.post("/categories", response_model=schemas.CategoryOut, status_code=201)
def create_category(payload: schemas.MasterDataCreatePayload, db: Session = Depends(get_db)):
    return crud.create_master_data_item(db, models.Category, payload.name)


@router.put("/categories/{item_id}", response_model=schemas.CategoryOut)
def update_category(item_id: int, payload: schemas.MasterDataCreatePayload, db: Session = Depends(get_db)):
    item = crud.get_master_data_item(db, models.Category, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Category not found")
    return crud.update_master_data_item(db, item, name=payload.name)

@router.put("/accounts/{item_id}/balance", response_model=schemas.AccountOut)
def set_account_balance(
    item_id: int, payload: schemas.AccountBalanceAdjustment, db: Session = Depends(get_db)
):
    item = crud.get_master_data_item(db, models.Account, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Account not found")
    return crud.set_account_current_balance(db, item, payload.current_balance)


@router.delete("/categories/{item_id}", status_code=204)
def deactivate_category(item_id: int, db: Session = Depends(get_db)):
    """Soft-deactivate — sets is_active=False, never deletes the row. Safe
    even if the category is referenced by existing expenses/budgets,
    since nothing is actually removed."""
    item = crud.get_master_data_item(db, models.Category, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Category not found")
    crud.update_master_data_item(db, item, is_active=False)
    return None


# ---------------------------------------------------------------------------
# Payment Methods
# ---------------------------------------------------------------------------

@router.get("/payment-methods", response_model=list[schemas.PaymentMethodOut])
def get_payment_methods(db: Session = Depends(get_db)):
    return (
        db.query(models.PaymentMethod)
        .filter(models.PaymentMethod.is_active.is_(True))
        .order_by(models.PaymentMethod.name)
        .all()
    )


@router.post("/payment-methods", response_model=schemas.PaymentMethodOut, status_code=201)
def create_payment_method(payload: schemas.MasterDataCreatePayload, db: Session = Depends(get_db)):
    return crud.create_master_data_item(db, models.PaymentMethod, payload.name)


@router.put("/payment-methods/{item_id}", response_model=schemas.PaymentMethodOut)
def update_payment_method(
    item_id: int, payload: schemas.MasterDataCreatePayload, db: Session = Depends(get_db)
):
    item = crud.get_master_data_item(db, models.PaymentMethod, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Payment method not found")
    return crud.update_master_data_item(db, item, name=payload.name)


@router.delete("/payment-methods/{item_id}", status_code=204)
def deactivate_payment_method(item_id: int, db: Session = Depends(get_db)):
    item = crud.get_master_data_item(db, models.PaymentMethod, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Payment method not found")
    crud.update_master_data_item(db, item, is_active=False)
    return None


# ---------------------------------------------------------------------------
# Accounts
# ---------------------------------------------------------------------------

@router.get("/accounts", response_model=list[schemas.AccountOut])
def get_accounts(db: Session = Depends(get_db)):
    return db.query(models.Account).filter(models.Account.is_active.is_(True)).order_by(models.Account.name).all()


@router.post("/accounts", response_model=schemas.AccountOut, status_code=201)
def create_account(payload: schemas.MasterDataCreatePayload, db: Session = Depends(get_db)):
    return crud.create_master_data_item(
        db, models.Account, payload.name, opening_balance=payload.opening_balance
    )


@router.put("/accounts/{item_id}", response_model=schemas.AccountOut)
def update_account(item_id: int, payload: schemas.MasterDataCreatePayload, db: Session = Depends(get_db)):
    item = crud.get_master_data_item(db, models.Account, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Account not found")
    return crud.update_master_data_item(db, item, name=payload.name)


@router.delete("/accounts/{item_id}", status_code=204)
def deactivate_account(item_id: int, db: Session = Depends(get_db)):
    item = crud.get_master_data_item(db, models.Account, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Account not found")
    crud.update_master_data_item(db, item, is_active=False)
    return None


# ---------------------------------------------------------------------------
# Income Sources
# ---------------------------------------------------------------------------

@router.get("/income-sources", response_model=list[schemas.IncomeSourceOut])
def get_income_sources(db: Session = Depends(get_db)):
    return (
        db.query(models.IncomeSource)
        .filter(models.IncomeSource.is_active.is_(True))
        .order_by(models.IncomeSource.name)
        .all()
    )


@router.post("/income-sources", response_model=schemas.IncomeSourceOut, status_code=201)
def create_income_source(payload: schemas.MasterDataCreatePayload, db: Session = Depends(get_db)):
    return crud.create_master_data_item(db, models.IncomeSource, payload.name)


@router.put("/income-sources/{item_id}", response_model=schemas.IncomeSourceOut)
def update_income_source(
    item_id: int, payload: schemas.MasterDataCreatePayload, db: Session = Depends(get_db)
):
    item = crud.get_master_data_item(db, models.IncomeSource, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Income source not found")
    return crud.update_master_data_item(db, item, name=payload.name)


@router.delete("/income-sources/{item_id}", status_code=204)
def deactivate_income_source(item_id: int, db: Session = Depends(get_db)):
    item = crud.get_master_data_item(db, models.IncomeSource, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Income source not found")
    crud.update_master_data_item(db, item, is_active=False)
    return None


# ---------------------------------------------------------------------------
# Investment Types
# ---------------------------------------------------------------------------

@router.get("/investment-types", response_model=list[schemas.InvestmentTypeOut])
def get_investment_types(db: Session = Depends(get_db)):
    return (
        db.query(models.InvestmentType)
        .filter(models.InvestmentType.is_active.is_(True))
        .order_by(models.InvestmentType.name)
        .all()
    )


@router.post("/investment-types", response_model=schemas.InvestmentTypeOut, status_code=201)
def create_investment_type(payload: schemas.MasterDataCreatePayload, db: Session = Depends(get_db)):
    return crud.create_master_data_item(db, models.InvestmentType, payload.name)


@router.put("/investment-types/{item_id}", response_model=schemas.InvestmentTypeOut)
def update_investment_type(
    item_id: int, payload: schemas.MasterDataCreatePayload, db: Session = Depends(get_db)
):
    item = crud.get_master_data_item(db, models.InvestmentType, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Investment type not found")
    return crud.update_master_data_item(db, item, name=payload.name)


@router.delete("/investment-types/{item_id}", status_code=204)
def deactivate_investment_type(item_id: int, db: Session = Depends(get_db)):
    item = crud.get_master_data_item(db, models.InvestmentType, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Investment type not found")
    crud.update_master_data_item(db, item, is_active=False)
    return None


# ---------------------------------------------------------------------------
# People
# ---------------------------------------------------------------------------

@router.get("/people", response_model=list[schemas.PersonOut])
def get_people(db: Session = Depends(get_db)):
    return db.query(models.Person).filter(models.Person.is_active.is_(True)).order_by(models.Person.name).all()


@router.post("/people", response_model=schemas.PersonOut, status_code=201)
def create_person(payload: schemas.MasterDataCreatePayload, db: Session = Depends(get_db)):
    return crud.create_master_data_item(db, models.Person, payload.name)


@router.put("/people/{item_id}", response_model=schemas.PersonOut)
def update_person(item_id: int, payload: schemas.MasterDataCreatePayload, db: Session = Depends(get_db)):
    item = crud.get_master_data_item(db, models.Person, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Person not found")
    return crud.update_master_data_item(db, item, name=payload.name)


@router.delete("/people/{item_id}", status_code=204)
def deactivate_person(item_id: int, db: Session = Depends(get_db)):
    item = crud.get_master_data_item(db, models.Person, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Person not found")
    crud.update_master_data_item(db, item, is_active=False)
    return None