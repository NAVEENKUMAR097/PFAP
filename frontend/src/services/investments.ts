import { apiRequest } from './api';
import type { InvestmentOut, InvestmentCreatePayload } from './types';

export function listInvestments(month?: string): Promise<InvestmentOut[]> {
  const query = month ? `?month=${month}` : '';
  return apiRequest<InvestmentOut[]>(`/investments${query}`);
}

export function getInvestment(id: number): Promise<InvestmentOut> {
  return apiRequest<InvestmentOut>(`/investments/${id}`);
}

export function createInvestment(payload: InvestmentCreatePayload): Promise<InvestmentOut> {
  return apiRequest<InvestmentOut>('/investments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateInvestment(id: number, payload: InvestmentCreatePayload): Promise<InvestmentOut> {
  return apiRequest<InvestmentOut>(`/investments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteInvestment(id: number): Promise<void> {
  return apiRequest<void>(`/investments/${id}`, {
    method: 'DELETE',
  });
}