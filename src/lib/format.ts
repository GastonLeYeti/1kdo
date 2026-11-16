/** A "YYYY-MM-DD" (+ optional "HH:MM") date as a local Date. */
export function eventDate(date: string, time: string | null): Date {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const [hours, minutes] = (time ?? '00:00').split(':').map(Number) as [number, number];
  return new Date(year, month - 1, day, hours, minutes);
}

/** "Sam. 20 déc." */
export function shortDate(date: string): string {
  const text = eventDate(date, null).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "20/12/2026" */
export function numericDate(date: string): string {
  return eventDate(date, null).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** "14/11" from an ISO timestamp. */
export function dayMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

/** Time left until `target`, split for the countdown (all zeros once passed). */
export function timeLeft(target: Date, now = new Date()): { days: number; hours: number; minutes: number; seconds: number } {
  const total = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/** "3 idées" / "1 idée" / "0 idée"; `pluralForm` when adding an s is not enough. */
export function plural(count: number, word: string, pluralForm = `${word}s`): string {
  return `${count} ${count > 1 ? pluralForm : word}`;
}

/** A local date as "YYYY-MM-DD". */
function isoDay(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The day of a chat message: "aujourd'hui", "hier" or "le 12/12" (never the hour). */
export function chatDay(day: string, now = new Date()): string {
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (day === isoDay(now)) return 'aujourd’hui';
  if (day === isoDay(yesterday)) return 'hier';
  const [, month, date] = day.split('-');
  return `le ${date}/${month}`;
}
