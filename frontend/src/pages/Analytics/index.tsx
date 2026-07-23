import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import PageScaffold from '../../components/common/Pagescaffold';
import { ApiError } from '../../services/api';
import { getAnalyticsSummary, getNetWorthBreakdown } from '../../services/analytics';
import { UNREACHABLE_MESSAGE } from '../../config';
import type {
  AnalyticsBreakdownItem,
  AnalyticsBudgetSignal,
  AnalyticsCashFlowItem,
  AnalyticsHealthScore,
  AnalyticsInsight,
  AnalyticsKpi,
  AnalyticsCategorySpend,
  AnalyticsLoanSummary,
  AnalyticsSummary,
  NetWorthBreakdown,
} from '../../services/types';
import { formatCurrency } from '../../utils/currency';
import { setAccountBalance } from '../../services/analytics';


const CATEGORY_COLORS = ['#c9a15a', '#4fbf8b', '#e0716b', '#8a8f9c', '#e8d5a8', '#6f7db8'];

const TAB_ITEMS = [
  { id: 'executive', label: 'Executive' },
  { id: 'spending', label: 'Spending' },
  { id: 'income', label: 'Income' },
  { id: 'budget', label: 'Budget' },
  { id: 'loans', label: 'Loans' },
  { id: 'health', label: 'Health' },
  { id: 'networth', label: 'Net Worth' },
] as const;

type AnalyticsTabId = (typeof TAB_ITEMS)[number]['id'];

function currentMonthIso(): string {
  return new Date().toISOString().slice(0, 7);
}

function formatKpiValue(kpi: AnalyticsKpi): string {
  if (kpi.id === 'budget_utilization' || kpi.id === 'top_merchant_share') return `${kpi.value}%`;
  return formatCurrency(kpi.value);
}

function KpiTile({ kpi }: { kpi: AnalyticsKpi }) {
  const valueTone =
    kpi.id === 'expenses' || kpi.id === 'pending_borrowing' || kpi.id === 'expense_count'
      ? 'text-negative'
      : kpi.id === 'income' || kpi.id === 'savings' || kpi.id === 'recovered'
        ? 'text-positive'
        : 'text-gold';

  return (
    <div className="rounded-2xl bg-surface p-4">
      <p className="text-xs text-muted">{kpi.label}</p>
      <p className={`mt-1 font-display text-xl font-medium ${valueTone}`}>{formatKpiValue(kpi)}</p>
      <p className="mt-1 text-xs leading-5 text-muted">{kpi.helper}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mt-6 font-display text-lg font-medium text-ink">{children}</h2>;
}

function EmptyPanel({ children }: { children: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-muted">
      {children}
    </div>
  );
}

function CategoryLegend({ categories }: { categories: AnalyticsCategorySpend[] }) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      {categories.map((category, index) => (
        <div key={category.category_id} className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-muted">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
            />
            {category.category_name}
          </span>
          <span className="text-ink">
            {formatCurrency(category.amount)} ({category.percentage}%)
          </span>
        </div>
      ))}
    </div>
  );
}

function BreakdownList({ rows }: { rows: AnalyticsBreakdownItem[] }) {
  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <div key={row.label} className="rounded-2xl bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-ink">{row.label}</p>
            <p className="text-xs text-muted">{row.percentage}%</p>
          </div>
          <p className="mt-2 text-base font-medium text-ink">{formatCurrency(row.amount)}</p>
          <p className="mt-1 text-xs text-muted">{row.count} transaction{row.count === 1 ? '' : 's'}</p>
        </div>
      ))}
    </div>
  );
}

function BudgetSignalRow({ signal }: { signal: AnalyticsBudgetSignal }) {
  const barWidth = Math.min(signal.utilization_pct, 100);
  const tone =
    signal.status === 'exceeded'
      ? 'bg-negative'
      : signal.status === 'near'
        ? 'bg-gold'
        : 'bg-positive';

  return (
    <div className="rounded-2xl bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-ink">{signal.category_name}</span>
        <span className="text-xs text-muted">{signal.utilization_pct}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${barWidth}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span>{formatCurrency(signal.spent)} spent</span>
        <span>{formatCurrency(signal.budget_amount)} limit</span>
      </div>
    </div>
  );
}

function LoanSummaryCard({ title, summary }: { title: string; summary: AnalyticsLoanSummary }) {
  return (
    <div className="rounded-2xl bg-surface p-4">
      <h3 className="text-sm font-medium text-ink">{title}</h3>
      <div className="mt-3 grid gap-2 text-sm text-muted">
        <div className="flex items-center justify-between">
          <span>Principal</span>
          <span>{formatCurrency(summary.principal)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Repaid</span>
          <span>{formatCurrency(summary.repaid)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Outstanding</span>
          <span>{formatCurrency(summary.outstanding)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Overdue</span>
          <span>{summary.overdue_count}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Recovery</span>
          <span>{summary.recovery_pct}%</span>
        </div>
      </div>
    </div>
  );
}

function CashFlowRow({ item }: { item: AnalyticsCashFlowItem }) {
  const tone =
    item.direction === 'inflow'
      ? 'text-positive'
      : item.direction === 'outflow'
        ? 'text-negative'
        : 'text-muted';

  return (
    <div className="rounded-2xl bg-surface p-4">
      <div className="flex items-center justify-between gap-3 text-sm text-muted">
        <span>{item.label}</span>
        <span className={tone}>{item.direction}</span>
      </div>
      <p className="mt-2 text-xl font-medium text-ink">{formatCurrency(item.amount)}</p>
    </div>
  );
}

function HealthScoreCard({ score }: { score: AnalyticsHealthScore }) {
  return (
    <div className="rounded-2xl bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Overall health</p>
          <p className="mt-2 text-3xl font-display font-semibold text-ink">{score.score}</p>
        </div>
        <span className="rounded-full bg-surface-2 px-3 py-1 text-xs uppercase text-muted">
          {score.label}
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        {score.factors.map((factor) => (
          <div key={factor.label}>
            <div className="flex items-center justify-between text-sm text-muted">
              <span>{factor.label}</span>
              <span>{factor.score} pts</span>
            </div>
            <p className="mt-1 text-xs text-muted">{factor.helper}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightTile({ insight }: { insight: AnalyticsInsight }) {
  const tone =
    insight.severity === 'positive'
      ? 'border-positive/20 bg-positive/5 text-positive'
      : insight.severity === 'warning'
        ? 'border-negative/20 bg-negative/5 text-negative'
        : 'border-white/10 bg-surface-2 text-muted';

  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <p className="font-medium text-ink">{insight.title}</p>
      <p className="mt-2 text-sm text-muted">{insight.detail}</p>
    </div>
  );
}

function AccountBalanceRow({
  account,
  onSaved,
}: {
  account: { id: number; name: string; balance: number };
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(account.balance));
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const save = async () => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      setRowError('Enter a valid number');
      return;
    }
    setSaving(true);
    setRowError(null);
    try {
      await setAccountBalance(account.id, parsed);
      setEditing(false);
      onSaved();
    } catch {
      setRowError('Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl bg-surface-2 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink">{account.name}</span>
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-28 rounded-lg border border-white/10 bg-transparent px-2 py-1 text-sm text-ink"
              autoFocus
            />
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-gold px-3 py-1 text-xs font-semibold text-base disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setValue(String(account.balance));
                setRowError(null);
              }}
              className="text-xs text-muted"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="font-medium text-ink">{formatCurrency(account.balance)}</span>
            <button onClick={() => setEditing(true)} className="text-xs text-gold hover:underline">
              Edit
            </button>
          </div>
        )}
      </div>
      {rowError && <p className="mt-1 text-xs text-negative">{rowError}</p>}
    </div>
  );
}


export default function AnalyticsPage() {
  const [month, setMonth] = useState(currentMonthIso());
  const [activeTab, setActiveTab] = useState<AnalyticsTabId>('executive');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [breakdown, setBreakdown] = useState<NetWorthBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function loadNetWorth() {
    getNetWorthBreakdown()
      .then((result) => setBreakdown(result))
      .catch(() => {
        // Silently fail - breakdown is optional
      });
  }

  useEffect(() => {
    let ignore = false;

    getAnalyticsSummary(month)
      .then((result) => {
        if (!ignore) setSummary(result);
      })
      .catch((err) => {
        if (!ignore) {
          setError(
            err instanceof ApiError
              ? err.message
              : UNREACHABLE_MESSAGE
          );
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    // Also fetch net worth breakdown
   loadNetWorth();

    return () => {
      ignore = true;
    };
  }, [month]);

  function handleMonthChange(value: string) {
    setMonth(value);
    setLoading(true);
    setError(null);
  }

  function renderTabButtons() {
    return (
      <div className="mt-6 flex flex-wrap gap-2">
        {TAB_ITEMS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-gold text-ink'
                : 'bg-surface-2 text-muted hover:bg-surface'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  }

  function renderExecutive() {
    if (!summary) return null;

    return (
      <>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {summary.executive_summary.map((kpi) => (
            <KpiTile key={kpi.id} kpi={kpi} />
          ))}
        </div>
        <SectionTitle>Insights</SectionTitle>
        <div className="mt-3 grid gap-3">
          {summary.insights.map((insight) => (
            <InsightTile key={insight.title} insight={insight} />
          ))}
        </div>
      </>
    );
  }

  function renderSpending() {
    if (!summary) return null;

    return (
      <>
        <SectionTitle>Monthly Spending Trend</SectionTitle>
        <div className="mt-3 h-72 rounded-2xl bg-surface p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary.monthly_trend}>
              <CartesianGrid stroke="#1a2030" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#8a8f9c', fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fill: '#8a8f9c', fontSize: 11 }} tickLine={false} width={36} />
              <Tooltip
                cursor={{ fill: '#1a2030' }}
                contentStyle={{ background: '#12161f', border: '1px solid #1a2030', borderRadius: 12 }}
                formatter={(value) => formatCurrency(Number(value))}
              />
              <Bar dataKey="expenses" fill="#e0716b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <SectionTitle>Category Spend</SectionTitle>
        {summary.category_spend.length > 0 ? (
          <div className="mt-3 rounded-2xl bg-surface p-4">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.category_spend}
                    dataKey="amount"
                    nameKey="category_name"
                    innerRadius={54}
                    outerRadius={82}
                    paddingAngle={3}
                  >
                    {summary.category_spend.map((category, index) => (
                      <Cell
                        key={category.category_id}
                        fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#12161f', border: '1px solid #1a2030', borderRadius: 12 }}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <CategoryLegend categories={summary.category_spend} />
          </div>
        ) : (
          <EmptyPanel>No expenses recorded for this month yet.</EmptyPanel>
        )}

        <SectionTitle>Top Merchants</SectionTitle>
        {summary.top_merchants.length > 0 ? (
          <BreakdownList rows={summary.top_merchants} />
        ) : (
          <EmptyPanel>No merchant spend tracked.</EmptyPanel>
        )}

        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          <div>
            <SectionTitle>Needs vs Wants</SectionTitle>
            {summary.need_want.length > 0 ? <BreakdownList rows={summary.need_want} /> : <EmptyPanel>No need/want tags yet.</EmptyPanel>}
          </div>
          <div>
            <SectionTitle>Payment Methods</SectionTitle>
            {summary.payment_methods.length > 0 ? <BreakdownList rows={summary.payment_methods} /> : <EmptyPanel>No payment methods recorded.</EmptyPanel>}
          </div>
        </div>
      </>
    );
  }

  function renderIncome() {
    if (!summary) return null;

    return (
      <>
        <SectionTitle>Income Sources</SectionTitle>
        {summary.income_sources.length > 0 ? <BreakdownList rows={summary.income_sources} /> : <EmptyPanel>No income sources recorded.</EmptyPanel>}

        <SectionTitle>Investment Allocation</SectionTitle>
        {summary.investment_allocation.length > 0 ? <BreakdownList rows={summary.investment_allocation} /> : <EmptyPanel>No investments recorded.</EmptyPanel>}
      </>
    );
  }

  function renderBudget() {
    if (!summary) return null;

    return (
      <>
        <SectionTitle>Budget Signals</SectionTitle>
        {summary.budget_signals.length > 0 ? (
          <div className="mt-3 flex flex-col gap-3">
            {summary.budget_signals.map((signal) => (
              <BudgetSignalRow key={signal.category_id} signal={signal} />
            ))}
          </div>
        ) : (
          <EmptyPanel>No budgets set for this month yet.</EmptyPanel>
        )}
      </>
    );
  }

  function renderLoans() {
    if (!summary) return null;

    return (
      <>
        <SectionTitle>Loan Summary</SectionTitle>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <LoanSummaryCard title="Lending" summary={summary.lending_summary} />
          <LoanSummaryCard title="Borrowing" summary={summary.borrowing_summary} />
        </div>
      </>
    );
  }

  function renderHealth() {
    if (!summary) return null;

    return (
      <>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <HealthScoreCard score={summary.health_score} />
          <div className="rounded-2xl bg-surface p-4">
            <h3 className="text-sm font-medium text-ink">Cash flow</h3>
            <div className="mt-3 grid gap-3">
              {summary.cash_flow.map((item) => (
                <CashFlowRow key={item.label} item={item} />
              ))}
            </div>
          </div>
        </div>

        <SectionTitle>Insights</SectionTitle>
        <div className="mt-3 grid gap-3">
          {summary.insights.map((insight) => (
            <InsightTile key={insight.title} insight={insight} />
          ))}
        </div>
      </>
    );
  }

  function renderNetWorth() {
    if (!breakdown) return null;

    return (
      <>
        <SectionTitle>Net Worth Overview</SectionTitle>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-surface p-4">
            <p className="text-xs text-muted">In Accounts</p>
            <p className="mt-1 font-display text-xl font-medium text-ink">{formatCurrency(breakdown.total_accounts_balance)}</p>
          </div>
          <div className="rounded-2xl bg-surface p-4">
            <p className="text-xs text-muted">In Investments</p>
            <p className="mt-1 font-display text-xl font-medium text-ink">{formatCurrency(breakdown.total_investments_value)}</p>
          </div>
          <div className="rounded-2xl bg-surface p-4">
            <p className="text-xs text-muted">Lent Out</p>
            <p className="mt-1 font-display text-xl font-medium text-positive">{formatCurrency(breakdown.total_lending_outstanding)}</p>
          </div>
          <div className="rounded-2xl bg-surface p-4">
            <p className="text-xs text-muted">Borrowed</p>
            <p className="mt-1 font-display text-xl font-medium text-negative">{formatCurrency(breakdown.total_borrowing_outstanding)}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-surface border border-white/10 p-6 text-center">
          <p className="text-sm text-muted">Net Worth</p>
          <p className="mt-1 font-display text-3xl font-medium text-gold">{formatCurrency(breakdown.net_worth)}</p>
        </div>

        <SectionTitle>Bank Accounts</SectionTitle>
        {breakdown.accounts.length > 0 ? (
          <div className="mt-3 grid gap-3">
            {breakdown.accounts.map((account) => (
              <AccountBalanceRow key={account.id} account={account} onSaved={loadNetWorth} />
            ))}
          </div>
        ) : (
          <EmptyPanel>No active accounts.</EmptyPanel>
        )}

        <SectionTitle>Investment Holdings</SectionTitle>
        {breakdown.investment_holdings.length > 0 ? (
          <div className="mt-3 grid gap-3">
            {breakdown.investment_holdings.map((holding) => (
              <div key={holding.id} className="rounded-2xl bg-surface-2 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">{holding.investment_type}</p>
                    <p className="text-xs text-muted">{holding.broker ? `${holding.broker} · ` : ''}{holding.account}</p>
                  </div>
                    <div className="text-right">
                      <p className="font-medium text-ink">{formatCurrency(holding.current_value ?? holding.total_invested)}</p>
                      <p className="text-xs text-muted">Invested: {formatCurrency(holding.total_invested)} · {holding.transaction_count} contribution(s)</p>
                    </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyPanel>No investment holdings yet.</EmptyPanel>
        )}

        <SectionTitle>Lending Agreements</SectionTitle>
        {breakdown.lending_agreements.length > 0 ? (
          <div className="mt-3 grid gap-3">
            {breakdown.lending_agreements.map((agreement) => (
              <div key={agreement.id} className="rounded-2xl bg-surface-2 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">{agreement.person}</p>
                    <p className="text-xs text-muted">Status: {agreement.status} · Due: {agreement.due_date || 'No due date'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-positive">{formatCurrency(agreement.remaining)}</p>
                    <p className="text-xs text-muted">Principal: {formatCurrency(agreement.principal)} · Repaid: {formatCurrency(agreement.repaid)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyPanel>No lending agreements.</EmptyPanel>
        )}

        <SectionTitle>Borrowing Agreements</SectionTitle>
        {breakdown.borrowing_agreements.length > 0 ? (
          <div className="mt-3 grid gap-3">
            {breakdown.borrowing_agreements.map((agreement) => (
              <div key={agreement.id} className="rounded-2xl bg-surface-2 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">{agreement.person}</p>
                    <p className="text-xs text-muted">Status: {agreement.status} · Due: {agreement.due_date || 'No due date'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-negative">{formatCurrency(agreement.remaining)}</p>
                    <p className="text-xs text-muted">Principal: {formatCurrency(agreement.principal)} · Repaid: {formatCurrency(agreement.repaid)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyPanel>No borrowing agreements.</EmptyPanel>
        )}
      </>
    );
  }

  function renderActiveTab() {
    switch (activeTab) {
      case 'executive':
        return renderExecutive();
      case 'spending':
        return renderSpending();
      case 'income':
        return renderIncome();
      case 'budget':
        return renderBudget();
      case 'loans':
        return renderLoans();
      case 'health':
        return renderHealth();
      case 'networth':
        return renderNetWorth();
      default:
        return null;
    }
  }

  return (
    <PageScaffold
      title="Analytics"
      description="Income, spending, investments, budgets, and loan signals in one view."
    >
      <label className="mt-4 flex w-fit flex-col gap-1 text-sm text-muted">
        Month
        <input
          type="month"
          value={month}
          onChange={(e) => handleMonthChange(e.target.value)}
          className="rounded-xl bg-surface-2 px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-gold"
        />
      </label>

      {loading && <p className="mt-4 text-sm text-muted">Loading analytics...</p>}
      {error && <p className="mt-4 text-sm text-negative">{error}</p>}

      {summary && !loading && (
        <>
          {renderTabButtons()}
          <div className="mt-6">{renderActiveTab()}</div>
        </>
      )}
    </PageScaffold>
  );
}
