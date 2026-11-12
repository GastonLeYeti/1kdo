import { isDeployed, sessionSecret } from './config.js';
import { safeEqual, sign } from './crypto.js';

export const SESSION_COOKIE = 'kdo_session';
const SESSION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** What a valid session cookie carries. */
export interface SessionToken {
  handle: string;
  /** Bumped when the code changes or is reset, which ends older sessions. */
  codeVersion: number;
  expiresAt: number;
}

/** Builds the signed cookie value "handle.version.expiry.signature". */
export function createToken(handle: string, codeVersion: number, now = Date.now()): string {
  const payload = `${handle}.${codeVersion}.${now + SESSION_DAYS * DAY_MS}`;
  return `${payload}.${sign(payload, sessionSecret())}`;
}

/** Reads a cookie value back; null when it is malformed, forged or expired. */
export function readToken(value: string | undefined, now = Date.now()): SessionToken | null {
  const parts = value?.split('.') ?? [];
  if (parts.length < 4) return null;
  const signature = parts.pop() as string;
  const payload = parts.join('.');
  if (!safeEqual(signature, sign(payload, sessionSecret()))) return null;
  const expiresAt = Number(parts.pop());
  const codeVersion = Number(parts.pop());
  const handle = parts.join('.');
  if (!Number.isFinite(expiresAt) || expiresAt <= now || !Number.isInteger(codeVersion)) return null;
  return { handle, codeVersion, expiresAt };
}

/** Set-Cookie header that stores a session for 30 days. */
export function sessionCookie(token: string): string {
  return cookieHeader(token, SESSION_DAYS * 24 * 60 * 60);
}

/** Set-Cookie header that removes the session. */
export function clearedSessionCookie(): string {
  return cookieHeader('', 0);
}

/** Set-Cookie header of the session cookie: httpOnly, same-site, secure once deployed. */
function cookieHeader(value: string, maxAgeSeconds: number): string {
  const secure = isDeployed() ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}
