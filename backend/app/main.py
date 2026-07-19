from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from . import models, seed
from .config import config
from .database import Base, engine, SessionLocal, run_schema_migrations
from .routers import (
    analytics,
    budget,
    borrowing,
    dashboard,
    expenses,
    income,
    investment_holdings,
    investments,
    lending,
    master_data,
    recurring_expenses,
    recurring_transactions,
    templates,
)

# Configure logging
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting PFAP API...")
    
    # For development, use create_all. For production, use Alembic migrations
    if config.ENVIRONMENT == "development":
        Base.metadata.create_all(bind=engine)
        run_schema_migrations(engine)
    
    db = SessionLocal()
    try:
        logger.info("Running seed data...")
        seed.run_seed(db)
        logger.info("Seed data completed")
    finally:
        db.close()
    
    logger.info("PFAP API startup complete")
    yield
    
    logger.info("Shutting down PFAP API...")


app = FastAPI(title="PFAP API", version="0.1.0", lifespan=lifespan)

# CORS configuration from environment
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for consistent error responses."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    if config.is_production:
        # In production, don't expose stack traces
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )
    else:
        # In development, include error details
        return JSONResponse(
            status_code=500,
            content={"detail": str(exc), "type": type(exc).__name__}
        )

app.include_router(expenses.router)
app.include_router(income.router)
app.include_router(investments.router)
app.include_router(investment_holdings.router)
app.include_router(lending.router)
app.include_router(borrowing.router)
app.include_router(budget.router)
app.include_router(analytics.router)
app.include_router(master_data.router)
app.include_router(dashboard.router)
app.include_router(recurring_expenses.router)
app.include_router(recurring_transactions.router)
app.include_router(templates.router)


@app.get("/health")
def health_check():
    """Health check endpoint for deployment platforms."""
    try:
        # Test database connection
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {
            "status": "healthy",
            "database": "connected",
            "version": "0.1.0",
            "environment": config.ENVIRONMENT
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "version": "0.1.0",
            "environment": config.ENVIRONMENT,
            "error": str(e)
        }
