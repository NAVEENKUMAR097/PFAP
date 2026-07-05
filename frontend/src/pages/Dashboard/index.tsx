import { useEffect, useState } from 'react';
import PageScaffold from '../../components/common/Pagescaffold';
import { getDashboardSummary } from '../../services/dashboard';
import type { DashboardSummary } from '../../services/types';
import { formatCurrency } from '../../utils/currency';
import { ApiError } from '../../services/api';

interface KpiCardProps {
  label: string;
  value: string;
}

function KpiCard({ label, value }: KpiCardProps) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-surface p-4">
      <span className="text-xs text-muted">{label}</span>
      <span className="font-display text-xl font-medium text-ink">{value}</span>
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardSummary()
      .then(setSummary)
      .catch((err) =>
        setError(
          err instanceof ApiError
            ? err.message
            : 'Could not reach the backend. Is it running on http://localhost:8000?',
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageScaffold title="Dashboard" description="Your monthly financial health at a glance.">
      {loading && <p className="mt-4 text-sm text-muted">Loading…</p>}
      {error && <p className="mt-4 text-sm text-negative">{error}</p>}

      {summary && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <KpiCard label="This month's expenses" value={formatCurrency(summary.total_expense)} />
          <KpiCard label="Transactions" value={String(summary.transaction_count)} />
          <KpiCard label="Average per day" value={formatCurrency(summary.average_daily_expense)} />
          <KpiCard label="Largest expense" value={formatCurrency(summary.largest_expense)} />
        </div>
      )}
    </PageScaffold>
  );
}