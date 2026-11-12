import { CODE_LENGTH } from '../shared/types.js';
import type { AuthState } from '../shared/types.js';
import { adminInvite } from './config.js';
import { hashCode, safeEqual, verifyCode } from './crypto.js';
import type { AccountRecord, Db, EventRecord } from './db.js';
import { normalizeHandle } from './handles.js';
import { HttpError } from './http.js';
import { displayName, expiryFor, isAdmin, liveEventsOf } from './membership.js';
import { assertNotLocked, clearFailures, failTry } from './rate-limit.js';
import { createToken } from './session.js';

const CODE_PATTERN = new RegExp(`^\\d{${CODE_LENGTH}}$`);

/** Validates a handle from a request body, or throws a 400. */
export function requireHandle(raw: unknown): string {
  const handle = normalizeHandle(raw);
  if (!handle) throw new HttpError(400, 'bad-handle', "Ce @ Instagram n'est pas valide.");
  return handle;
}

/** Validates a 6-digit code from a request body, or throws a 400. */
export function requireCode(raw: unknown): string {
  if (typeof raw !== 'string' || !CODE_PATTERN.test(raw)) {
    throw new HttpError(400, 'bad-code', `Le code doit faire ${CODE_LENGTH} chiffres.`);
  }
  return raw;
}

/** True when `invite` lets this handle sign up: one of its events' codes, or the admin's own. */
function isValidInvite(handle: string, invite: unknown, events: readonly EventRecord[]): boolean {
  if (typeof invite !== 'string' || invite.length === 0) return false;
  if (isAdmin(handle) && safeEqual(invite, adminInvite())) return true;
  return events.some((event) => safeEqual(invite, event.inviteCode));
}

/** Says what a handle should do next: sign in, sign up, use its link, or that it is not listed. */
export async function checkHandle(db: Db, handle: string, invite: unknown): Promise<AuthState> {
  const events = await liveEventsOf(db, handle);
  if (events.length === 0 && !isAdmin(handle)) return { state: 'not-listed' };
  const name = displayName(handle, events);
  const account = await db.getAccount(handle);
  if (account?.codeHash) return { state: 'login', name };
  return isValidInvite(handle, invite, events) ? { state: 'register', name } : { state: 'needs-invite', name };
}

/** First visit: stores the chosen code and returns a session token. */
export async function register(db: Db, handle: string, code: string, invite: unknown): Promise<string> {
  await assertNotLocked(db, handle);
  const events = await liveEventsOf(db, handle);
  if (events.length === 0 && !isAdmin(handle)) {
    throw new HttpError(404, 'not-listed', "Ce @ n'est pas dans la liste des participants.");
  }
  const existing = await db.getAccount(handle);
  if (existing?.codeHash) throw new HttpError(409, 'already-registered', 'Tu as déjà un code : connecte-toi.');
  if (!isValidInvite(handle, invite, events)) {
    await failTry(db, handle, 'Ce lien perso ne marche pas. Demande un nouveau lien.');
  }
  const account: AccountRecord = {
    handle,
    codeHash: await hashCode(code),
    codeVersion: (existing?.codeVersion ?? 0) + 1,
    pronoun: existing?.pronoun ?? null,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  await db.saveAccount(account, expiryFor(handle, events));
  await clearFailures(db, handle);
  return createToken(handle, account.codeVersion);
}

/** Signs in with handle + code; counts wrong tries and locks after five. */
export async function login(db: Db, handle: string, code: string): Promise<string> {
  await assertNotLocked(db, handle);
  const account = await db.getAccount(handle);
  if (!account?.codeHash) throw new HttpError(409, 'not-registered', "Tu n'as pas encore de code : utilise ton lien perso.");
  if (!(await verifyCode(code, account.codeHash))) await failTry(db, handle, "Ce n'est pas le bon code.");
  await clearFailures(db, handle);
  return createToken(handle, account.codeVersion);
}

/** Replaces the signed-in person's code (the current one is asked again) and returns a new token. */
export async function changeCode(db: Db, account: AccountRecord, current: string, next: string): Promise<string> {
  await assertNotLocked(db, account.handle);
  if (!account.codeHash || !(await verifyCode(current, account.codeHash))) {
    await failTry(db, account.handle, "Ce n'est pas ton code actuel.");
  }
  const updated: AccountRecord = { ...account, codeHash: await hashCode(next), codeVersion: account.codeVersion + 1 };
  await db.saveAccount(updated, expiryFor(account.handle, await liveEventsOf(db, account.handle)));
  return createToken(account.handle, updated.codeVersion);
}

/** Admin action: forgets a forgotten code so the person can choose a new one with their link. */
export async function resetCode(db: Db, handle: string): Promise<void> {
  const account = await db.getAccount(handle);
  await clearFailures(db, handle);
  if (!account) return;
  const reset: AccountRecord = { ...account, codeHash: null, codeVersion: account.codeVersion + 1 };
  await db.saveAccount(reset, expiryFor(handle, await liveEventsOf(db, handle)));
}
