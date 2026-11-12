import { normalizeHandle } from './handles.js';

const DEV_SECRET = 'dev-only-secret-never-used-in-production-0123456789';
const DEV_ADMIN_INVITE = 'dev-admin';

/** True when running on Vercel's production or preview deployments. */
export function isDeployed(): boolean {
  return Boolean(process.env.VERCEL);
}

/** Reads a required setting, falling back to a development value only when not deployed. */
function setting(name: string, devFallback: string): string {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (isDeployed()) throw new Error(`Missing environment variable ${name}`);
  return devFallback;
}

/** Normalized handle of the admin (ADMIN_INSTA). */
export function adminHandle(): string {
  return normalizeHandle(setting('ADMIN_INSTA', 'admin.demo')) ?? '';
}

/** Invitation code of the admin's very first sign-up (ADMIN_INVITE). */
export function adminInvite(): string {
  return setting('ADMIN_INVITE', DEV_ADMIN_INVITE);
}

/** Secret used to sign session cookies (SESSION_SECRET, at least 32 characters). */
export function sessionSecret(): string {
  const secret = setting('SESSION_SECRET', DEV_SECRET);
  if (secret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters long');
  return secret;
}

/** Upstash REST credentials, from the Vercel integration's variables, or null to use memory. */
export function upstashCredentials(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return { url, token };
  if (isDeployed()) throw new Error('Missing Upstash Redis credentials');
  return null;
}
