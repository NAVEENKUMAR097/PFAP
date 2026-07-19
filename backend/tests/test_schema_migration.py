import unittest

from sqlalchemy import create_engine, inspect, text

from app.database import run_schema_migrations


class SchemaMigrationTest(unittest.TestCase):
    def test_run_schema_migrations_adds_recurring_columns(self):
        engine = create_engine("sqlite:///:memory:")
        with engine.begin() as conn:
            conn.execute(text("CREATE TABLE transactions (id INTEGER PRIMARY KEY, transaction_type TEXT, date TEXT, amount REAL, account_id INTEGER, notes TEXT, created_at TEXT)"))
            conn.execute(text("CREATE TABLE recurring_transactions (id INTEGER PRIMARY KEY, name TEXT, amount REAL, transaction_type TEXT, status TEXT, account_id INTEGER, frequency TEXT, start_date TEXT, next_due_date TEXT, created_at TEXT)"))

        run_schema_migrations(engine)

        inspector = inspect(engine)
        columns = {col["name"] for col in inspector.get_columns("transactions")}

        self.assertIn("is_recurring", columns)
        self.assertIn("recurring_transaction_id", columns)
        self.assertIn("execution_date", columns)
        self.assertIn("execution_status", columns)

        recurring_columns = {col["name"] for col in inspector.get_columns("recurring_transactions")}
        self.assertIn("investment_holding_id", recurring_columns)


if __name__ == "__main__":
    unittest.main()
