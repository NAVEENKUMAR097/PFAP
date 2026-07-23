import { apiRequest } from './api';
import type {
  InvestmentOut,
  InvestmentCreatePayload,
  InvestmentHoldingOut,
  InvestmentLogEntryOut,
} from './types';

export function listInvestments(month?: string): Promise<InvestmentOut[]> {
  const query = month ? `?month=${month}` : '';
  return apiRequest<InvestmentOut[]>(`/investments${query}`);
}

// Existing holdings - used to populate the "attach this SIP to" dropdown on
// the Recurring Transactions page, and now also to render the Investments
// page's per-holding cards. Hits the dedicated investment_holdings router,
// not /investments.
export function listInvestmentHoldings(): Promise<InvestmentHoldingOut[]> {
  return apiRequest<InvestmentHoldingOut[]>('/investment-holdings');
}

// Contribution history for one holding - powers the "View log" expansion
// on each Investments page card. Same router as listInvestmentHoldings.
export function listHoldingTransactions(holdingId: number): Promise<InvestmentLogEntryOut[]> {
  return apiRequest<InvestmentLogEntryOut[]>(`/investment-holdings/${holdingId}/transactions`);
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