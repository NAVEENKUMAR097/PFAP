import { apiRequest } from './api';
import type { IncomeOut, IncomeCreatePayload } from './types';

export function listIncomes(month?: string): Promise<IncomeOut[]> {
  const query = month ? `?month=${month}` : '';
  return apiRequest<IncomeOut[]>(`/income${query}`);
}

export function getIncome(id: number): Promise<IncomeOut> {
  return apiRequest<IncomeOut>(`/income/${id}`);
}

export function createIncome(payload: IncomeCreatePayload): Promise<IncomeOut> {
  return apiRequest<IncomeOut>('/income', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateIncome(id: number, payload: IncomeCreatePayload): Promise<IncomeOut> {
  return apiRequest<IncomeOut>(`/income/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteIncome(id: number): Promise<void> {
  return apiRequest<void>(`/income/${id}`, {
    method: 'DELETE',
  });
}