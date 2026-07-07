import PageScaffold from '../../components/common/Pagescaffold';
import { useBorrowing } from './hooks/useBorrowing';
import BorrowingForm from './components/BorrowingForm';
import BorrowingList from './components/BorrowingList';

export default function BorrowingPage() {
  const {
    borrowings,
    accounts,
    people,
    loading,
    submitting,
    error,
    editingBorrowing,
    startEditing,
    cancelEditing,
    submitBorrowing,
    removeBorrowing,
    submitRepayment,
    removeRepayment,
  } = useBorrowing();

  return (
    <PageScaffold title="Borrowing" description="What you owe, and your repayment progress.">
      <BorrowingForm
        accounts={accounts}
        people={people}
        editingBorrowing={editingBorrowing}
        submitting={submitting}
        onSubmit={submitBorrowing}
        onCancelEdit={cancelEditing}
      />

      {error && <p className="mt-3 text-sm text-negative">{error}</p>}

      <div className="mt-6">
        <BorrowingList
          borrowings={borrowings}
          accounts={accounts}
          loading={loading}
          onEdit={startEditing}
          onDelete={removeBorrowing}
          onAddRepayment={submitRepayment}
          onDeleteRepayment={removeRepayment}
        />
      </div>
    </PageScaffold>
  );
}