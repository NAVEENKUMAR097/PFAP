import { useEffect, useState, type FormEvent } from 'react';
import type { AccountOut, PersonOut, LendingOut, LendingCreatePayload } from '../../../services/types';

interface LendingFormProps {
  accounts: AccountOut[];
  people: PersonOut[];
  editingLending: LendingOut | null;
  submitting: boolean;
  onSubmit: (payload: LendingCreatePayload) => Promise<void>;
  onCancelEdit: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function LendingForm({
  accounts,
  people,
  editingLending,
  submitting,
  onSubmit,
  onCancelEdit,
}: LendingFormProps) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [accountId, setAccountId] = useState('');
  const [personName, setPersonName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const isEditing = editingLending !== null;

  useEffect(() => {
    if (!isEditing && accounts.length > 0 && !accountId) setAccountId(String(accounts[0].id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  useEffect(() => {
    if (editingLending) {
      setAmount(String(editingLending.amount));
      setDate(editingLending.date);
      setAccountId(String(editingLending.account.id));
      setPersonName(editingLending.person.name);
      setDueDate(editingLending.due_date ?? '');
      setNotes(editingLending.notes ?? '');
    } else {
      setAmount('');
      setDate(todayIso());
      setPersonName('');
      setDueDate('');
      setNotes('');
    }
  }, [editingLending]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setFormError('Enter an amount greater than 0.');
      return;
    }
    if (!accountId || !personName.trim()) {
      setFormError('Account and person are required.');
      return;
    }

    try {
      await onSubmit({
        date,
        amount: parsedAmount,
        account_id: Number(accountId),
        person_name: personName.trim(),
        due_date: dueDate || null,
        notes: notes.trim() || null,
      });
      if (!isEditing) {
        setAmount('');
        setPersonName('');
        setDueDate('');
        setNotes('');
      }
    } catch {
      // useLending already recorded the error; form state is intentionally
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
          Person
          <input
            type="text"
            list="lending-people-list"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            placeholder="e.g. Rahul"
            className="rounded-xl bg-surface-2 px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-gold"
          />
          <datalist id="lending-people-list">
            {people.map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Due date (optional)
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
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

      {formError && <p className="text-sm text-negative">{formError}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="mt-1 flex-1 rounded-xl bg-gold py-2.5 text-sm font-medium text-base disabled:opacity-50"
        >
          {submitting ? 'Saving…' : isEditing ? 'Update Lending' : 'Add Lending'}
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