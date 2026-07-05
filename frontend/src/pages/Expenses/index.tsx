import { useEffect, useState, type FormEvent } from 'react';
import PageScaffold from '../../components/common/Pagescaffold';
import { listExpenses, createExpense } from '../../services/expenses';
import { getCategories, getPaymentMethods, getAccounts } from '../../services/masterData';
import type { CategoryOut, PaymentMethodOut, AccountOut, ExpenseOut } from '../../services/types';
import { formatCurrency } from '../../utils/currency';
import { ApiError } from '../../services/api';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ExpensesPage() {
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOut[]>([]);
  const [accounts, setAccounts] = useState<AccountOut[]>([]);
  const [expenses, setExpenses] = useState<ExpenseOut[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [notes, setNotes] = useState('');

  async function loadEverything() {
    setLoading(true);
    setError(null);
    try {
      const [categoriesRes, paymentMethodsRes, accountsRes, expensesRes] = await Promise.all([
        getCategories(),
        getPaymentMethods(),
        getAccounts(),
        listExpenses(),
      ]);
      setCategories(categoriesRes);
      setPaymentMethods(paymentMethodsRes);
      setAccounts(accountsRes);
      setExpenses(expensesRes);

      // Default the form's selects to the first available option so the
      // form is submittable immediately rather than starting on an empty value.
      if (categoriesRes.length > 0) setCategoryId(String(categoriesRes[0].id));
      if (paymentMethodsRes.length > 0) setPaymentMethodId(String(paymentMethodsRes[0].id));
      if (accountsRes.length > 0) setAccountId(String(accountsRes[0].id));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not reach the backend. Is it running on http://localhost:8000?',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEverything();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter an amount greater than 0.');
      return;
    }
    if (!categoryId || !paymentMethodId || !accountId) {
      setError('Category, payment method, and account are required.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createExpense({
        date,
        amount: parsedAmount,
        account_id: Number(accountId),
        category_id: Number(categoryId),
        payment_method_id: Number(paymentMethodId),
        merchant_name: merchantName.trim() || null,
        notes: notes.trim() || null,
      });
      setExpenses((prev) => [created, ...prev]);
      setAmount('');
      setMerchantName('');
      setNotes('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the expense.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageScaffold
      title="Expenses"
      description="Where your money went — by category, merchant, and payment method."
    >
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 rounded-2xl bg-surface p-4">
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm text-muted">
            Amount
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="rounded-xl bg-surface-2 px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-gold"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm text-muted">
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl bg-surface-2 px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-gold"
            />
          </label>
        </div>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm text-muted">
            Category
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="rounded-xl bg-surface-2 px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-gold"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm text-muted">
            Payment method
            <select
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(e.target.value)}
              className="rounded-xl bg-surface-2 px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-gold"
            >
              {paymentMethods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Merchant (optional)
          <input
            type="text"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            placeholder="e.g. Swiggy"
            className="rounded-xl bg-surface-2 px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-gold"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Notes (optional)
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-xl bg-surface-2 px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-gold"
          />
        </label>

        {error && <p className="text-sm text-negative">{error}</p>}

        <button
          type="submit"
          disabled={submitting || loading}
          className="mt-1 rounded-xl bg-gold py-2.5 text-sm font-medium text-base disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Add Expense'}
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-2">
        {loading && <p className="text-sm text-muted">Loading…</p>}

        {!loading && expenses.length === 0 && !error && (
          <p className="text-sm text-muted">No expenses yet — add your first one above.</p>
        )}

        {expenses.map((expense) => (
          <div
            key={expense.id}
            className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3"
          >
            <div className="flex flex-col">
              <span className="text-sm text-ink">{expense.category.name}</span>
              <span className="text-xs text-muted">
                {expense.date}
                {expense.merchant ? ` · ${expense.merchant.name}` : ''}
              </span>
            </div>
            <span className="font-display text-sm font-medium text-negative">
              −{formatCurrency(expense.amount)}
            </span>
          </div>
        ))}
      </div>
    </PageScaffold>
  );
}