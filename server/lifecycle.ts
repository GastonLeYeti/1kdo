const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_KEPT_AFTER_EVENT = 3;
const ADMIN_ACCOUNT_DAYS = 365;

/** Parses a "YYYY-MM-DD" date; null when it is not a real calendar date. */
export function parseDate(value: unknown): { year: number; month: number; day: number } | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  const isReal = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return isReal ? { year, month, day } : null;
}

/** When an event's data disappears: the start of day D+3 (UTC) after the event's date. */
export function closesAt(date: string): number {
  const parsed = parseDate(date);
  if (!parsed) throw new Error(`Invalid event date ${date}`);
  return Date.UTC(parsed.year, parsed.month - 1, parsed.day + DAYS_KEPT_AFTER_EVENT);
}

/** The day an event closes, as "YYYY-MM-DD". */
export function closingDay(date: string): string {
  return new Date(closesAt(date)).toISOString().slice(0, 10);
}

/** True once an event is over and its site is closed. */
export function isClosed(date: string, now = Date.now()): boolean {
  return now >= closesAt(date);
}

/** Expiry of the admin's account when she has no running event. */
export function adminAccountExpiry(now = Date.now()): number {
  return now + ADMIN_ACCOUNT_DAYS * DAY_MS;
}
