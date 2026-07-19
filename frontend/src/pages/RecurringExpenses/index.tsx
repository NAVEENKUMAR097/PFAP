import PageScaffold from '../../components/common/Pagescaffold';
import RecurringFormComponent from './components/RecurringForm';
import RecurringList from './components/RecurringList';
import useRecurring from './hooks/useRecurring';

export default function RecurringExpensesPage() {
  const r = useRecurring();

  return (
    <PageScaffold
      title="Recurring Transactions"
      description="Subscriptions, SIPs, salary — transactions that repeat on a schedule."
    >
      <div className="mt-4 flex flex-col gap-4">
        <RecurringFormComponent
          form={r.form}
          setForm={r.actions.setForm}
          masterData={r.masterData}
          submitting={r.submitting}
          editing={r.editingItem !== null}
          error={r.error}
          onSubmit={r.actions.handleSubmit}
          onCancel={r.actions.cancelEditing}
        />
        <RecurringList
          items={r.items}
          loading={r.loading}
          onEdit={r.actions.startEditing}
          onDelete={r.actions.handleDelete}
          onLogNow={r.actions.handleLogNow}
          onPause={r.actions.handlePause}
          onResume={r.actions.handleResume}
          onSkip={r.actions.handleSkip}
          onComplete={r.actions.handleComplete}
          onCancel={r.actions.handleCancel}
        />
      </div>
    </PageScaffold>
  );
}
