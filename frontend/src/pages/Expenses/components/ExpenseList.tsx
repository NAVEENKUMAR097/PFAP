import type { ExpenseOut } from "../../../services/types";
import ExpenseCard from "./ExpenseCard";

interface ExpenseListProps {
  loading: boolean;
  expenses: ExpenseOut[];

  onEdit: (expense: ExpenseOut) => void;
  onDelete: (expense: ExpenseOut) => void;
}

export default function ExpenseList({
  loading,
  expenses,
  onEdit,
  onDelete,
}: ExpenseListProps) {
  if (loading) {
    return (
      <div className="mt-4 rounded-2xl bg-surface p-6 text-center text-muted">
        Loading expenses...
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-10 text-center">
        <h3 className="text-lg font-medium text-ink">
          No expenses found
        </h3>

        <p className="mt-2 text-sm text-muted">
          Add your first expense to start tracking your finances.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      {expenses.map((expense) => (
        <ExpenseCard
          key={expense.id}
          expense={expense}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}