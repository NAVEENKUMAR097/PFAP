export interface CategoryOut {
  id: number;
  name: string;
}

export interface SubcategoryOut {
  id: number;
  name: string;
  category_id: number;
}

export interface PaymentMethodOut {
  id: number;
  name: string;
}

export interface AccountOut {
  id: number;
  name: string;
}

export interface MerchantOut {
  id: number;
  name: string;
}

export interface ExpenseOut {
  id: number;
  date: string;
  amount: number;
  notes: string | null;
  account: AccountOut;
  category: CategoryOut;
  subcategory: SubcategoryOut | null;
  merchant: MerchantOut | null;
  payment_method: PaymentMethodOut;
  need_or_want: 'need' | 'want' | null;
  tags: string | null;
}

export interface ExpenseCreatePayload {
  date: string;
  amount: number;
  account_id: number;
  category_id: number;
  payment_method_id: number;
  subcategory_id?: number | null;
  merchant_name?: string | null;
  need_or_want?: 'need' | 'want' | null;
  notes?: string | null;
  tags?: string | null;
}

export interface IncomeSourceOut {
  id: number;
  name: string;
}

export interface IncomeOut {
  id: number;
  date: string;
  amount: number;
  notes: string | null;
  account: AccountOut;
  income_source: IncomeSourceOut;
  tags: string | null;
}

export interface IncomeCreatePayload {
  date: string;
  amount: number;
  account_id: number;
  income_source_id: number;
  notes?: string | null;
  tags?: string | null;
}

export interface InvestmentTypeOut {
  id: number;
  name: string;
}

export interface BrokerOut {
  id: number;
  name: string;
}

export interface InvestmentOut {
  id: number;
  date: string;
  amount: number;
  notes: string | null;
  account: AccountOut;
  investment_type: InvestmentTypeOut;
  broker: BrokerOut | null;
  tags: string | null;
}

export interface InvestmentCreatePayload {
  date: string;
  amount: number;
  account_id: number;
  investment_type_id: number;
  broker_name?: string | null;
  notes?: string | null;
  tags?: string | null;
}

export interface PersonOut {
  id: number;
  name: string;
}

export type LoanStatus = 'active' | 'partially_repaid' | 'settled' | 'overdue';

export interface LendingRepaymentOut {
  id: number;
  date: string;
  amount: number;
  notes: string | null;
  account: AccountOut;
}

export interface LendingRepaymentCreatePayload {
  date: string;
  amount: number;
  account_id: number;
  notes?: string | null;
}

export interface LendingOut {
  id: number;
  date: string;
  amount: number;
  account: AccountOut;
  person: PersonOut;
  due_date: string | null;
  notes: string | null;
  total_repaid: number;
  remaining: number;
  status: LoanStatus;
  repayments: LendingRepaymentOut[];
}

export interface LendingCreatePayload {
  date: string;
  amount: number;
  account_id: number;
  person_name: string;
  due_date?: string | null;
  notes?: string | null;
}

export interface BorrowingRepaymentOut {
  id: number;
  date: string;
  amount: number;
  notes: string | null;
  account: AccountOut;
}

export interface BorrowingRepaymentCreatePayload {
  date: string;
  amount: number;
  account_id: number;
  notes?: string | null;
}

export interface BorrowingOut {
  id: number;
  date: string;
  amount: number;
  account: AccountOut;
  person: PersonOut;
  due_date: string | null;
  notes: string | null;
  total_repaid: number;
  remaining: number;
  status: LoanStatus;
  repayments: BorrowingRepaymentOut[];
}

export interface BorrowingCreatePayload {
  date: string;
  amount: number;
  account_id: number;
  person_name: string;
  due_date?: string | null;
  notes?: string | null;
}

export type BudgetStatus = 'under' | 'near' | 'exceeded';

export interface BudgetOut {
  id: number;
  category: CategoryOut;
  month: string;
  amount: number;
  spent: number;
  remaining: number;
  utilization_pct: number;
  status: BudgetStatus;
}

export interface BudgetCreatePayload {
  category_id: number;
  month: string;
  amount: number;
}

export interface DashboardSummary {
  month: string;
  total_expense: number;
  transaction_count: number;
  average_daily_expense: number;
  largest_expense: number;
}

export interface AnalyticsKpi {
  id: string;
  label: string;
  value: number;
  helper: string;
}

export interface AnalyticsMonthlyPoint {
  month: string;
  income: number;
  expenses: number;
  investments: number;
  cash_flow: number;
}

export interface AnalyticsCategorySpend {
  category_id: number;
  category_name: string;
  amount: number;
  percentage: number;
}

export interface AnalyticsBreakdownItem {
  label: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface AnalyticsLoanSummary {
  principal: number;
  repaid: number;
  outstanding: number;
  active_count: number;
  overdue_count: number;
  settled_count: number;
  recovery_pct: number;
}

export interface AnalyticsCashFlowItem {
  label: string;
  amount: number;
  direction: 'inflow' | 'outflow' | 'neutral';
}

export interface AnalyticsHealthFactor {
  label: string;
  score: number;
  helper: string;
}

export interface AnalyticsHealthScore {
  score: number;
  label: string;
  factors: AnalyticsHealthFactor[];
}

export interface AnalyticsInsight {
  severity: 'positive' | 'warning' | 'neutral';
  title: string;
  detail: string;
}

export interface AnalyticsBudgetSignal {
  category_id: number;
  category_name: string;
  budget_amount: number;
  spent: number;
  remaining: number;
  utilization_pct: number;
  status: BudgetStatus;
}

export interface AnalyticsSummary {
  month: string;
  executive_summary: AnalyticsKpi[];
  spending_kpis: AnalyticsKpi[];
  monthly_trend: AnalyticsMonthlyPoint[];
  category_spend: AnalyticsCategorySpend[];
  top_merchants: AnalyticsBreakdownItem[];
  need_want: AnalyticsBreakdownItem[];
  payment_methods: AnalyticsBreakdownItem[];
  income_sources: AnalyticsBreakdownItem[];
  investment_allocation: AnalyticsBreakdownItem[];
  budget_signals: AnalyticsBudgetSignal[];
  lending_summary: AnalyticsLoanSummary;
  borrowing_summary: AnalyticsLoanSummary;
  cash_flow: AnalyticsCashFlowItem[];
  health_score: AnalyticsHealthScore;
  insights: AnalyticsInsight[];
}

// ---------------------------------------------------------------------------
// Recurring Expenses
// ---------------------------------------------------------------------------

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringExpenseOut {
  id: number;
  name: string;
  amount: number;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string | null;
  next_due_date: string;
  is_active: boolean;
  merchant_name: string | null;
  need_or_want: 'need' | 'want' | null;
  notes: string | null;
  tags: string | null;
  category: CategoryOut;
  subcategory: SubcategoryOut | null;
  payment_method: PaymentMethodOut;
  account: AccountOut;
}

export interface RecurringExpenseCreate {
  name: string;
  amount: number;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string | null;
  next_due_date: string;
  category_id: number;
  subcategory_id?: number | null;
  payment_method_id: number;
  account_id: number;
  merchant_name?: string | null;
  need_or_want?: 'need' | 'want' | null;
  notes?: string | null;
  tags?: string | null;
}

// ---------------------------------------------------------------------------
// Recurring Transactions (New unified system)
// ---------------------------------------------------------------------------

export type RecurringTransactionType = 'expense' | 'income' | 'investment' | 'lending' | 'borrowing';
export type RecurringStatus = 'active' | 'paused' | 'completed' | 'cancelled' | 'failed';

// Template types for recurring transaction references
export interface ExpenseTemplateOut {
  id: number;
  name: string;
  amount: number;
  category: CategoryOut;
  subcategory?: SubcategoryOut | null;
  payment_method: PaymentMethodOut;
  account: AccountOut;
  merchant_name?: string | null;
  need_or_want?: 'need' | 'want' | null;
  notes?: string | null;
  tags?: string | null;
  is_active: boolean;
}

export interface IncomeTemplateOut {
  id: number;
  name: string;
  amount: number;
  income_source: IncomeSourceOut;
  account: AccountOut;
  notes?: string | null;
  tags?: string | null;
  is_active: boolean;
}

// Recurring investments reference an existing InvestmentHolding, not a
// template - matches backend schemas.InvestmentHoldingOut.
export interface InvestmentHoldingOut {
  id: number;
  investment_type: InvestmentTypeOut;
  broker: BrokerOut | null;
  account: AccountOut;
  total_invested: number;
  transaction_count: number;
  first_investment_date: string | null;
  last_investment_date: string | null;
  total_units: number | null;
  average_cost_per_unit: number | null;
  current_value: number | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringTransactionOut {
  id: number;
  name: string;
  amount: number;
  transaction_type: RecurringTransactionType;
  status: RecurringStatus;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string | null;
  next_due_date: string;
  notes: string | null;
  tags: string | null;
  created_at: string;
  account: AccountOut;
  // Type-specific references (only one populated based on transaction_type)
  expense_template?: ExpenseTemplateOut | null;
  income_template?: IncomeTemplateOut | null;
  investment_holding?: InvestmentHoldingOut | null;
  lending_agreement?: LendingOut | null;
  borrowing_agreement?: BorrowingOut | null;
  generated_transaction_ids: number[];
}

export interface RecurringTransactionCreate {
  name: string;
  amount: number;
  transaction_type: RecurringTransactionType;
  frequency: RecurringFrequency;
  start_date: string;
  end_date?: string | null;
  next_due_date: string;
  // Required for expense/income. Must be null for investment/lending/borrowing
  // - the backend derives it from the referenced holding/agreement and
  // rejects the request if it's provided for those three types.
  account_id: number | null;
  notes?: string | null;
  tags?: string | null;
  // Type-specific references (exactly one populated based on transaction_type)
  expense_template_id?: number | null;
  income_template_id?: number | null;
  investment_holding_id?: number | null;
  lending_id?: number | null;
  borrowing_id?: number | null;
}

export interface RecurringTransactionUpdate {
  name?: string;
  amount?: number;
  transaction_type?: RecurringTransactionType;
  status?: RecurringStatus;
  frequency?: RecurringFrequency;
  start_date?: string;
  end_date?: string | null;
  next_due_date?: string;
  // See RecurringTransactionCreate.account_id - same null-for-derived-types rule.
  account_id?: number | null;
  notes?: string | null;
  tags?: string | null;
  // Type-specific references (exactly one populated based on transaction_type)
  expense_template_id?: number | null;
  income_template_id?: number | null;
  investment_holding_id?: number | null;
  lending_id?: number | null;
  borrowing_id?: number | null;
}


export interface AccountBalanceOut {
  id: number;
  name: string;
  balance: number;
}

export interface NetWorthSummary {
  accounts: AccountBalanceOut[];
  total_accounts_balance: number;
  total_investments_value: number;
  total_lending_outstanding: number;
  total_borrowing_outstanding: number;
  net_worth: number;
}

export interface InvestmentLogEntryOut {
  id: number;
  date: string;
  amount: number;
  notes: string | null;
  tags: string | null;
}

// NEW: Net Worth Breakdown types
export interface InvestmentHoldingBreakdown {
  id: number;
  investment_type: string;
  broker: string | null;
  account: string;
  total_invested: number;
  current_value: number | null;
  transaction_count: number;
}

export interface LendingAgreementBreakdown {
  id: number;
  person: string;
  principal: number;
  repaid: number;
  remaining: number;
  status: LoanStatus;
  due_date: string | null;
}

export interface BorrowingAgreementBreakdown {
  id: number;
  person: string;
  principal: number;
  repaid: number;
  remaining: number;
  status: LoanStatus;
  due_date: string | null;
}

export interface NetWorthBreakdown {
  accounts: AccountBalanceOut[];
  investment_holdings: InvestmentHoldingBreakdown[];
  lending_agreements: LendingAgreementBreakdown[];
  borrowing_agreements: BorrowingAgreementBreakdown[];
  total_accounts_balance: number;
  total_investments_value: number;
  total_lending_outstanding: number;
  total_borrowing_outstanding: number;
  net_worth: number;
}
