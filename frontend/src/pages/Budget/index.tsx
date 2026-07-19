import { useState } from 'react';
import PageScaffold from '../../components/common/Pagescaffold';
import { useBudget } from './hooks/UseBudget';
import BudgetForm from './components/Budgetform';
import BudgetList from './components/Budgetlist';

function currentMonthIso(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

export default function BudgetPage() {
  const [month, setMonth] = useState(currentMonthIso());

  const {
    budgets,
    categories,
    loading,
    submitting,
    error,
    editingBudget,
    startEditing,
    cancelEditing,
    submitBudget,
    removeBudget,
  } = useBudget(month);

  return (
    <PageScaffold
      title="Budget"
      description="Monthly limits by category, and how close you are to each one."
    >
      <label className="flex flex-col gap-1 text-sm text-muted">
        Month
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-fit rounded-xl bg-surface-2 px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-gold"
        />
      </label>

      <BudgetForm
        month={month}
        categories={categories}
        editingBudget={editingBudget}
        submitting={submitting}
        onSubmit={submitBudget}
        onCancelEdit={cancelEditing}
      />

      {error && <p className="mt-3 text-sm text-negative">{error}</p>}

      <div className="mt-6">
        <BudgetList budgets={budgets} loading={loading} onEdit={startEditing} onDelete={removeBudget} />
      </div>
    </PageScaffold>
  );
}