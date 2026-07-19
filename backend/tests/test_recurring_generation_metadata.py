import unittest
from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import models
from app.database import Base
from app import crud, schemas


class RecurringGenerationMetadataTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

        self.account = models.Account(name="Main")
        self.category = models.Category(name="Food")
        self.payment = models.PaymentMethod(name="Card")
        self.db.add_all([self.account, self.category, self.payment])
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_recurring_expense_generates_transaction_with_metadata(self):
        recurring = models.RecurringTransaction(
            name="Groceries",
            amount=25.0,
            transaction_type=models.RecurringTransactionType.expense,
            status=models.RecurringStatus.active,
            account_id=self.account.id,
            frequency=models.RecurringFrequency.monthly,
            start_date=date(2026, 7, 1),
            end_date=None,
            next_due_date=date(2026, 7, 5),
            notes=None,
            tags=None,
            category_id=self.category.id,
            payment_method_id=self.payment.id,
        )
        self.db.add(recurring)
        self.db.commit()
        self.db.refresh(recurring)

        execution_date = recurring.next_due_date
        result = crud.log_recurring_transaction_now(self.db, recurring)

        created_transaction = self.db.query(models.Transaction).filter(
            models.Transaction.id == result.transaction_id
        ).one()

        self.db.refresh(recurring)
        recurring_out = schemas.RecurringTransactionOut.model_validate(recurring)

        self.assertTrue(created_transaction.is_recurring)
        self.assertEqual(created_transaction.recurring_transaction_id, recurring.id)
        self.assertEqual(created_transaction.execution_date, execution_date)
        self.assertEqual(created_transaction.execution_status, "generated")
        self.assertEqual(result.date, execution_date)
        self.assertEqual(recurring_out.generated_transaction_ids, [created_transaction.id])


if __name__ == "__main__":
    unittest.main()
