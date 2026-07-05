import { apiRequest } from './api';
import type { ExpenseOut, ExpenseCreatePayload } from './types';

export function listExpenses(month?: string): Promise<ExpenseOut[]> {
  const query = month ? `?month=${month}` : '';
  return apiRequest<ExpenseOut[]>(`/expenses${query}`);
}

export function createExpense(payload: ExpenseCreatePayload): Promise<ExpenseOut> {
  return apiRequest<ExpenseOut>('/expenses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}