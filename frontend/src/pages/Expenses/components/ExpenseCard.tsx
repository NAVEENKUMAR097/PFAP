import type { ExpenseOut } from "../../../services/types";
import { formatCurrency } from "../../../utils/currency";

interface ExpenseCardProps {
  expense: ExpenseOut;
  onEdit: (expense: ExpenseOut) => void;
  onDelete: (expense: ExpenseOut) => void;
}

export default function ExpenseCard({
  expense,
  onEdit,
  onDelete,
}: ExpenseCardProps) {
  return (
    <div className="rounded-2xl bg-surface p-4 shadow-sm transition hover:bg-surface-2">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="font-medium text-ink">
            {expense.category.name}
          </h3>

          {expense.merchant && (
            <p className="text-sm text-muted">
              {expense.merchant.name}
            </p>
          )}
        </div>

        <div className="text-right">
          <p className="text-lg font-semibold text-negative">
            {formatCurrency(expense.amount)}
          </p>

          <p className="text-xs text-muted">
            {expense.date}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-surface-2 px-3 py-1 text-xs text-muted">
          {expense.payment_method.name}
        </span>

        <span className="rounded-full bg-surface-2 px-3 py-1 text-xs text-muted">
          {expense.account.name}
        </span>

        {expense.need_or_want && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              expense.need_or_want === "need"
                ? "bg-positive/20 text-positive"
                : "bg-gold/20 text-gold"
            }`}
          >
            {expense.need_or_want.toUpperCase()}
          </span>
        )}
      </div>

      {expense.notes && (
        <div className="mt-4 border-t border-white/5 pt-3">
          <p className="text-sm text-muted">
            {expense.notes}
          </p>
        </div>
      )}

      {/* Actions */}

      <div className="mt-4 flex justify-end gap-2 border-t border-white/5 pt-4">
        <button
          type="button"
          onClick={() => onEdit(expense)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition hover:bg-blue-700"
        >
          ✏ Edit
        </button>

        <button
          type="button"
          onClick={() => onDelete(expense)}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition hover:bg-red-700"
        >
          🗑 Delete
        </button>
      </div>
    </div>
  );
}