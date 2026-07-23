import PageScaffold from '../../components/common/Pagescaffold';
import { useInvestments } from './hooks/useInvestments';
import InvestmentForm from './components/InvestmentForm';
import InvestmentList from './components/InvestmentList';
import InvestmentHoldingsPanel from './components/InvestmentHoldingsPanel';

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
      <InvestmentHoldingsPanel />

      <div className="mt-8 border-t border-white/5 pt-6">
        <h2 className="font-display text-lg font-medium text-ink mb-3">Add a New Investment</h2>
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
      </div>
    </PageScaffold>
  );
}