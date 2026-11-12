import { Db } from '../server/db';
import { parseCookies, type ApiRequest } from '../server/http';
import { handleApi } from '../server/routes';
import { SESSION_COOKIE } from '../server/session';
import { MemoryStore } from '../server/store/memory';

export const ADMIN = 'boss.fictive';
export const ADMIN_INVITE = 'test-admin-invite';

/** Sets the environment the API reads, with fictional values only. */
export function setTestEnv(): void {
  process.env.ADMIN_INSTA = ADMIN;
  process.env.ADMIN_INVITE = ADMIN_INVITE;
  process.env.SESSION_SECRET = 'test-secret-test-secret-test-secret-0000';
  delete process.env.VERCEL;
}

export interface CallResult<T = any> {
  status: number;
  body: T;
  cookie: string | null;
}

/** A tiny API client over a fresh in-memory store. */
export function createClient() {
  const db = new Db(new MemoryStore());

  /** Calls the API as a browser holding `cookie` would. */
  async function call<T = any>(method: string, path: string, body?: unknown, cookie?: string | null): Promise<CallResult<T>> {
    const req: ApiRequest = {
      method,
      path,
      body: body ?? (method === 'GET' ? null : {}),
      cookies: cookie ? { [SESSION_COOKIE]: cookie } : {},
      contentType: 'application/json',
    };
    const answer = await handleApi(db, req);
    const setCookie = answer.setCookies?.[0];
    return { status: answer.status, body: answer.body as T, cookie: setCookie ? (parseCookies(setCookie)[SESSION_COOKIE] ?? null) : null };
  }

  /** Signs up a handle with its invite and returns its session cookie. */
  async function signUp(handle: string, invite: string, code = '123456'): Promise<string> {
    const result = await call('POST', '/api/auth/register', { handle, code, invite });
    if (result.status !== 200 || !result.cookie) throw new Error(`sign-up failed: ${JSON.stringify(result.body)}`);
    return result.cookie;
  }

  return { db, call, signUp };
}

/** Admin signed up, one event with these fictional participants; returns what tests need. */
export async function setupEvent(names: string[], giftsPerPerson = 1) {
  const client = createClient();
  const admin = await client.signUp(ADMIN, ADMIN_INVITE);
  const created = await client.call('POST', '/api/admin/events', {
    title: 'Secret Santa test', theme: 'noel', date: '2099-12-20', time: null, place: 'Lieu fictif', budget: '20 €', giftsPerPerson,
  }, admin);
  const eventId: string = created.body.id;
  for (const name of names) {
    await client.call('POST', `/api/admin/events/${eventId}/participants`, { name, handle: name.toLowerCase() + '.fictif' }, admin);
  }
  const inviteCode: string = (await client.call('GET', `/api/admin/events/${eventId}`, undefined, admin)).body.inviteCode;
  return { ...client, admin, eventId, inviteCode };
}
