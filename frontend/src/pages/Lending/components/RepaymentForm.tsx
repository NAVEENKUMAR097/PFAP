import { useState, type FormEvent } from 'react';
import type { AccountOut, LendingRepaymentCreatePayload } from '../../../services/types';

interface RepaymentFormProps {
  accounts: AccountOut[];
  onSubmit: (payload: LendingRepaymentCreatePayload) => Promise<void>;
  onDone: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function RepaymentForm({ accounts, onSubmit, onDone }: RepaymentFormProps) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [accountId, setAccountId] = useState(accounts[0] ? String(accounts[0].id) : '');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setFormError('Enter an amount greater than 0.');
      return;
    }
    if (!accountId) {
      setFormError('Account is required.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ date, amount: parsedAmount, account_id: Number(accountId) });
      onDone();
    } catch {
      setFormError('Could not record the repayment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2 rounded-xl bg-surface-2 p-3">
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          className="flex-1 rounded-lg bg-base px-2.5 py-1.5 text-sm text-ink outline-none focus:ring-2 focus:ring-gold"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg bg-base px-2.5 py-1.5 text-sm text-ink outline-none focus:ring-2 focus:ring-gold"
        />
      </div>
      <select
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
        className="rounded-lg bg-base px-2.5 py-1.5 text-sm text-ink outline-none focus:ring-2 focus:ring-gold"
      >
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>

      {formError && <p className="text-xs text-negative">{formError}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-lg bg-gold py-1.5 text-xs font-medium text-base disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Record repayment'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg bg-base px-3 py-1.5 text-xs text-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}