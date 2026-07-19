import { apiRequest } from './api';
import type { AnalyticsSummary } from './types';

export function getAnalyticsSummary(month?: string): Promise<AnalyticsSummary> {
  const query = month ? `?month=${month}` : '';
  return apiRequest<AnalyticsSummary>(`/analytics/summary${query}`);
}
