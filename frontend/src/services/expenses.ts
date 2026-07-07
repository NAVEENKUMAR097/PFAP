import { apiRequest } from "./api";
import type {
  ExpenseOut,
  ExpenseCreatePayload,
} from "./types";

/**
 * Get all expenses
 */
export function listExpenses(month?: string): Promise<ExpenseOut[]> {
  const query = month ? `?month=${month}` : "";

  return apiRequest<ExpenseOut[]>(`/expenses${query}`);
}

/**
 * Get one expense
 */
export function getExpense(
  expenseId: number,
): Promise<ExpenseOut> {
  return apiRequest<ExpenseOut>(
    `/expenses/${expenseId}`,
  );
}

/**
 * Create expense
 */
export function createExpense(
  payload: ExpenseCreatePayload,
): Promise<ExpenseOut> {
  return apiRequest<ExpenseOut>(
    "/expenses",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

/**
 * Update expense
 */
export function updateExpense(
  expenseId: number,
  payload: ExpenseCreatePayload,
): Promise<ExpenseOut> {
  return apiRequest<ExpenseOut>(
    `/expenses/${expenseId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

/**
 * Delete expense
 */
export function deleteExpense(
  expenseId: number,
): Promise<void> {
  return apiRequest<void>(
    `/expenses/${expenseId}`,
    {
      method: "DELETE",
    },
  );
}