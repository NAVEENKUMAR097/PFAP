import type { RecurringTransactionOut, RecurringTransactionType } from '../../../services/types';

interface Props {
  item: RecurringTransactionOut;
  onEdit: (item: RecurringTransactionOut) => void;
  onDelete: (id: number) => void;
  onLogNow: (item: RecurringTransactionOut) => void;
  onPause: (id: number) => void;
  onResume: (id: number) => void;
  onSkip: (id: number) => void;
  onComplete: (id: number) => void;
  onCancel: (id: number) => void;
}

const TYPE_LABEL: Record<RecurringTransactionType, string> = {
  expense: 'Expense',
  income: 'Income',
  investment: 'Investment',
  lending: 'Lending',
  borrowing: 'Borrowing',
};

const STATUS_STYLE: Record<RecurringTransactionOut['status'], string> = {
  active: 'bg-positive/10 text-positive',
  paused: 'bg-gold/10 text-gold',
  completed: 'bg-white/10 text-muted',
  cancelled: 'bg-white/10 text-muted',
  failed: 'bg-negative/10 text-negative',
};

const currency = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

/** Contextual one-liner showing which business entity this rule is tied to. */
function referenceLine(item: RecurringTransactionOut): string {
  switch (item.transaction_type) {
    case 'expense':
      return item.expense_template
        ? `${item.expense_template.category.name} · ${item.expense_template.payment_method.name}`
        : 'No expense template linked';
    case 'income':
      return item.income_template
        ? item.income_template.income_source.name
        : 'No income template linked';
    case 'investment':
      return item.investment_holding
        ? `${item.investment_holding.investment_type.name}${item.investment_holding.broker ? ` · ${item.investment_holding.broker.name}` : ''} · invested so far ${currency(item.investment_holding.total_invested)}`
        : 'No investment holding linked';
    case 'lending':
      return item.lending_agreement
        ? `${item.lending_agreement.person.name} · remaining ${currency(item.lending_agreement.remaining)}`
        : 'No lending agreement linked';
    case 'borrowing':
      return item.borrowing_agreement
        ? `${item.borrowing_agreement.person.name} · remaining ${currency(item.borrowing_agreement.remaining)}`
        : 'No borrowing agreement linked';
    default:
      return '';
  }
}

const BTN = 'rounded-lg px-3 py-1.5 text-xs font-medium';

export default function RecurringCard({
  item, onEdit, onDelete, onLogNow, onPause, onResume, onSkip, onComplete, onCancel,
}: Props) {
  const isActive = item.status === 'active';
  const isPaused = item.status === 'paused';
  const isTerminal = item.status === 'completed' || item.status === 'cancelled' || item.status === 'failed';

  return (
    <div className="rounded-2xl bg-surface p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-ink">{item.name}</h3>
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-muted">{TYPE_LABEL[item.transaction_type]}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] capitalize ${STATUS_STYLE[item.status]}`}>{item.status}</span>
          </div>
          <p className="mt-1 text-xs text-muted">{referenceLine(item)}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-lg text-ink">{currency(item.amount)}</p>
          <p className="text-xs text-muted capitalize">{item.frequency}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>Next due {item.next_due_date}</span>
        <span>{item.account.name}</span>
      </div>

      <div className="mt-1 flex flex-wrap gap-2">
        {isActive && (
          <>
            <button onClick={() => onLogNow(item)} className={`${BTN} bg-gold text-base`}>Log Now</button>
            <button onClick={() => onPause(item.id)} className={`${BTN} border border-white/10 text-ink`}>Pause</button>
            <button onClick={() => onSkip(item.id)} className={`${BTN} border border-white/10 text-ink`}>Skip</button>
            <button onClick={() => onComplete(item.id)} className={`${BTN} border border-white/10 text-ink`}>Complete</button>
            <button onClick={() => onCancel(item.id)} className={`${BTN} border border-white/10 text-muted`}>Cancel</button>
          </>
        )}
        {isPaused && (
          <>
            <button onClick={() => onResume(item.id)} className={`${BTN} bg-gold text-base`}>Resume</button>
            <button onClick={() => onCancel(item.id)} className={`${BTN} border border-white/10 text-muted`}>Cancel</button>
          </>
        )}
        <button onClick={() => onEdit(item)} className={`${BTN} border border-white/10 text-ink`}>Edit</button>
        <button onClick={() => onDelete(item.id)} className={`${BTN} border border-negative/30 text-negative`}>Delete</button>
        {isTerminal && <span className="self-center text-[11px] text-muted">No further runs</span>}
      </div>
    </div>
  );
}