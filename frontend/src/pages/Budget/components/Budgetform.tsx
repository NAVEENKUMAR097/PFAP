import { useEffect, useState, type FormEvent } from 'react';
import type { CategoryOut, BudgetOut, BudgetCreatePayload } from '../../../services/types';

interface BudgetFormProps {
  month: string;
  categories: CategoryOut[];
  editingBudget: BudgetOut | null;
  submitting: boolean;
  onSubmit: (payload: BudgetCreatePayload) => Promise<void>;
  onCancelEdit: () => void;
}

export default function BudgetForm({
  month,
  categories,
  editingBudget,
  submitting,
  onSubmit,
  onCancelEdit,
}: BudgetFormProps) {
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const isEditing = editingBudget !== null;

  useEffect(() => {
    if (!isEditing && categories.length > 0 && !categoryId) setCategoryId(String(categories[0].id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  useEffect(() => {
    if (editingBudget) {
      setCategoryId(String(editingBudget.category.id));
      setAmount(String(editingBudget.amount));
    } else {
      setAmount('');
    }
  }, [editingBudget]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setFormError('Enter an amount greater than 0.');
      return;
    }
    if (!categoryId) {
      setFormError('Category is required.');
      return;
    }

    try {
      await onSubmit({ category_id: Number(categoryId), month, amount: parsedAmount });
      if (!isEditing) setAmount('');
    } catch (err) {
      // Surface the backend's specific message (e.g. duplicate budget for
      // this category+month) rather than a generic one, since it tells
      // the person exactly what to do differently.
      setFormError(err instanceof Error ? err.message : 'Could not save the budget.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 rounded-2xl bg-surface p-4">
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm text-muted">
          Category
          {isEditing ? (
            <div className="rounded-xl bg-surface-2 px-3 py-2 text-ink">{editingBudget.category.name}</div>
          ) : (
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
          )}
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm text-muted">
          Limit
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
      </div>

      {formError && <p className="text-sm text-negative">{formError}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="mt-1 flex-1 rounded-xl bg-gold py-2.5 text-sm font-medium text-base disabled:opacity-50"
        >
          {submitting ? 'Saving…' : isEditing ? 'Update Budget' : 'Add Budget'}
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