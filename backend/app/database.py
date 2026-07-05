"""
Database connection setup.

SQLite is used for local development (approved as acceptable for the
prototype phase in PFAP_PROJECT_CONTEXT_v1.0). Because everything below
goes through SQLAlchemy's engine/session abstraction rather than raw SQL,
moving to PostgreSQL later is a one-line change to SQLALCHEMY_DATABASE_URL
— no model or query code changes.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

SQLALCHEMY_DATABASE_URL = "sqlite:///./pfap.db"

# check_same_thread=False is SQLite-specific (needed because FastAPI can
# use the same connection across threads); this line is removed entirely
# when the URL becomes a postgresql:// URL.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a session per-request, always closed after."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()