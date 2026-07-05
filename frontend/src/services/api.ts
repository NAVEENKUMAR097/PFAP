const API_BASE_URL = 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Thin wrapper around fetch — every service function goes through this
 * so the base URL and error handling live in exactly one place. Once
 * auth exists, the auth header goes here too, not in every call site.
 */
export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? `Request failed (${response.status})`, response.status);
  }

  return response.json() as Promise<T>;
}