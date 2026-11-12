const HANDLE_PATTERN = /^[a-z0-9._]{1,30}$/;

/** Lowercases an Instagram handle and strips the @ and spaces; null when it is not a valid handle. */
export function normalizeHandle(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const handle = raw.trim().replace(/^@+/, '').toLowerCase();
  return HANDLE_PATTERN.test(handle) ? handle : null;
}

/** Trims a free text and cuts it to `maxLength`; null when empty or not a string. */
export function cleanText(raw: unknown, maxLength: number): string | null {
  if (typeof raw !== 'string') return null;
  const text = raw.trim().replace(/\s+\n/g, '\n').slice(0, maxLength);
  return text.length > 0 ? text : null;
}
