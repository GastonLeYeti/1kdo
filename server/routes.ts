import { PRONOUNS, type Pronoun } from '../shared/themes.js';
import type { SessionInfo } from '../shared/types.js';
import { changeCode, checkHandle, login, register, requireCode, requireHandle, resetCode } from './auth.js';
import type { AccountRecord, Db } from './db.js';
import {
  addParticipant, createEvent, deleteEvent, launchDraw, listAllEvents, myDraw, parseEventInput,
  removeParticipant, requireEvent, requireVisibleEvent, toAdminEvent, toEventInfo, toSummary, updateEvent,
} from './events.js';
import { cleanText } from './handles.js';
import { bodyFields, HttpError, ok, type ApiRequest, type ApiResponse } from './http.js';
import { personSheet, saveIdea } from './ideas.js';
import { isClosed } from './lifecycle.js';
import { displayName, expiryFor, isAdmin, liveEventsOf } from './membership.js';
import { clearedSessionCookie, readToken, SESSION_COOKIE, sessionCookie } from './session.js';

/** What every handler receives. */
export interface RouteContext {
  db: Db;
  req: ApiRequest;
  params: Record<string, string>;
}

type Handler = (ctx: RouteContext) => Promise<ApiResponse>;

interface Route {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: Handler;
}

/** Turns "/api/events/:id" into a route matcher. */
function route(method: string, path: string, handler: Handler): Route {
  const paramNames: string[] = [];
  const source = path.replace(/:(\w+)/g, (_, name: string) => {
    paramNames.push(name);
    return '([^/]+)';
  });
  return { method, pattern: new RegExp(`^${source}/?$`), paramNames, handler };
}

// ------------------------------------------------------------------ guards

/** The signed-in account, or null when the cookie is missing, forged, expired or outdated. */
async function currentAccount(ctx: RouteContext): Promise<AccountRecord | null> {
  const token = readToken(ctx.req.cookies[SESSION_COOKIE]);
  if (!token) return null;
  const account = await ctx.db.getAccount(token.handle);
  return account?.codeHash && account.codeVersion === token.codeVersion ? account : null;
}

/** The signed-in account, or a 401. */
async function requireAccount(ctx: RouteContext): Promise<AccountRecord> {
  const account = await currentAccount(ctx);
  if (!account) throw new HttpError(401, 'signed-out', 'Connecte-toi pour continuer.');
  return account;
}

/** The admin's account, or a 401/403. */
async function requireAdmin(ctx: RouteContext): Promise<AccountRecord> {
  const account = await requireAccount(ctx);
  if (!isAdmin(account.handle)) throw new HttpError(403, 'admin-only', 'Réservé au QG.');
  return account;
}

/** A route param that is a known handle, or a 400. */
function handleParam(ctx: RouteContext): string {
  return requireHandle(decodeURIComponent(ctx.params.handle ?? ''));
}

// ------------------------------------------------------------------ session & auth

/** Who is signed in and which events they can open. */
async function getSession(ctx: RouteContext): Promise<ApiResponse> {
  const account = await currentAccount(ctx);
  if (!account) return ok({ user: null, events: [] } satisfies SessionInfo);
  const admin = isAdmin(account.handle);
  const ownEvents = await liveEventsOf(ctx.db, account.handle);
  const events = admin ? await listAllEvents(ctx.db) : ownEvents;
  const info: SessionInfo = {
    user: { handle: account.handle, name: displayName(account.handle, ownEvents), isAdmin: admin, pronoun: account.pronoun },
    events: events.map(toSummary).sort((a, b) => a.date.localeCompare(b.date)),
  };
  return ok(info);
}

async function postCheck(ctx: RouteContext): Promise<ApiResponse> {
  const fields = bodyFields(ctx.req);
  return ok(await checkHandle(ctx.db, requireHandle(fields.handle), fields.invite));
}

async function postRegister(ctx: RouteContext): Promise<ApiResponse> {
  const fields = bodyFields(ctx.req);
  const token = await register(ctx.db, requireHandle(fields.handle), requireCode(fields.code), fields.invite);
  return ok({ ok: true }, [sessionCookie(token)]);
}

async function postLogin(ctx: RouteContext): Promise<ApiResponse> {
  const fields = bodyFields(ctx.req);
  const token = await login(ctx.db, requireHandle(fields.handle), requireCode(fields.code));
  return ok({ ok: true }, [sessionCookie(token)]);
}

async function postLogout(): Promise<ApiResponse> {
  return ok({ ok: true }, [clearedSessionCookie()]);
}

async function postChangeCode(ctx: RouteContext): Promise<ApiResponse> {
  const account = await requireAccount(ctx);
  const fields = bodyFields(ctx.req);
  const token = await changeCode(ctx.db, account, requireCode(fields.current), requireCode(fields.next));
  return ok({ ok: true }, [sessionCookie(token)]);
}

async function patchMe(ctx: RouteContext): Promise<ApiResponse> {
  const account = await requireAccount(ctx);
  const pronoun = bodyFields(ctx.req).pronoun;
  if (!PRONOUNS.includes(pronoun as Pronoun)) throw new HttpError(400, 'bad-pronoun', 'Choisis il, elle ou iel.');
  const events = await liveEventsOf(ctx.db, account.handle);
  await ctx.db.saveAccount({ ...account, pronoun: pronoun as Pronoun }, expiryFor(account.handle, events));
  return ok({ ok: true });
}

// ------------------------------------------------------------------ participant views

/** Public: whether an event is still open, so a closed link shows "C'est fini" (nothing else leaks). */
async function getEventStatus(ctx: RouteContext): Promise<ApiResponse> {
  const event = await ctx.db.getEvent(ctx.params.id ?? '');
  return ok({ isOpen: event !== null && !isClosed(event.date) });
}

async function getEvent(ctx: RouteContext): Promise<ApiResponse> {
  const account = await requireAccount(ctx);
  const event = await requireVisibleEvent(ctx.db, ctx.params.id ?? '', account.handle);
  return ok(await toEventInfo(ctx.db, event));
}

async function getMyDraw(ctx: RouteContext): Promise<ApiResponse> {
  const account = await requireAccount(ctx);
  const event = await requireVisibleEvent(ctx.db, ctx.params.id ?? '', account.handle);
  return ok(await myDraw(ctx.db, event, account.handle, false));
}

async function postReveal(ctx: RouteContext): Promise<ApiResponse> {
  const account = await requireAccount(ctx);
  const event = await requireVisibleEvent(ctx.db, ctx.params.id ?? '', account.handle);
  return ok(await myDraw(ctx.db, event, account.handle, true));
}

async function getPerson(ctx: RouteContext): Promise<ApiResponse> {
  const account = await requireAccount(ctx);
  const event = await requireVisibleEvent(ctx.db, ctx.params.id ?? '', account.handle);
  return ok(await personSheet(ctx.db, event, account.handle, handleParam(ctx)));
}

async function putIdea(ctx: RouteContext): Promise<ApiResponse> {
  const account = await requireAccount(ctx);
  const event = await requireVisibleEvent(ctx.db, ctx.params.id ?? '', account.handle);
  const about = handleParam(ctx);
  await saveIdea(ctx.db, event, account.handle, about, bodyFields(ctx.req).text);
  return ok(await personSheet(ctx.db, event, account.handle, about));
}

// ------------------------------------------------------------------ QG (admin)

async function getAdminEvents(ctx: RouteContext): Promise<ApiResponse> {
  await requireAdmin(ctx);
  return ok((await listAllEvents(ctx.db)).map(toSummary));
}

async function postAdminEvent(ctx: RouteContext): Promise<ApiResponse> {
  await requireAdmin(ctx);
  const event = await createEvent(ctx.db, parseEventInput(bodyFields(ctx.req)));
  return ok(await toAdminEvent(ctx.db, event));
}

/** Loads the event of the URL for an admin action. */
async function adminEvent(ctx: RouteContext) {
  await requireAdmin(ctx);
  return requireEvent(ctx.db, ctx.params.id ?? '');
}

async function getAdminEvent(ctx: RouteContext): Promise<ApiResponse> {
  return ok(await toAdminEvent(ctx.db, await adminEvent(ctx)));
}

async function patchAdminEvent(ctx: RouteContext): Promise<ApiResponse> {
  const event = await adminEvent(ctx);
  const updated = await updateEvent(ctx.db, event, parseEventInput({ ...event, ...bodyFields(ctx.req) }));
  return ok(await toAdminEvent(ctx.db, updated));
}

async function deleteAdminEvent(ctx: RouteContext): Promise<ApiResponse> {
  await deleteEvent(ctx.db, await adminEvent(ctx));
  return ok({ ok: true });
}

async function postParticipant(ctx: RouteContext): Promise<ApiResponse> {
  const event = await adminEvent(ctx);
  const fields = bodyFields(ctx.req);
  const name = cleanText(fields.name, 30);
  if (!name) throw new HttpError(400, 'bad-name', 'Donne un prénom.');
  const updated = await addParticipant(ctx.db, event, { name, handle: requireHandle(fields.handle) });
  return ok(await toAdminEvent(ctx.db, updated));
}

async function deleteParticipant(ctx: RouteContext): Promise<ApiResponse> {
  const event = await adminEvent(ctx);
  return ok(await toAdminEvent(ctx.db, await removeParticipant(ctx.db, event, handleParam(ctx))));
}

async function postResetCode(ctx: RouteContext): Promise<ApiResponse> {
  const event = await adminEvent(ctx);
  await resetCode(ctx.db, handleParam(ctx));
  return ok(await toAdminEvent(ctx.db, event));
}

async function postDraw(ctx: RouteContext): Promise<ApiResponse> {
  const event = await adminEvent(ctx);
  return ok(await toAdminEvent(ctx.db, await launchDraw(ctx.db, event)));
}

// ------------------------------------------------------------------ table

const ROUTES: Route[] = [
  route('GET', '/api/session', getSession),
  route('POST', '/api/auth/check', postCheck),
  route('POST', '/api/auth/register', postRegister),
  route('POST', '/api/auth/login', postLogin),
  route('POST', '/api/auth/logout', postLogout),
  route('POST', '/api/me/code', postChangeCode),
  route('PATCH', '/api/me', patchMe),
  route('GET', '/api/events/:id/status', getEventStatus),
  route('GET', '/api/events/:id', getEvent),
  route('GET', '/api/events/:id/draw', getMyDraw),
  route('POST', '/api/events/:id/reveal', postReveal),
  route('GET', '/api/events/:id/people/:handle', getPerson),
  route('PUT', '/api/events/:id/people/:handle/idea', putIdea),
  route('GET', '/api/admin/events', getAdminEvents),
  route('POST', '/api/admin/events', postAdminEvent),
  route('GET', '/api/admin/events/:id', getAdminEvent),
  route('PATCH', '/api/admin/events/:id', patchAdminEvent),
  route('DELETE', '/api/admin/events/:id', deleteAdminEvent),
  route('POST', '/api/admin/events/:id/participants', postParticipant),
  route('DELETE', '/api/admin/events/:id/participants/:handle', deleteParticipant),
  route('POST', '/api/admin/events/:id/participants/:handle/reset-code', postResetCode),
  route('POST', '/api/admin/events/:id/draw', postDraw),
];

/** Throws unless a state-changing request is JSON (a cross-site form cannot send JSON). */
function assertSafeWrite(req: ApiRequest): void {
  if (req.method === 'GET') return;
  if (!req.contentType.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'json-only', 'Requête refusée.');
  }
}

/** Finds the route of a request and runs it; errors become JSON answers. */
export async function handleApi(db: Db, req: ApiRequest): Promise<ApiResponse> {
  try {
    assertSafeWrite(req);
    for (const candidate of ROUTES) {
      const match = candidate.method === req.method ? candidate.pattern.exec(req.path) : null;
      if (!match) continue;
      const params = Object.fromEntries(candidate.paramNames.map((name, index) => [name, match[index + 1] ?? '']));
      return await candidate.handler({ db, req, params });
    }
    throw new HttpError(404, 'not-found', 'Route inconnue.');
  } catch (error) {
    if (error instanceof HttpError) return { status: error.status, body: error.toBody() };
    console.error(error);
    return { status: 500, body: { error: 'server', message: 'Oups, le serveur a trébuché. Réessaie.' } };
  }
}
