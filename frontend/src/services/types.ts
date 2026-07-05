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

export interface DashboardSummary {
  month: string;
  total_expense: number;
  transaction_count: number;
  average_daily_expense: number;
  largest_expense: number;
}