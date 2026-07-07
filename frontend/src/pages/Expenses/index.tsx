import PageScaffold from "../../components/common/Pagescaffold";

import ExpenseForm from "./components/ExpenseForm";
import ExpenseList from "./components/ExpenseList";

import useExpenses from "./hooks/useExpenses";

export default function ExpensesPage() {
  const expense = useExpenses();

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

              onSubmit={expense.actions.handleSubmit}
          />

          <ExpenseList
              loading={expense.loading}
              expenses={expense.expenses}

              onEdit={expense.actions.startEditing}

              onDelete={expense.actions.handleDelete}
          />
    </PageScaffold>
  );
}