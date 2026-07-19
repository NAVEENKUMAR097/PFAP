import type { RecurringForm, MasterData } from '../hooks/useRecurring';

const FIELD = 'rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-gold w-full';
const LABEL = 'text-xs text-muted';

const FREQ_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const TRANSACTION_TYPE_OPTIONS = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'investment', label: 'Investment (SIP)' },
  { value: 'lending', label: 'Lending' },
  { value: 'borrowing', label: 'Borrowing' },
];

interface Props {
  form: RecurringForm;
  setForm: (f: RecurringForm) => void;
  masterData: MasterData;
  submitting: boolean;
  editing: boolean;
  error: string | null;
  onSubmit: () => void;
  onCancel: () => void;
}

const currency = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function RecurringFormComponent({ form, setForm, masterData, submitting, editing, error, onSubmit, onCancel }: Props) {
  const set = (k: keyof RecurringForm, v: string) => setForm({ ...form, [k]: v });

  const isExpense = form.transaction_type === 'expense';
  const isIncome = form.transaction_type === 'income';
  const isInvestment = form.transaction_type === 'investment';
  const isLending = form.transaction_type === 'lending';
  const isBorrowing = form.transaction_type === 'borrowing';

  // Investment/lending/borrowing derive their account from the referenced
  // holding/agreement - the backend rejects account_id for these types, so
  // the field is hidden rather than shown-but-ignored.
  const showAccountField = isExpense || isIncome;

  // Auto-fill form values when template/holding is selected
  const handleExpenseTemplateChange = (value: string) => {
    const template = masterData.expenseTemplates.find(t => t.id === Number(value));
    if (template) {
      setForm({
        ...form,
        expense_template_id: value,
        name: template.name,
        amount: String(template.amount),
        account_id: String(template.account.id),
      });
    } else {
      set('expense_template_id', value);
    }
  };

  const handleIncomeTemplateChange = (value: string) => {
    const template = masterData.incomeTemplates.find(t => t.id === Number(value));
    if (template) {
      setForm({
        ...form,
        income_template_id: value,
        name: template.name,
        amount: String(template.amount),
        account_id: String(template.account.id),
      });
    } else {
      set('income_template_id', value);
    }
  };

  const handleInvestmentHoldingChange = (value: string) => {
    set('investment_holding_id', value);
    const holding = masterData.investmentHoldings.find(h => h.id === Number(value));
    if (holding) {
      // For SIPs, user can override the amount (e.g., increase SIP amount later)
      // but we default to the holding's average or leave empty for user to specify
      // Account is derived from holding, so we set it but it's hidden in UI
      set('account_id', String(holding.account.id));
    }
  };

  const handleLendingChange = (value: string) => {
    set('lending_id', value);
    const agreement = masterData.lendings.find(l => l.id === Number(value));
    if (agreement) {
      // Default to the EMI amount if available, otherwise leave empty
      set('account_id', String(agreement.account.id));
    }
  };

  const handleBorrowingChange = (value: string) => {
    set('borrowing_id', value);
    const agreement = masterData.borrowings.find(b => b.id === Number(value));
    if (agreement) {
      set('account_id', String(agreement.account.id));
    }
  };

  return (
    <div className="rounded-2xl bg-surface p-4 flex flex-col gap-3">
      <h2 className="font-display text-lg font-medium text-ink">
        {editing ? 'Edit Recurring Transaction' : 'New Recurring Transaction'}
      </h2>

      {error && <p className="rounded-xl bg-negative/10 p-3 text-sm text-negative">{error}</p>}

      <div className="flex flex-col gap-1">
        <label className={LABEL}>Transaction Type *</label>
        <select
          className={FIELD}
          value={form.transaction_type}
          onChange={e => set('transaction_type', e.target.value as RecurringForm['transaction_type'])}
        >
          {TRANSACTION_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className={LABEL}>Name *</label>
        <input
          className={FIELD}
          placeholder={isExpense ? "e.g. Netflix subscription" : isInvestment ? "e.g. UTI Nifty 50 SIP" : isIncome ? "e.g. Monthly Salary" : "e.g. Ravi's monthly EMI"}
          value={form.name}
          onChange={e => set('name', e.target.value)}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className={LABEL}>Amount *</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            className={FIELD}
            placeholder="0.00"
            value={form.amount}
            onChange={e => set('amount', e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className={LABEL}>Frequency *</label>
          <select className={FIELD} value={form.frequency} onChange={e => set('frequency', e.target.value as RecurringForm['frequency'])}>
            {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className={LABEL}>Start Date *</label>
          <input type="date" className={FIELD} value={form.start_date} onChange={e => set('start_date', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className={LABEL}>End Date</label>
          <input type="date" className={FIELD} value={form.end_date} onChange={e => set('end_date', e.target.value)} />
        </div>
      </div>

      {showAccountField && (
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Account *</label>
          <select className={FIELD} value={form.account_id} onChange={e => set('account_id', e.target.value)}>
            <option value="">Select account</option>
            {masterData.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      )}

      {/* Expense-specific template selection */}
      {isExpense && (
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Expense Template *</label>
          <select className={FIELD} value={form.expense_template_id} onChange={e => handleExpenseTemplateChange(e.target.value)}>
            <option value="">Select expense template</option>
            {masterData.expenseTemplates.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.category.name} · {t.payment_method.name} · {currency(t.amount)}
              </option>
            ))}
          </select>
          {masterData.expenseTemplates.length === 0 && (
            <p className="text-xs text-muted">No expense templates yet — create one first.</p>
          )}
        </div>
      )}

      {/* Income-specific template selection */}
      {isIncome && (
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Income Template *</label>
          <select className={FIELD} value={form.income_template_id} onChange={e => handleIncomeTemplateChange(e.target.value)}>
            <option value="">Select income template</option>
            {masterData.incomeTemplates.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.income_source.name} · {t.account.name} · {currency(t.amount)}
              </option>
            ))}
          </select>
          {masterData.incomeTemplates.length === 0 && (
            <p className="text-xs text-muted">No income templates yet — create one first.</p>
          )}
        </div>
      )}

      {/* Investment-specific holding selection */}
      {isInvestment && (
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Investment Holding *</label>
          <select className={FIELD} value={form.investment_holding_id} onChange={e => handleInvestmentHoldingChange(e.target.value)}>
            <option value="">Select investment holding</option>
            {masterData.investmentHoldings.map(h => (
              <option key={h.id} value={h.id}>
                {h.investment_type.name}{h.broker ? ` · ${h.broker.name}` : ''} · {h.account.name} · invested so far {currency(h.total_invested)}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted">
            Each run adds a contribution to this holding's total — it never creates a new investment. Account is taken from the holding.
          </p>
          {masterData.investmentHoldings.length === 0 && (
            <p className="text-xs text-muted">No investment holdings yet — add an investment first.</p>
          )}
        </div>
      )}

      {/* Lending-specific agreement selection */}
      {isLending && (
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Lending Agreement *</label>
          <select className={FIELD} value={form.lending_id} onChange={e => handleLendingChange(e.target.value)}>
            <option value="">Select lending agreement</option>
            {masterData.lendings.map(l => (
              <option key={l.id} value={l.id}>
                {l.person.name} · lent {currency(l.amount)} · remaining {currency(l.remaining)} · {l.status}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted">Each run records a repayment received against this loan. Account is taken from the agreement.</p>
          {masterData.lendings.length === 0 && (
            <p className="text-xs text-muted">No lending agreements yet — add one first.</p>
          )}
        </div>
      )}

      {/* Borrowing-specific agreement selection */}
      {isBorrowing && (
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Borrowing Agreement *</label>
          <select className={FIELD} value={form.borrowing_id} onChange={e => handleBorrowingChange(e.target.value)}>
            <option value="">Select borrowing agreement</option>
            {masterData.borrowings.map(b => (
              <option key={b.id} value={b.id}>
                {b.person.name} · borrowed {currency(b.amount)} · remaining {currency(b.remaining)} · {b.status}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted">Each run records a repayment you make against this loan. Account is taken from the agreement.</p>
          {masterData.borrowings.length === 0 && (
            <p className="text-xs text-muted">No borrowing agreements yet — add one first.</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className={LABEL}>Tags</label>
        <input className={FIELD} placeholder="Optional tags" value={form.tags} onChange={e => set('tags', e.target.value)} />
      </div>

      <div className="flex flex-col gap-1">
        <label className={LABEL}>Notes</label>
        <input className={FIELD} placeholder="Optional note" value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>

      <div className="flex gap-2 mt-1">
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="flex-1 rounded-xl bg-gold py-2.5 text-sm font-semibold text-base disabled:opacity-50"
        >
          {submitting ? 'Saving…' : editing ? 'Update' : 'Add Recurring'}
        </button>
        {editing && (
          <button onClick={onCancel} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-muted">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}