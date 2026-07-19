import { ChevronLeft, ChevronRight } from "lucide-react";
import PageScaffold from "../../components/common/Pagescaffold";

import ExpenseForm from "./components/ExpenseForm";
import ExpenseList from "./components/ExpenseList";

import useExpenses from "./hooks/useExpenses";
import { currentMonth, formatMonthLabel, shiftMonth } from "../../utils/month";

export default function ExpensesPage() {
  const expense = useExpenses();

  const canGoForward = expense.month < currentMonth();

  return (
    <PageScaffold
      title="Expenses"
      description="Where your money went — by category, merchant, and payment method."
    >
          <ExpenseForm
              loading={expense.loading}
              submitting={expense.submitting}
              error={expense.error}

              masterData={expense.masterData}

              form={expense.form}

              editingExpense={expense.editingExpense}

              onCancelEdit={expense.actions.cancelEditing}

              onSaveAsTemplate={expense.actions.handleSaveAsTemplate}

              onSubmit={expense.actions.handleSubmit}
          />

          {/* Month filter - same picker pattern as Dashboard/Analytics */}
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-surface px-4 py-3">
            <button
              onClick={() => expense.actions.setMonth(shiftMonth(expense.month, -1))}
              className="p-1 text-muted transition-colors hover:text-ink"
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-medium text-ink">{formatMonthLabel(expense.month)}</span>
            <button
              onClick={() => canGoForward && expense.actions.setMonth(shiftMonth(expense.month, 1))}
              disabled={!canGoForward}
              className={`p-1 transition-colors ${
                canGoForward ? "text-muted hover:text-ink" : "cursor-not-allowed opacity-30"
              }`}
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="mt-4">
            <ExpenseList
                loading={expense.loading || expense.listLoading}
                expenses={expense.expenses}

                onEdit={expense.actions.startEditing}

                onDelete={expense.actions.handleDelete}
            />
          </div>
    </PageScaffold>
  );
}