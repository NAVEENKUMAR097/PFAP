import { apiRequest } from './api';
import type { RecurringTransactionOut, RecurringTransactionCreate, RecurringTransactionUpdate } from './types';

export function listRecurring(transactionType?: string, status?: string): Promise<RecurringTransactionOut[]> {
  const params = new URLSearchParams();
  if (transactionType) params.append('transaction_type', transactionType);
  if (status) params.append('status', status);
  const queryString = params.toString();
  return apiRequest<RecurringTransactionOut[]>(`/recurring-transactions${queryString ? `?${queryString}` : ''}`);
}

export function createRecurring(payload: RecurringTransactionCreate): Promise<RecurringTransactionOut> {
  return apiRequest<RecurringTransactionOut>('/recurring-transactions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateRecurring(id: number, payload: RecurringTransactionUpdate): Promise<RecurringTransactionOut> {
  return apiRequest<RecurringTransactionOut>(`/recurring-transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteRecurring(id: number): Promise<void> {
  return apiRequest<void>(`/recurring-transactions/${id}`, { method: 'DELETE' });
}

export function logRecurringNow(id: number): Promise<unknown> {
  return apiRequest(`/recurring-transactions/${id}/log-now`, { method: 'POST' });
}

export function pauseRecurring(id: number): Promise<RecurringTransactionOut> {
  return apiRequest<RecurringTransactionOut>(`/recurring-transactions/${id}/pause`, { method: 'POST' });
}

export function resumeRecurring(id: number): Promise<RecurringTransactionOut> {
  return apiRequest<RecurringTransactionOut>(`/recurring-transactions/${id}/resume`, { method: 'POST' });
}

export function skipRecurring(id: number, reason?: string): Promise<RecurringTransactionOut> {
  return apiRequest<RecurringTransactionOut>(`/recurring-transactions/${id}/skip`, { 
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  });
}

export function completeRecurring(id: number): Promise<RecurringTransactionOut> {
  return apiRequest<RecurringTransactionOut>(`/recurring-transactions/${id}/complete`, { method: 'POST' });
}

export function cancelRecurring(id: number): Promise<RecurringTransactionOut> {
  return apiRequest<RecurringTransactionOut>(`/recurring-transactions/${id}/cancel`, { method: 'POST' });
}


export function processDueRecurring(): Promise<unknown> {
  return apiRequest('/recurring-transactions/process-due', { method: 'POST' });
}