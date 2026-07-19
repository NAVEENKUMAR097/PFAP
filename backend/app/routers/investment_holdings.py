from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db

router = APIRouter(prefix="/investment-holdings", tags=["investment-holdings"])


def _to_holding_out(obj: models.InvestmentHolding) -> schemas.InvestmentHoldingOut:
    return schemas.InvestmentHoldingOut.model_validate(obj)


@router.get("", response_model=list[schemas.InvestmentHoldingOut])
def list_investment_holdings(
    account_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """List all investment holdings, optionally filtered by account."""
    query = db.query(models.InvestmentHolding)
    
    if account_id:
        query = query.filter(models.InvestmentHolding.account_id == account_id)
    
    holdings = query.order_by(models.InvestmentHolding.total_invested.desc()).all()
    return [_to_holding_out(h) for h in holdings]


@router.get("/{holding_id}", response_model=schemas.InvestmentHoldingOut)
def get_investment_holding(
    holding_id: int,
    db: Session = Depends(get_db),
):
    """Get a specific investment holding by ID."""
    holding = db.query(models.InvestmentHolding).filter(models.InvestmentHolding.id == holding_id).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Investment holding not found")
    return _to_holding_out(holding)
