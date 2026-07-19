import { apiRequest } from './api';
import type {
  CategoryOut,
  PaymentMethodOut,
  AccountOut,
  IncomeSourceOut,
  InvestmentTypeOut,
  PersonOut,
  ExpenseTemplateOut,
  IncomeTemplateOut,
} from './types';

export const getCategories = () => apiRequest<CategoryOut[]>('/categories');
export const createCategory = (name: string) => apiRequest<CategoryOut>('/categories', {
  method: 'POST',
  body: JSON.stringify({ name }),
});

export const updateCategory = (id: number, name: string) => apiRequest<CategoryOut>(`/categories/${id}`, {
  method: 'PUT',
  body: JSON.stringify({ name }),
});

export const deactivateCategory = (id: number) => apiRequest<void>(`/categories/${id}`, {
  method: 'DELETE',
});

export const createPaymentMethod = (name: string) => apiRequest<PaymentMethodOut>('/payment-methods', {
  method: 'POST',
  body: JSON.stringify({ name }),
});

export const updatePaymentMethod = (id: number, name: string) => apiRequest<PaymentMethodOut>(`/payment-methods/${id}`, {
  method: 'PUT',
  body: JSON.stringify({ name }),
});

export const deactivatePaymentMethod = (id: number) => apiRequest<void>(`/payment-methods/${id}`, {
  method: 'DELETE',
});

export const createAccount = (name: string) => apiRequest<AccountOut>('/accounts', {
  method: 'POST',
  body: JSON.stringify({ name }),
});

export const updateAccount = (id: number, name: string) => apiRequest<AccountOut>(`/accounts/${id}`, {
  method: 'PUT',
  body: JSON.stringify({ name }),
});

export const deactivateAccount = (id: number) => apiRequest<void>(`/accounts/${id}`, {
  method: 'DELETE',
});

export const createIncomeSource = (name: string) => apiRequest<IncomeSourceOut>('/income-sources', {
  method: 'POST',
  body: JSON.stringify({ name }),
});

export const updateIncomeSource = (id: number, name: string) => apiRequest<IncomeSourceOut>(`/income-sources/${id}`, {
  method: 'PUT',
  body: JSON.stringify({ name }),
});

export const deactivateIncomeSource = (id: number) => apiRequest<void>(`/income-sources/${id}`, {
  method: 'DELETE',
});

export const createInvestmentType = (name: string) => apiRequest<InvestmentTypeOut>('/investment-types', {
  method: 'POST',
  body: JSON.stringify({ name }),
});

export const updateInvestmentType = (id: number, name: string) => apiRequest<InvestmentTypeOut>(`/investment-types/${id}`, {
  method: 'PUT',
  body: JSON.stringify({ name }),
});

export const deactivateInvestmentType = (id: number) => apiRequest<void>(`/investment-types/${id}`, {
  method: 'DELETE',
});

export const createPerson = (name: string) => apiRequest<PersonOut>('/people', {
  method: 'POST',
  body: JSON.stringify({ name }),
});

export const updatePerson = (id: number, name: string) => apiRequest<PersonOut>(`/people/${id}`, {
  method: 'PUT',
  body: JSON.stringify({ name }),
});

export const deactivatePerson = (id: number) => apiRequest<void>(`/people/${id}`, {
  method: 'DELETE',
});
export const getPaymentMethods = () => apiRequest<PaymentMethodOut[]>('/payment-methods');
export const getAccounts = () => apiRequest<AccountOut[]>('/accounts');
export const getIncomeSources = () => apiRequest<IncomeSourceOut[]>('/income-sources');
export const getInvestmentTypes = () => apiRequest<InvestmentTypeOut[]>('/investment-types');
export const getPeople = () => apiRequest<PersonOut[]>('/people');

// Template API calls
export const getExpenseTemplates = () => apiRequest<ExpenseTemplateOut[]>('/templates/expenses');
export const createExpenseTemplate = (data: {
  name: string;
  amount: number;
  category_id: number;
  subcategory_id?: number;
  payment_method_id: number;
  account_id: number;
  merchant_name?: string;
  need_or_want?: 'need' | 'want';
  notes?: string;
  tags?: string;
}) => apiRequest<ExpenseTemplateOut>('/templates/expenses', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const getIncomeTemplates = () => apiRequest<IncomeTemplateOut[]>('/templates/income');
export const createIncomeTemplate = (data: {
  name: string;
  amount: number;
  income_source_id: number;
  account_id: number;
  notes?: string;
  tags?: string;
}) => apiRequest<IncomeTemplateOut>('/templates/income', {
  method: 'POST',
  body: JSON.stringify(data),
});

// NOTE: There is no getInvestmentTemplates / createInvestmentTemplate.
// Recurring investments (SIPs) reference an existing InvestmentHolding
// instead - see listInvestmentHoldings() in services/investments.ts.