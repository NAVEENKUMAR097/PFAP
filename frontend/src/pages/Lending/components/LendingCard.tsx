import { useState } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';
import type { AccountOut, LendingOut, LendingRepaymentCreatePayload, LoanStatus } from '../../../services/types';
import { formatCurrency } from '../../../utils/currency';
import RepaymentForm from './RepaymentForm';

interface LendingCardProps {
  lending: LendingOut;
  accounts: AccountOut[];
  onEdit: (lending: LendingOut) => void;
  onDelete: (id: number) => void;
  onAddRepayment: (lendingId: number, payload: LendingRepaymentCreatePayload) => Promise<void>;
  onDeleteRepayment: (lendingId: number, repaymentId: number) => Promise<void>;
}

const STATUS_STYLES: Record<LoanStatus , string> = {
  active: 'bg-surface-2 text-muted',
  partially_repaid: 'bg-gold/15 text-gold',
  settled: 'bg-positive/15 text-positive',
  overdue: 'bg-negative/15 text-negative',
};

const STATUS_LABELS: Record<LoanStatus , string> = {
  active: 'Active',
  partially_repaid: 'Partially repaid',
  settled: 'Settled',
  overdue: 'Overdue',
};

export default function LendingCard({
  lending,
  accounts,
  onEdit,
  onDelete,
  onAddRepayment,
  onDeleteRepayment,
}: LendingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showRepaymentForm, setShowRepaymentForm] = useState(false);

  return (
    <div className="rounded-2xl bg-surface p-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink">{lending.person.name}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[lending.status]}`}>
              {STATUS_LABELS[lending.status]}
            </span>
          </div>
          <span className="text-xs text-muted">
            Lent {lending.date}
            {lending.due_date ? ` · due ${lending.due_date}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Edit lending"
            onClick={() => onEdit(lending)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:text-gold"
          >
            <Pencil size={16} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            aria-label="Delete lending"
            onClick={() => onDelete(lending.id)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:text-negative"
          >
            <Trash2 size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-muted">Principal</span>
          <span className="font-display text-sm font-medium text-ink">{formatCurrency(lending.amount)}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-muted">Remaining</span>
          <span className="font-display text-sm font-medium text-gold">
            {formatCurrency(lending.remaining)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl bg-surface-2 py-1.5 text-xs text-muted"
      >
        {expanded ? (
          <>
            Hide repayments <ChevronUp size={14} />
          </>
        ) : (
          <>
            {lending.repayments.length > 0
              ? `${lending.repayments.length} repayment${lending.repayments.length > 1 ? 's' : ''}`
              : 'No repayments yet'}{' '}
            <ChevronDown size={14} />
          </>
        )}
      </button>

      {expanded && (
        <div className="mt-2 flex flex-col gap-2">
          {lending.repayments.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2">
              <span className="text-xs text-muted">{r.date}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-positive">+{formatCurrency(r.amount)}</span>
                <button
                  type="button"
                  aria-label="Remove repayment"
                  onClick={() => onDeleteRepayment(lending.id, r.id)}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-muted transition-colors hover:text-negative"
                >
                  <X size={12} strokeWidth={2} />
                </button>
              </div>
            </div>
          ))}

          {lending.status !== 'settled' &&
            (showRepaymentForm ? (
              <RepaymentForm
                accounts={accounts}
                onSubmit={(payload) => onAddRepayment(lending.id, payload)}
                onDone={() => setShowRepaymentForm(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowRepaymentForm(true)}
                className="rounded-xl bg-gold/15 py-1.5 text-xs font-medium text-gold"
              >
                + Record repayment
              </button>
            ))}
        </div>
      )}
    </div>
  );
}