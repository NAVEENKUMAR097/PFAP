import { apiRequest } from './api';
import type { AnalyticsSummary, NetWorthBreakdown } from './types';

export function getAnalyticsSummary(month?: string): Promise<AnalyticsSummary> {
  const query = month ? `?month=${month}` : '';
  return apiRequest<AnalyticsSummary>(`/analytics/summary${query}`);
}

export function getNetWorthBreakdown(): Promise<NetWorthBreakdown> {
  return apiRequest<NetWorthBreakdown>('/analytics/net-worth-breakdown');
}
