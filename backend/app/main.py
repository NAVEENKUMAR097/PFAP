from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models, seed
from .database import Base, engine, SessionLocal
from .routers import dashboard, expenses, master_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    # create_all is fine for local prototyping; once the schema stabilizes,
    # switch to Alembic migrations so schema changes are tracked and
    # reversible instead of implicit.
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed.run_seed(db)
    finally:
        db.close()

    yield


app = FastAPI(title="PFAP API", version="0.1.0", lifespan=lifespan)

# Vite's default dev server port. Add your deployed frontend origin here
# once one exists.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(expenses.router)
app.include_router(master_data.router)
app.include_router(dashboard.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}