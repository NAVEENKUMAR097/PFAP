import type { InvestmentOut } from '../../../services/types';
import InvestmentCard from './InvestmentCard';
import EmptyState from './EmptyState';
import LoadingSkeleton from './LoadingSkeleton';

interface InvestmentListProps {
  investments: InvestmentOut[];
  loading: boolean;
  onEdit: (investment: InvestmentOut) => void;
  onDelete: (id: number) => void;
}

export default function InvestmentList({ investments, loading, onEdit, onDelete }: InvestmentListProps) {
  if (loading) return <LoadingSkeleton />;
  if (investments.length === 0) return <EmptyState />;

  return (
    <div className="flex flex-col gap-2">
      {investments.map((investment) => (
        <InvestmentCard key={investment.id} investment={investment} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}