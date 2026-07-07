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

export interface DashboardSummary {
  month: string;
  total_expense: number;
  transaction_count: number;
  average_daily_expense: number;
  largest_expense: number;
}