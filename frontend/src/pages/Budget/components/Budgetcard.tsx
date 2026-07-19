import { Pencil, Trash2 } from 'lucide-react';
import type { BudgetOut, BudgetStatus } from '../../../services/types';
import { formatCurrency } from '../../../utils/currency';

interface BudgetCardProps {
  budget: BudgetOut;
  onEdit: (budget: BudgetOut) => void;
  onDelete: (id: number) => void;
}

const STATUS_STYLES: Record<BudgetStatus, string> = {
  under: 'bg-positive/15 text-positive',
  near: 'bg-gold/15 text-gold',
  exceeded: 'bg-negative/15 text-negative',
};

const STATUS_LABELS: Record<BudgetStatus, string> = {
  under: 'On track',
  near: 'Near limit',
  exceeded: 'Exceeded',
};

const BAR_FILL_STYLES: Record<BudgetStatus, string> = {
  under: 'bg-positive',
  near: 'bg-gold',
  exceeded: 'bg-negative',
};

export default function BudgetCard({ budget, onEdit, onDelete }: BudgetCardProps) {
  const barWidth = Math.min(budget.utilization_pct, 100);

  return (
    <div className="rounded-2xl bg-surface p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink">{budget.category.name}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[budget.status]}`}>
            {STATUS_LABELS[budget.status]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Edit budget"
            onClick={() => onEdit(budget)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:text-gold"
          >
            <Pencil size={16} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            aria-label="Delete budget"
            onClick={() => onDelete(budget.id)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:text-negative"
          >
            <Trash2 size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>{formatCurrency(budget.spent)} spent</span>
        <span>{formatCurrency(budget.amount)} limit</span>
      </div>

      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${BAR_FILL_STYLES[budget.status]}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      <div className="mt-1.5 text-right text-xs text-muted">
        {budget.status === 'exceeded'
          ? `${formatCurrency(Math.abs(budget.remaining))} over`
          : `${formatCurrency(budget.remaining)} remaining`}
      </div>
    </div>
  );
}