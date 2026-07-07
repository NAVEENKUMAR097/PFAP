import PageScaffold from '../../components/common/Pagescaffold';
import { useLending } from './hooks/useLending';
import LendingForm from './components/LendingForm';
import LendingList from './components/LendingList';

export default function LendingPage() {
  const {
    lendings,
    accounts,
    people,
    loading,
    submitting,
    error,
    editingLending,
    startEditing,
    cancelEditing,
    submitLending,
    removeLending,
    submitRepayment,
    removeRepayment,
  } = useLending();

  return (
    <PageScaffold title="Lending" description="Who owes you, how much, and what's already been repaid.">
      <LendingForm
        accounts={accounts}
        people={people}
        editingLending={editingLending}
        submitting={submitting}
        onSubmit={submitLending}
        onCancelEdit={cancelEditing}
      />

      {error && <p className="mt-3 text-sm text-negative">{error}</p>}

      <div className="mt-6">
        <LendingList
          lendings={lendings}
          accounts={accounts}
          loading={loading}
          onEdit={startEditing}
          onDelete={removeLending}
          onAddRepayment={submitRepayment}
          onDeleteRepayment={removeRepayment}
        />
      </div>
    </PageScaffold>
  );
}