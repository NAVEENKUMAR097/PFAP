const API_BASE_URL = "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Central API helper.
 * Handles:
 * - JSON requests
 * - Error handling
 * - 204 No Content responses
 */
export async function apiRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new ApiError(
      body?.detail ?? `Request failed (${response.status})`,
      response.status
    );
  }

  // --------------------------------------------------
  // DELETE returns 204 No Content
  // --------------------------------------------------

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}