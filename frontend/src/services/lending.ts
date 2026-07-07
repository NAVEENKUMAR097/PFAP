import { apiRequest } from './api';
import type { LendingOut, LendingCreatePayload, LendingRepaymentCreatePayload } from './types';

export function listLendings(): Promise<LendingOut[]> {
  return apiRequest<LendingOut[]>('/lending');
}

export function getLending(id: number): Promise<LendingOut> {
  return apiRequest<LendingOut>(`/lending/${id}`);
}

export function createLending(payload: LendingCreatePayload): Promise<LendingOut> {
  return apiRequest<LendingOut>('/lending', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateLending(id: number, payload: LendingCreatePayload): Promise<LendingOut> {
  return apiRequest<LendingOut>(`/lending/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteLending(id: number): Promise<void> {
  return apiRequest<void>(`/lending/${id}`, {
    method: 'DELETE',
  });
}

// Nested repayments — both return the whole updated LendingOut (with fresh
// total_repaid/remaining/status), not just the repayment row, so the
// frontend doesn't need a second round-trip to refresh those numbers.

export function addRepayment(
  lendingId: number,
  payload: LendingRepaymentCreatePayload,
): Promise<LendingOut> {
  return apiRequest<LendingOut>(`/lending/${lendingId}/repayments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteRepayment(lendingId: number, repaymentId: number): Promise<LendingOut> {
  return apiRequest<LendingOut>(`/lending/${lendingId}/repayments/${repaymentId}`, {
    method: 'DELETE',
  });
}