import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageScaffold from '../../components/common/Pagescaffold';
import { getAnalyticsSummary } from '../../services/analytics';
import { listRecurring } from '../../services/recurring';
import type { AnalyticsSummary, RecurringTransactionOut, BudgetStatus } from '../../services/types';
import { formatCurrency } from '../../utils/currency';
import { currentMonth, formatMonthLabel, shiftMonth } from '../../utils/month';
import { ApiError } from '../../services/api';
import { UNREACHABLE_MESSAGE } from '../../config';

// ── sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  color = 'default',
  onClick,
}: {
  label: string;
  value: string;
  color?: 'default' | 'positive' | 'negative' | 'gold';
  onClick?: () => void;
}) {
  const valueColor =
    color === 'positive'
      ? 'text-positive'
      : color === 'negative'
      ? 'text-negative'
      : color === 'gold'
      ? 'text-gold'
      : 'text-ink';

  return (
    <div
      onClick={onClick}
      className={`flex flex-col gap-1 rounded-2xl bg-surface p-4 transition-colors ${
        onClick ? 'cursor-pointer hover:bg-surface-2' : ''
      }`}
    >
      <span className="text-xs text-muted">{label}</span>
      <span className={`font-display text-xl font-medium ${valueColor}`}>{value}</span>
    </div>
  );
}

function HealthBadge({ score, label }: { score: number; label: string }) {
  const [color, bg] =
    score >= 70
      ? ['text-positive', 'bg-positive/10']
      : score >= 40
      ? ['text-gold', 'bg-gold/10']
      : ['text-negative', 'bg-negative/10'];

  return (
    <div className={`flex items-center gap-4 rounded-2xl ${bg} p-4`}>
      <span className={`font-display text-4xl font-bold ${color}`}>{score}</span>
      <div className="flex flex-col gap-0.5">
        <span className={`text-sm font-medium ${color}`}>{label}</span>
        <span className="text-xs text-muted">Financial health score</span>
      </div>
    </div>
  );
}

function BudgetBar({
  name,
  spent,
  budget_amount,
  utilization_pct,
  status,
}: {
  name: string;
  spent: number;
  budget_amount: number;
  utilization_pct: number;
  status: BudgetStatus;
}) {
  const barColor =
    status === 'exceeded'
      ? 'bg-negative'
      : status === 'near'
      ? 'bg-gold'
      : 'bg-positive';

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-ink">{name}</span>
        <span className="text-muted">
          {formatCurrency(spent)} / {formatCurrency(budget_amount)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-2">
        <div
          className={`h-1.5 rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(utilization_pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

function InsightRow({
  severity,
  title,
  detail,
}: {
  severity: 'positive' | 'warning' | 'neutral';
  title: string;
  detail: string;
}) {
  const dot =
    severity === 'positive'
      ? 'bg-positive'
      : severity === 'warning'
      ? 'bg-gold'
      : 'bg-muted';

  return (
    <div className="flex gap-3">
      <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${dot}`} />
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-ink">{title}</span>
        <span className="text-xs text-muted">{detail}</span>
      </div>
    </div>
  );
}

function RecurringTransactionCard({
  item,
  onClick,
}: {
  item: RecurringTransactionOut;
  onClick: () => void;
}) {
  const statusColor =
    item.status === 'active'
      ? 'text-positive'
      : item.status === 'paused'
      ? 'text-gold'
      : item.status === 'completed'
      ? 'text-positive'
      : 'text-muted';

  const typeLabel =
    item.transaction_type === 'expense'
      ? 'Expense'
      : item.transaction_type === 'income'
      ? 'Income'
      : item.transaction_type === 'investment'
      ? 'Investment'
      : item.transaction_type === 'lending'
      ? 'Lending'
      : 'Borrowing';

  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer items-center justify-between rounded-xl bg-surface-2 p-3 transition-colors hover:bg-surface-3"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-ink">{item.name}</span>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>{typeLabel}</span>
          <span>·</span>
          <span>{item.frequency}</span>
          <span>·</span>
          <span className={statusColor}>{item.status}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-ink">{formatCurrency(item.amount)}</span>
        <ArrowRight size={16} className="text-muted" />
      </div>
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransactionOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canGoForward = month < currentMonth();

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSummary(null);
    Promise.all([
      getAnalyticsSummary(month),
      listRecurring(),
    ])
      .then(([analyticsSummary, recurring]) => {
        setSummary(analyticsSummary);
        setRecurringTransactions(recurring);
      })
      .catch((err) =>
        setError(
          err instanceof ApiError
            ? err.message
            : UNREACHABLE_MESSAGE,
        ),
      )
      .finally(() => setLoading(false));
  }, [month]);

  const kpi = Object.fromEntries(
    (summary?.executive_summary ?? []).map((k) => [k.id, k.value]),
  );

  const income = kpi['income'] ?? 0;
  const expenses = kpi['expenses'] ?? 0;
  const savings = kpi['savings'] ?? 0;
  const investments = kpi['investments'] ?? 0;

  return (
    <PageScaffold title="Dashboard" description="Your monthly financial health at a glance.">
      {/* Month picker */}
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-surface px-4 py-3">
        <button
          onClick={() => setMonth(shiftMonth(month, -1))}
          className="p-1 text-muted transition-colors hover:text-ink"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-medium text-ink">{formatMonthLabel(month)}</span>
        <button
          onClick={() => canGoForward && setMonth(shiftMonth(month, 1))}
          disabled={!canGoForward}
          className={`p-1 transition-colors ${
            canGoForward ? 'text-muted hover:text-ink' : 'cursor-not-allowed opacity-30'
          }`}
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {loading && <p className="mt-6 text-sm text-muted">Loading…</p>}
      {error && <p className="mt-6 text-sm text-negative">{error}</p>}

      {summary && (
        <div className="mt-4 flex flex-col gap-4">
          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Income" value={formatCurrency(income)} color="positive" onClick={() => navigate('/income')} />
            <KpiCard label="Expenses" value={formatCurrency(expenses)} color="negative" onClick={() => navigate('/expenses')} />
            <KpiCard
              label="Savings"
              value={formatCurrency(savings)}
              color={savings >= 0 ? 'positive' : 'negative'}
            />
            <KpiCard label="Investments" value={formatCurrency(investments)} color="gold" onClick={() => navigate('/investments')} />
          </div>

          {/* Health score */}
          <HealthBadge
            score={summary.health_score.score}
            label={summary.health_score.label}
          />

          {/* Budget signals */}
          {summary.budget_signals.length > 0 && (
            <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Budget</h2>
              {summary.budget_signals.map((b) => (
                <BudgetBar
                  key={b.category_id}
                  name={b.category_name}
                  spent={b.spent}
                  budget_amount={b.budget_amount}
                  utilization_pct={b.utilization_pct}
                  status={b.status}
                />
              ))}
            </div>
          )}

          {/* Top categories */}
          {summary.category_spend.length > 0 && (
            <div className="flex flex-col gap-2 rounded-2xl bg-surface p-4">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted">
                Top Categories
              </h2>
              {summary.category_spend.slice(0, 5).map((c) => (
                <div
                  key={c.category_id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-ink">{c.category_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted">{formatCurrency(c.amount)}</span>
                    <span className="w-10 text-right text-xs text-muted">
                      {c.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Accounts (expense) */}
          {summary.account_spend.length > 0 && (
            <div className="flex flex-col gap-2 rounded-2xl bg-surface p-4">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Spend by Account</h2>
              {summary.account_spend.map((a) => (
                <div key={a.label} className="flex items-center justify-between text-sm">
                  <span className="text-ink">{a.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted">{formatCurrency(a.amount)}</span>
                    <span className="w-10 text-right text-xs text-muted">{a.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Investments by Account */}
          {summary.investment_by_account.length > 0 && (
            <div className="flex flex-col gap-2 rounded-2xl bg-surface p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Investments by Account</h2>
                <span className="text-sm font-medium text-gold">{formatCurrency(investments)}</span>
              </div>
              {summary.investment_by_account.map((a) => (
                <div key={a.label} className="flex items-center justify-between text-sm">
                  <span className="text-ink">{a.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted">{formatCurrency(a.amount)}</span>
                    <span className="w-10 text-right text-xs text-muted">{a.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Insights */}
          {summary.insights.length > 0 && (
            <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Insights</h2>
              {summary.insights.map((ins, i) => (
                <InsightRow
                  key={i}
                  severity={ins.severity}
                  title={ins.title}
                  detail={ins.detail}
                />
              ))}
            </div>
          )}

          {/* Recurring Transactions */}
          {recurringTransactions.length > 0 && (
            <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-medium uppercase tracking-wide text-muted">
                  Recurring Transactions
                </h2>
                <Calendar size={16} className="text-muted" />
              </div>
              <div className="flex flex-col gap-2">
                {recurringTransactions.slice(0, 5).map((item) => (
                  <RecurringTransactionCard
                    key={item.id}
                    item={item}
                    onClick={() => {
                      if (item.transaction_type === 'expense') {
                        navigate('/expenses');
                      } else if (item.transaction_type === 'income') {
                        navigate('/income');
                      } else if (item.transaction_type === 'investment') {
                        navigate('/investments');
                      } else if (item.transaction_type === 'lending') {
                        navigate('/lending');
                      } else if (item.transaction_type === 'borrowing') {
                        navigate('/borrowing');
                      }
                    }}
                  />
                ))}
              </div>
              {recurringTransactions.length > 5 && (
                <p className="text-xs text-muted">
                  Showing 5 of {recurringTransactions.length} recurring transactions
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </PageScaffold>
  );
}