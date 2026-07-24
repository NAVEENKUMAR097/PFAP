import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import {
  listInvestmentHoldings,
  listHoldingTransactions,
  createInvestment,
  deleteInvestment,
  deleteInvestmentHolding,
} from '../../../services/investments';
import type { InvestmentHoldingOut, InvestmentLogEntryOut } from '../../../services/types';

export interface InvestmentHoldingsPanelHandle {
  reload: () => void;
}

function formatMoney(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ContributionForm({
  holding,
  onDone,
}: {
  holding: InvestmentHoldingOut;
  onDone: () => void;
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createInvestment({
        date,
        amount: parsed,
        account_id: holding.account.id,
        investment_type_id: holding.investment_type.id,
        broker_name: holding.broker?.name ?? null,
        notes: notes || null,
      });
      setAmount('');
      setNotes('');
      onDone();
    } catch {
      setError('Could not save contribution.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-xl border border-white/10 p-3">
      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-white/10 bg-transparent px-2 py-1 text-sm text-ink"
        />
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-32 rounded-lg border border-white/10 bg-transparent px-2 py-1 text-sm text-ink"
        />
      </div>
      <input
        type="text"
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="rounded-lg border border-white/10 bg-transparent px-2 py-1 text-sm text-ink"
      />
      {error && <p className="text-xs text-negative">{error}</p>}
      <button
        onClick={submit}
        disabled={submitting}
        className="self-start rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-base disabled:opacity-50"
      >
        {submitting ? 'Saving…' : 'Add Contribution'}
      </button>
    </div>
  );
}

function HoldingCard({
  holding,
  onContributionAdded,
  onHoldingDeleted,
}: {
  holding: InvestmentHoldingOut;
  onContributionAdded: () => void;
  onHoldingDeleted: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [log, setLog] = useState<InvestmentLogEntryOut[] | null>(null);
  const [loadingLog, setLoadingLog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!expanded) return;
    setLoadingLog(true);
    listHoldingTransactions(holding.id)
      .then(setLog)
      .catch(() => setLog([]))
      .finally(() => setLoadingLog(false));
  }, [expanded, holding.id, refreshKey]);

  return (
    <div className="rounded-2xl bg-surface border border-white/10 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-ink">
            {holding.investment_type.name}
            {holding.broker && <span className="text-muted"> · {holding.broker.name}</span>}
          </p>
          <p className="text-xs text-muted">{holding.account.name}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-lg font-medium text-ink">{formatMoney(holding.total_invested)}</p>
          <p className="text-xs text-muted">{holding.transaction_count} contribution(s)</p>
        </div>
      </div>

      <div className="mt-3 flex gap-3 text-xs">
        <button onClick={() => setExpanded((v) => !v)} className="text-gold hover:underline">
          {expanded ? 'Hide log' : 'View log'}
        </button>
        <button onClick={() => setShowForm((v) => !v)} className="text-gold hover:underline">
          {showForm ? 'Cancel' : 'Add contribution'}
        </button>
        <button
          onClick={async () => {
            if (
              !confirm(
                `Delete "${holding.investment_type.name}" and all ${holding.transaction_count} contribution(s)? This cannot be undone.`
              )
            )
              return;
            await deleteInvestmentHolding(holding.id);
            onHoldingDeleted();
          }}
          className="ml-auto text-negative hover:underline"
        >
          Delete holding
        </button>
      </div>

      {showForm && (
        <ContributionForm
          holding={holding}
          onDone={() => {
            setShowForm(false);
            setRefreshKey((k) => k + 1);
            onContributionAdded();
          }}
        />
      )}

      {expanded && (
        <div className="mt-3 border-t border-white/5 pt-3">
          {loadingLog && <p className="text-xs text-muted">Loading…</p>}
          {log && log.length === 0 && <p className="text-xs text-muted">No contributions logged yet.</p>}
          {log &&
            log.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between border-b border-white/5 py-1.5 last:border-0 text-xs"
              >
                <span className="text-muted">{entry.date}</span>
                <span className="text-ink">{formatMoney(entry.amount)}</span>
                <button
                  onClick={async () => {
                    if (!confirm('Delete this contribution?')) return;
                    await deleteInvestment(entry.id);
                    setRefreshKey((k) => k + 1);
                    onContributionAdded();
                  }}
                  className="text-negative hover:underline"
                >
                  Delete
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

const InvestmentHoldingsPanel = forwardRef<InvestmentHoldingsPanelHandle>((_props, ref) => {
  const [holdings, setHoldings] = useState<InvestmentHoldingOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    listInvestmentHoldings()
      .then(setHoldings)
      .catch(() => setError('Could not load investment holdings.'))
      .finally(() => setLoading(false));
  };

  useImperativeHandle(ref, () => ({ reload: load }));

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-medium text-ink">Holdings</h2>
      <p className="text-xs text-muted -mt-2">
        Each card is one investment (type + broker + account). Add a contribution to grow the
        same holding instead of creating a separate one — your account balance drops by that
        amount, but Net Worth doesn't change, since it's still your money.
      </p>
      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && <p className="text-sm text-negative">{error}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {holdings.map((h) => (
          <HoldingCard key={h.id} holding={h} onContributionAdded={load} onHoldingDeleted={load} />
        ))}
      </div>
      {!loading && holdings.length === 0 && (
        <p className="text-sm text-muted">No investment holdings yet — add one below.</p>
      )}
    </div>
  );
});

export default InvestmentHoldingsPanel;