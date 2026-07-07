import type { IncomeOut } from '../../../services/types';
import IncomeCard from './IncomeCard';
import EmptyState from './EmptyState';
import LoadingSkeleton from './LoadingSkeleton';

interface IncomeListProps {
  incomes: IncomeOut[];
  loading: boolean;
  onEdit: (income: IncomeOut) => void;
  onDelete: (id: number) => void;
}

export default function IncomeList({ incomes, loading, onEdit, onDelete }: IncomeListProps) {
  if (loading) return <LoadingSkeleton />;
  if (incomes.length === 0) return <EmptyState />;

  return (
    <div className="flex flex-col gap-2">
      {incomes.map((income) => (
        <IncomeCard key={income.id} income={income} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}