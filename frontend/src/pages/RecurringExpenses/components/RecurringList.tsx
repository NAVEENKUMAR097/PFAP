import RecurringCard from './RecurringCard';
import type { RecurringTransactionOut } from '../../../services/types';

interface Props {
  items: RecurringTransactionOut[];
  loading: boolean;
  onEdit: (item: RecurringTransactionOut) => void;
  onDelete: (id: number) => void;
  onLogNow: (item: RecurringTransactionOut) => void;
  onPause: (id: number) => void;
  onResume: (id: number) => void;
  onSkip: (id: number) => void;
  onComplete: (id: number) => void;
  onCancel: (id: number) => void;
}

export default function RecurringList({
  items,
  loading,
  onEdit,
  onDelete,
  onLogNow,
  onPause,
  onResume,
  onSkip,
  onComplete,
  onCancel,
}: Props) {
  if (loading) return <p className="text-sm text-muted mt-2">Loading…</p>;

  if (items.length === 0) {
    return (
      <div className="flex min-h-[28vh] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 p-6 text-center">
        <p className="text-sm font-medium text-ink">No recurring transactions yet</p>
        <p className="text-xs text-muted">Add subscriptions, SIPs, salary — anything that repeats.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map(item => (
        <RecurringCard
          key={item.id}
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
          onLogNow={onLogNow}
          onPause={onPause}
          onResume={onResume}
          onSkip={onSkip}
          onComplete={onComplete}
          onCancel={onCancel}
        />
      ))}
    </div>
  );
}