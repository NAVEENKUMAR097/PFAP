import type { BudgetOut } from '../../../services/types';
import BudgetCard from './Budgetcard';
import EmptyState from './Emptystate';
import LoadingSkeleton from './Loadingskeleton';

interface BudgetListProps {
  budgets: BudgetOut[];
  loading: boolean;
  onEdit: (budget: BudgetOut) => void;
  onDelete: (id: number) => void;
}

export default function BudgetList({ budgets, loading, onEdit, onDelete }: BudgetListProps) {
  if (loading) return <LoadingSkeleton />;
  if (budgets.length === 0) return <EmptyState />;

  return (
    <div className="flex flex-col gap-3">
      {budgets.map((budget) => (
        <BudgetCard key={budget.id} budget={budget} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}