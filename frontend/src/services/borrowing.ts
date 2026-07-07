import { apiRequest } from './api';
import type { BorrowingOut, BorrowingCreatePayload, BorrowingRepaymentCreatePayload } from './types';

export function listBorrowings(): Promise<BorrowingOut[]> {
  return apiRequest<BorrowingOut[]>('/borrowing');
}

export function getBorrowing(id: number): Promise<BorrowingOut> {
  return apiRequest<BorrowingOut>(`/borrowing/${id}`);
}

export function createBorrowing(payload: BorrowingCreatePayload): Promise<BorrowingOut> {
  return apiRequest<BorrowingOut>('/borrowing', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateBorrowing(id: number, payload: BorrowingCreatePayload): Promise<BorrowingOut> {
  return apiRequest<BorrowingOut>(`/borrowing/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteBorrowing(id: number): Promise<void> {
  return apiRequest<void>(`/borrowing/${id}`, {
    method: 'DELETE',
  });
}

export function addRepayment(
  borrowingId: number,
  payload: BorrowingRepaymentCreatePayload,
): Promise<BorrowingOut> {
  return apiRequest<BorrowingOut>(`/borrowing/${borrowingId}/repayments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteRepayment(borrowingId: number, repaymentId: number): Promise<BorrowingOut> {
  return apiRequest<BorrowingOut>(`/borrowing/${borrowingId}/repayments/${repaymentId}`, {
    method: 'DELETE',
  });
}