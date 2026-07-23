from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=schemas.AnalyticsSummary)
def get_analytics_summary(month: str | None = None, db: Session = Depends(get_db)):
    target_month = month or date.today().strftime("%Y-%m")
    return crud.get_analytics_summary(db, target_month)

@router.get("/net-worth", response_model=schemas.NetWorthSummary)
def get_net_worth(db: Session = Depends(get_db)):
    return crud.get_net_worth_summary(db)

@router.get("/net-worth-breakdown", response_model=schemas.NetWorthBreakdown)
def get_net_worth_breakdown(db: Session = Depends(get_db)):
    return crud.get_net_worth_breakdown(db)
