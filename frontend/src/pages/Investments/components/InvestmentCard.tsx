import { Pencil, Trash2 } from 'lucide-react';
import type { InvestmentOut } from '../../../services/types';
import { formatCurrency } from '../../../utils/currency';

interface InvestmentCardProps {
  investment: InvestmentOut;
  onEdit: (investment: InvestmentOut) => void;
  onDelete: (id: number) => void;
}

export default function InvestmentCard({ investment, onEdit, onDelete }: InvestmentCardProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3">
      <div className="flex flex-col">
        <span className="text-sm text-ink">{investment.investment_type.name}</span>
        <span className="text-xs text-muted">
          {investment.date}
          {investment.broker ? ` · ${investment.broker.name}` : ''}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Neutral gold, not green/red — an investment is cash converting
            into an asset, not a gain or a loss at the point of entry. */}
        <span className="font-display text-sm font-medium text-gold">
          {formatCurrency(investment.amount)}
        </span>
        <button
          type="button"
          aria-label="Edit investment"
          onClick={() => onEdit(investment)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:text-gold"
        >
          <Pencil size={16} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          aria-label="Delete investment"
          onClick={() => onDelete(investment.id)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:text-negative"
        >
          <Trash2 size={16} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}