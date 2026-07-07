import PageScaffold from '../../components/common/Pagescaffold';
import { useInvestments } from './hooks/useInvestments';
import InvestmentForm from './components/InvestmentForm';
import InvestmentList from './components/InvestmentList';

export default function InvestmentsPage() {
  const {
    investments,
    accounts,
    investmentTypes,
    loading,
    submitting,
    error,
    editingInvestment,
    startEditing,
    cancelEditing,
    submitInvestment,
    removeInvestment,
  } = useInvestments();

  return (
    <PageScaffold
      title="Investments"
      description="SIPs and one-off investments, tracked against your net worth."
    >
      <InvestmentForm
        accounts={accounts}
        investmentTypes={investmentTypes}
        editingInvestment={editingInvestment}
        submitting={submitting}
        onSubmit={submitInvestment}
        onCancelEdit={cancelEditing}
      />

      {error && <p className="mt-3 text-sm text-negative">{error}</p>}

      <div className="mt-6">
        <InvestmentList
          investments={investments}
          loading={loading}
          onEdit={startEditing}
          onDelete={removeInvestment}
        />
      </div>
    </PageScaffold>
  );
}