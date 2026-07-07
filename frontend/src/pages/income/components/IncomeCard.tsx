import { Pencil, Trash2 } from 'lucide-react';
import type { IncomeOut } from '../../../services/types';
import { formatCurrency } from '../../../utils/currency';

interface IncomeCardProps {
  income: IncomeOut;
  onEdit: (income: IncomeOut) => void;
  onDelete: (id: number) => void;
}

export default function IncomeCard({ income, onEdit, onDelete }: IncomeCardProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3">
      <div className="flex flex-col">
        <span className="text-sm text-ink">{income.income_source.name}</span>
        <span className="text-xs text-muted">
          {income.date}
          {income.notes ? ` · ${income.notes}` : ''}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="font-display text-sm font-medium text-positive">
          +{formatCurrency(income.amount)}
        </span>
        <button
          type="button"
          aria-label="Edit income"
          onClick={() => onEdit(income)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:text-gold"
        >
          <Pencil size={16} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          aria-label="Delete income"
          onClick={() => onDelete(income.id)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:text-negative"
        >
          <Trash2 size={16} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}