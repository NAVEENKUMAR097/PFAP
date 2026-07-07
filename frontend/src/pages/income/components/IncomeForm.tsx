import { useEffect, useState, type FormEvent } from 'react';
import type { AccountOut, IncomeSourceOut, IncomeOut, IncomeCreatePayload } from '../../../services/types';

interface IncomeFormProps {
  accounts: AccountOut[];
  incomeSources: IncomeSourceOut[];
  editingIncome: IncomeOut | null;
  submitting: boolean;
  onSubmit: (payload: IncomeCreatePayload) => Promise<void>;
  onCancelEdit: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function IncomeForm({
  accounts,
  incomeSources,
  editingIncome,
  submitting,
  onSubmit,
  onCancelEdit,
}: IncomeFormProps) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [accountId, setAccountId] = useState('');
  const [incomeSourceId, setIncomeSourceId] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const isEditing = editingIncome !== null;

  // Defaults selects to the first available option once master data loads,
  // so the form is submittable immediately rather than starting empty.
  useEffect(() => {
    if (!isEditing && accounts.length > 0 && !accountId) setAccountId(String(accounts[0].id));
    if (!isEditing && incomeSources.length > 0 && !incomeSourceId) {
      setIncomeSourceId(String(incomeSources[0].id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, incomeSources]);

  // Populates the form when entering edit mode; clears it when leaving.
  useEffect(() => {
    if (editingIncome) {
      setAmount(String(editingIncome.amount));
      setDate(editingIncome.date);
      setAccountId(String(editingIncome.account.id));
      setIncomeSourceId(String(editingIncome.income_source.id));
      setNotes(editingIncome.notes ?? '');
    } else {
      setAmount('');
      setDate(todayIso());
      setNotes('');
    }
  }, [editingIncome]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setFormError('Enter an amount greater than 0.');
      return;
    }
    if (!accountId || !incomeSourceId) {
      setFormError('Account and income source are required.');
      return;
    }

    try {
      await onSubmit({
        date,
        amount: parsedAmount,
        account_id: Number(accountId),
        income_source_id: Number(incomeSourceId),
        notes: notes.trim() || null,
      });
      if (!isEditing) {
        setAmount('');
        setNotes('');
      }
    } catch {
      // useIncome already recorded the error; form state is intentionally
      // left as-is so the person doesn't lose what they typed.
    }
  }

  return (
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
          Account
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="rounded-xl bg-surface-2 px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-gold"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm text-muted">
          Source
          <select
            value={incomeSourceId}
            onChange={(e) => setIncomeSourceId(e.target.value)}
            className="rounded-xl bg-surface-2 px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-gold"
          >
            {incomeSources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Notes (optional)
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="rounded-xl bg-surface-2 px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-gold"
        />
      </label>

      {formError && <p className="text-sm text-negative">{formError}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="mt-1 flex-1 rounded-xl bg-gold py-2.5 text-sm font-medium text-base disabled:opacity-50"
        >
          {submitting ? 'Saving…' : isEditing ? 'Update Income' : 'Add Income'}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="mt-1 rounded-xl bg-surface-2 px-4 py-2.5 text-sm text-muted"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}