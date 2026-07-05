export type GreetingPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

const GREETINGS: Record<GreetingPeriod, string> = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
  night: 'Good night',
};

/**
 * Pure function — takes a Date instead of reading `new Date()` internally —
 * so it's trivially unit-testable (pass a fixed Date, assert the period)
 * without mocking the system clock.
 */
export function getGreetingPeriod(date: Date = new Date()): GreetingPeriod {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export function getGreeting(date: Date = new Date()): string {
  return GREETINGS[getGreetingPeriod(date)];
}

/**
 * Formats the date shown in the Header, e.g. "Sunday, 5 July".
 * Locale is fixed to en-IN to match the primary user's region; this is the
 * one place to change if PFAP ever needs locale-awareness.
 */
export function formatHeaderDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}