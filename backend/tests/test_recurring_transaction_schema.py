from datetime import date, datetime

from app.schemas import RecurringTransactionOut


def test_recurring_transaction_out_accepts_datetime_created_at():
    payload = {
        "id": 1,
        "name": "Rent",
        "amount": 100.0,
        "transaction_type": "expense",
        "status": "active",
        "frequency": "monthly",
        "start_date": "2026-07-10",
        "end_date": None,
        "next_due_date": "2026-07-10",
        "notes": None,
        "tags": None,
        "created_at": datetime(2026, 7, 10, 22, 27, 40, 542097),
        "account": {"id": 1, "name": "Main"},
    }

    model = RecurringTransactionOut.model_validate(payload)

    assert model.created_at == date(2026, 7, 10)
