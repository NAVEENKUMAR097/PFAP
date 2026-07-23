import { apiRequest } from './api';
import type { AnalyticsSummary, NetWorthBreakdown } from './types';

export function getAnalyticsSummary(month?: string): Promise<AnalyticsSummary> {
  const query = month ? `?month=${month}` : '';
  return apiRequest<AnalyticsSummary>(`/analytics/summary${query}`);
}

export function getNetWorthBreakdown(): Promise<NetWorthBreakdown> {
  return apiRequest<NetWorthBreakdown>('/analytics/net-worth-breakdown');
}
export function setAccountBalance(accountId: number, currentBalance: number) {
  return apiRequest<{ id: number; name: string; opening_balance: number }>(
    `/accounts/${accountId}/balance`,
    {
      method: 'PUT',
      body: JSON.stringify({ current_balance: currentBalance }),
    }
  );
}