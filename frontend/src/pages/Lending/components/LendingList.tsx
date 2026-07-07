import type { AccountOut, LendingOut, LendingRepaymentCreatePayload } from '../../../services/types';
import LendingCard from './LendingCard';
import EmptyState from './EmptyState';
import LoadingSkeleton from './LoadingSkeleton';

interface LendingListProps {
  lendings: LendingOut[];
  accounts: AccountOut[];
  loading: boolean;
  onEdit: (lending: LendingOut) => void;
  onDelete: (id: number) => void;
  onAddRepayment: (lendingId: number, payload: LendingRepaymentCreatePayload) => Promise<void>;
  onDeleteRepayment: (lendingId: number, repaymentId: number) => Promise<void>;
}

export default function LendingList({
  lendings,
  accounts,
  loading,
  onEdit,
  onDelete,
  onAddRepayment,
  onDeleteRepayment,
}: LendingListProps) {
  if (loading) return <LoadingSkeleton />;
  if (lendings.length === 0) return <EmptyState />;

  return (
    <div className="flex flex-col gap-3">
      {lendings.map((lending) => (
        <LendingCard
          key={lending.id}
          lending={lending}
          accounts={accounts}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddRepayment={onAddRepayment}
          onDeleteRepayment={onDeleteRepayment}
        />
      ))}
    </div>
  );
}