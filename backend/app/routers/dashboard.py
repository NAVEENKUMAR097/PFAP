from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=schemas.DashboardSummary)
def get_summary(month: str | None = None, db: Session = Depends(get_db)):
    """
    Defaults to the current month if not specified. Only expense KPIs
    exist today — Monthly Income / Savings Rate / Net Worth join in once
    the Income and Investment modules are built on the same transactions
    core, at which point this endpoint grows, not the schema.
    """
    target_month = month or date.today().strftime("%Y-%m")
    return crud.get_dashboard_summary(db, target_month)