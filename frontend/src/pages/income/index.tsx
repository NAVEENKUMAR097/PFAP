import PageScaffold from '../../components/common/Pagescaffold';
import { useIncome } from './hooks/useIncome';
import IncomeForm from './components/IncomeForm';
import IncomeList from './components/IncomeList';

export default function IncomePage() {
  const {
    incomes,
    accounts,
    incomeSources,
    loading,
    submitting,
    error,
    editingIncome,
    startEditing,
    cancelEditing,
    submitIncome,
    removeIncome,
    handleSaveAsTemplate,
  } = useIncome();

  return (
    <PageScaffold title="Income" description="Salary, refunds, and every other source, month over month.">
      <IncomeForm
        accounts={accounts}
        incomeSources={incomeSources}
        editingIncome={editingIncome}
        submitting={submitting}
        onSubmit={submitIncome}
        onCancelEdit={cancelEditing}
        onSaveAsTemplate={handleSaveAsTemplate}
      />

      {error && <p className="mt-3 text-sm text-negative">{error}</p>}

      <div className="mt-6">
        <IncomeList incomes={incomes} loading={loading} onEdit={startEditing} onDelete={removeIncome} />
      </div>
    </PageScaffold>
  );
}