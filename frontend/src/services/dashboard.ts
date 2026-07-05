import { apiRequest } from './api';
import type { DashboardSummary } from './types';

export const getDashboardSummary = (month?: string) =>
  apiRequest<DashboardSummary>(`/dashboard/summary${month ? `?month=${month}` : ''}`);