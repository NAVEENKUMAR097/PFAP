import { useEffect, useState, type FormEvent } from 'react';
import type {
  AccountOut,
  InvestmentTypeOut,
  InvestmentOut,
  InvestmentCreatePayload,
} from '../../../services/types';

interface InvestmentFormProps {
  accounts: AccountOut[];
  investmentTypes: InvestmentTypeOut[];
  editingInvestment: InvestmentOut | null;
  submitting: boolean;
  onSubmit: (payload: InvestmentCreatePayload) => Promise<void>;
  onCancelEdit: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function InvestmentForm({
  accounts,
  investmentTypes,
  editingInvestment,
  submitting,
  onSubmit,
  onCancelEdit,
}: InvestmentFormProps) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [accountId, setAccountId] = useState('');
  const [investmentTypeId, setInvestmentTypeId] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const isEditing = editingInvestment !== null;

  // Defaults selects to the first available option once master data loads,
  // so the form is submittable immediately rather than starting empty.
  useEffect(() => {
    if (!isEditing && accounts.length > 0 && !accountId) setAccountId(String(accounts[0].id));
    if (!isEditing && investmentTypes.length > 0 && !investmentTypeId) {
      setInvestmentTypeId(String(investmentTypes[0].id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, investmentTypes]);

  // Populates the form when entering edit mode; clears it when leaving.
  useEffect(() => {
    if (editingInvestment) {
      setAmount(String(editingInvestment.amount));
      setDate(editingInvestment.date);
      setAccountId(String(editingInvestment.account.id));
      setInvestmentTypeId(String(editingInvestment.investment_type.id));
      setBrokerName(editingInvestment.broker?.name ?? '');
      setNotes(editingInvestment.notes ?? '');
    } else {
      setAmount('');
      setDate(todayIso());
      setBrokerName('');
      setNotes('');
    }
  }, [editingInvestment]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setFormError('Enter an amount greater than 0.');
      return;
    }
    if (!accountId || !investmentTypeId) {
      setFormError('Account and investment type are required.');
      return;
    }

    try {
      await onSubmit({
        date,
        amount: parsedAmount,
        account_id: Number(accountId),
        investment_type_id: Number(investmentTypeId),
        broker_name: brokerName.trim() || null,
        notes: notes.trim() || null,
      });
      if (!isEditing) {
        setAmount('');
        setBrokerName('');
        setNotes('');
      }
    } catch {
      // useInvestments already recorded the error; form state is
      // intentionally left as-is so the person doesn't lose what they typed.
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
          Type
          <select
            value={investmentTypeId}
            onChange={(e) => setInvestmentTypeId(e.target.value)}
            className="rounded-xl bg-surface-2 px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-gold"
          >
            {investmentTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Broker (optional)
        <input
          type="text"
          value={brokerName}
          onChange={(e) => setBrokerName(e.target.value)}
          placeholder="e.g. Zerodha"
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
          {submitting ? 'Saving…' : isEditing ? 'Update Investment' : 'Add Investment'}
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