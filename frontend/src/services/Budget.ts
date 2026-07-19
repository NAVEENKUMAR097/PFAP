import { apiRequest } from './api';
import type { BudgetOut, BudgetCreatePayload } from './types';

export function listBudgets(month: string): Promise<BudgetOut[]> {
  return apiRequest<BudgetOut[]>(`/budgets?month=${month}`);
}

export function getBudget(id: number): Promise<BudgetOut> {
  return apiRequest<BudgetOut>(`/budgets/${id}`);
}

export function createBudget(payload: BudgetCreatePayload): Promise<BudgetOut> {
  return apiRequest<BudgetOut>('/budgets', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateBudget(id: number, payload: BudgetCreatePayload): Promise<BudgetOut> {
  return apiRequest<BudgetOut>(`/budgets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteBudget(id: number): Promise<void> {
  return apiRequest<void>(`/budgets/${id}`, {
    method: 'DELETE',
  });
}