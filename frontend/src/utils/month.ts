/**
 * Shared "YYYY-MM" month helpers. Used anywhere a page filters data by
 * month (Dashboard, Expenses, ...) so the month-shifting logic lives in
 * one place instead of being copy-pasted per page.
 */

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

/** True if an ISO date string ("YYYY-MM-DD") falls within the given "YYYY-MM" month. */
export function dateInMonth(dateStr: string, ym: string): boolean {
  return dateStr.slice(0, 7) === ym;
}