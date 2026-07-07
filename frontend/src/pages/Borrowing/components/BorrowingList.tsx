import type { AccountOut, BorrowingOut, BorrowingRepaymentCreatePayload } from '../../../services/types';
import BorrowingCard from './BorrowingCard';
import EmptyState from './EmptyState';
import LoadingSkeleton from './LoadingSkeleton';

interface BorrowingListProps {
  borrowings: BorrowingOut[];
  accounts: AccountOut[];
  loading: boolean;
  onEdit: (borrowing: BorrowingOut) => void;
  onDelete: (id: number) => void;
  onAddRepayment: (borrowingId: number, payload: BorrowingRepaymentCreatePayload) => Promise<void>;
  onDeleteRepayment: (borrowingId: number, repaymentId: number) => Promise<void>;
}

export default function BorrowingList({
  borrowings,
  accounts,
  loading,
  onEdit,
  onDelete,
  onAddRepayment,
  onDeleteRepayment,
}: BorrowingListProps) {
  if (loading) return <LoadingSkeleton />;
  if (borrowings.length === 0) return <EmptyState />;

  return (
    <div className="flex flex-col gap-3">
      {borrowings.map((borrowing) => (
        <BorrowingCard
          key={borrowing.id}
          borrowing={borrowing}
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