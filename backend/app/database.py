"""
Database connection setup.

Supports both SQLite (development) and PostgreSQL (production)
via environment-based configuration.
"""
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import config

# Use database URL from environment configuration
SQLALCHEMY_DATABASE_URL = config.DATABASE_URL

# SQLite-specific connect_args only applied when using SQLite
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=config.database_connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def run_schema_migrations(engine) -> None:
    """Apply lightweight schema migrations for existing SQLite databases."""
    inspector = inspect(engine)
    if not inspector.has_table("transactions"):
        return

    columns = {col["name"] for col in inspector.get_columns("transactions")}

    with engine.begin() as conn:
        if "is_recurring" not in columns:
            conn.execute(text("ALTER TABLE transactions ADD COLUMN is_recurring BOOLEAN NOT NULL DEFAULT 0"))
        if "recurring_transaction_id" not in columns:
            conn.execute(text("ALTER TABLE transactions ADD COLUMN recurring_transaction_id INTEGER"))
        if "execution_date" not in columns:
            conn.execute(text("ALTER TABLE transactions ADD COLUMN execution_date DATE"))
        if "execution_status" not in columns:
            conn.execute(text("ALTER TABLE transactions ADD COLUMN execution_status VARCHAR(20)"))

    # Migrate investment_details table
    if inspector.has_table("investment_details"):
        inv_columns = {col["name"] for col in inspector.get_columns("investment_details")}
        with engine.begin() as conn:
            if "holding_id" not in inv_columns:
                conn.execute(text("ALTER TABLE investment_details ADD COLUMN holding_id INTEGER"))

    # Create investment_holdings table if it doesn't exist
    if not inspector.has_table("investment_holdings"):
        with engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE investment_holdings (
                    id INTEGER PRIMARY KEY,
                    investment_type_id INTEGER NOT NULL,
                    broker_id INTEGER,
                    account_id INTEGER NOT NULL,
                    total_invested FLOAT NOT NULL DEFAULT 0,
                    transaction_count INTEGER NOT NULL DEFAULT 0,
                    first_investment_date DATE,
                    last_investment_date DATE,
                    total_units FLOAT,
                    average_cost_per_unit FLOAT,
                    current_value FLOAT,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    FOREIGN KEY (investment_type_id) REFERENCES investment_types (id),
                    FOREIGN KEY (broker_id) REFERENCES brokers (id),
                    FOREIGN KEY (account_id) REFERENCES accounts (id),
                    UNIQUE (investment_type_id, broker_id, account_id)
                )
            """))

    # Backfill holdings from existing investment transactions
    if inspector.has_table("investment_holdings") and inspector.has_table("investment_details"):
        with engine.begin() as conn:
            # Check if holdings are empty (first run)
            result = conn.execute(text("SELECT COUNT(*) FROM investment_holdings")).scalar()
            if result == 0:
                # Create holdings from existing investment transactions
                conn.execute(text("""
                    INSERT INTO investment_holdings (
                        investment_type_id, broker_id, account_id, total_invested, 
                        transaction_count, first_investment_date, last_investment_date,
                        created_at, updated_at
                    )
                    SELECT 
                        id.investment_type_id,
                        id.broker_id,
                        t.account_id,
                        SUM(t.amount),
                        COUNT(t.id),
                        MIN(t.date),
                        MAX(t.date),
                        datetime('now'),
                        datetime('now')
                    FROM investment_details id
                    JOIN transactions t ON t.id = id.transaction_id
                    WHERE t.transaction_type = 'investment'
                    GROUP BY id.investment_type_id, id.broker_id, t.account_id
                """))
                
                # Link investment_details to their holdings
                conn.execute(text("""
                    UPDATE investment_details
                    SET holding_id = (
                        SELECT h.id FROM investment_holdings h
                        WHERE h.investment_type_id = investment_details.investment_type_id
                        AND (h.broker_id = investment_details.broker_id OR (h.broker_id IS NULL AND investment_details.broker_id IS NULL))
                        AND h.account_id = (SELECT account_id FROM transactions WHERE transactions.id = investment_details.transaction_id)
                    )
                """))

    # Create template tables for recurring transaction references
    if not inspector.has_table("expense_templates"):
        with engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE expense_templates (
                    id INTEGER PRIMARY KEY,
                    name VARCHAR(150) NOT NULL,
                    amount FLOAT NOT NULL,
                    category_id INTEGER NOT NULL,
                    subcategory_id INTEGER,
                    payment_method_id INTEGER NOT NULL,
                    account_id INTEGER NOT NULL,
                    merchant_name VARCHAR(150),
                    need_or_want VARCHAR(10),
                    notes VARCHAR(500),
                    tags VARCHAR(255),
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_at DATETIME NOT NULL,
                    FOREIGN KEY (category_id) REFERENCES categories (id),
                    FOREIGN KEY (subcategory_id) REFERENCES subcategories (id),
                    FOREIGN KEY (payment_method_id) REFERENCES payment_methods (id),
                    FOREIGN KEY (account_id) REFERENCES accounts (id)
                )
            """))

    if not inspector.has_table("income_templates"):
        with engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE income_templates (
                    id INTEGER PRIMARY KEY,
                    name VARCHAR(150) NOT NULL,
                    amount FLOAT NOT NULL,
                    income_source_id INTEGER NOT NULL,
                    account_id INTEGER NOT NULL,
                    notes VARCHAR(500),
                    tags VARCHAR(255),
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_at DATETIME NOT NULL,
                    FOREIGN KEY (income_source_id) REFERENCES income_sources (id),
                    FOREIGN KEY (account_id) REFERENCES accounts (id)
                )
            """))

    if not inspector.has_table("investment_templates"):
        with engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE investment_templates (
                    id INTEGER PRIMARY KEY,
                    name VARCHAR(150) NOT NULL,
                    amount FLOAT NOT NULL,
                    investment_type_id INTEGER NOT NULL,
                    broker_id INTEGER,
                    account_id INTEGER NOT NULL,
                    notes VARCHAR(500),
                    tags VARCHAR(255),
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_at DATETIME NOT NULL,
                    FOREIGN KEY (investment_type_id) REFERENCES investment_types (id),
                    FOREIGN KEY (broker_id) REFERENCES brokers (id),
                    FOREIGN KEY (account_id) REFERENCES accounts (id)
                )
            """))

    # Update recurring_transactions table to use the current reference model.
    # Existing databases may still have the legacy investment_template_id column,
    # while the current ORM expects investment_holding_id.
    if inspector.has_table("recurring_transactions"):
        rt_columns = {col["name"] for col in inspector.get_columns("recurring_transactions")}
        with engine.begin() as conn:
            if "expense_template_id" not in rt_columns:
                conn.execute(text("ALTER TABLE recurring_transactions ADD COLUMN expense_template_id INTEGER"))
            if "income_template_id" not in rt_columns:
                conn.execute(text("ALTER TABLE recurring_transactions ADD COLUMN income_template_id INTEGER"))
            if "investment_holding_id" not in rt_columns:
                conn.execute(text("ALTER TABLE recurring_transactions ADD COLUMN investment_holding_id INTEGER"))
            if "investment_template_id" not in rt_columns:
                conn.execute(text("ALTER TABLE recurring_transactions ADD COLUMN investment_template_id INTEGER"))
            if "lending_id" not in rt_columns:
                conn.execute(text("ALTER TABLE recurring_transactions ADD COLUMN lending_id INTEGER"))
            if "borrowing_id" not in rt_columns:
                conn.execute(text("ALTER TABLE recurring_transactions ADD COLUMN borrowing_id INTEGER"))


def get_db():
    """FastAPI dependency — yields a session per-request, always closed after."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()