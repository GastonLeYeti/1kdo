import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient, setTestEnv, setupEvent, ADMIN, ADMIN_INVITE } from './helpers';

beforeEach(setTestEnv);
afterEach(() => vi.useRealTimers());

const NAMES = ['Alpha', 'Bravo', 'Charlie', 'Delta'];
const handleOf = (name: string) => `${name.toLowerCase()}.fictif`;

describe('sign-in', () => {
  it('says when a handle is not in the list', async () => {
    const { call } = await setupEvent(NAMES);
    const result = await call('POST', '/api/auth/check', { handle: '@nobody.here' });
    expect(result.body).toEqual({ state: 'not-listed' });
  });

  it('asks for the personal link before the first sign-up', async () => {
    const { call, inviteCode } = await setupEvent(NAMES);
    expect((await call('POST', '/api/auth/check', { handle: 'alpha.fictif' })).body.state).toBe('needs-invite');
    expect((await call('POST', '/api/auth/check', { handle: 'ALPHA.fictif', invite: inviteCode })).body).toEqual({ state: 'register', name: 'Alpha' });
    expect((await call('POST', '/api/auth/register', { handle: 'alpha.fictif', code: '111111', invite: 'wrong' })).status).toBe(401);
  });

  it('signs up once, then signs in with the code', async () => {
    const { call, signUp, inviteCode } = await setupEvent(NAMES);
    await signUp('alpha.fictif', inviteCode, '246810');
    expect((await call('POST', '/api/auth/register', { handle: 'alpha.fictif', code: '000000', invite: inviteCode })).status).toBe(409);
    expect((await call('POST', '/api/auth/check', { handle: 'alpha.fictif' })).body.state).toBe('login');
    const login = await call('POST', '/api/auth/login', { handle: 'alpha.fictif', code: '246810' });
    expect(login.status).toBe(200);
    const session = await call('GET', '/api/session', undefined, login.cookie);
    expect(session.body.user).toMatchObject({ handle: 'alpha.fictif', name: 'Alpha', isAdmin: false });
    expect(session.body.events).toHaveLength(1);
  });

  it('locks a handle for 15 minutes after 5 wrong codes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { call, signUp, inviteCode } = await setupEvent(NAMES);
    await signUp('alpha.fictif', inviteCode, '246810');
    const tries = [];
    for (let i = 0; i < 5; i++) tries.push(await call('POST', '/api/auth/login', { handle: 'alpha.fictif', code: '999999' }));
    expect(tries.map((t) => t.body.remainingTries ?? t.status)).toEqual([4, 3, 2, 1, 429]);
    expect((await call('POST', '/api/auth/login', { handle: 'alpha.fictif', code: '246810' })).status).toBe(429);
    vi.setSystemTime(Date.now() + 16 * 60 * 1000);
    expect((await call('POST', '/api/auth/login', { handle: 'alpha.fictif', code: '246810' })).status).toBe(200);
  });

  it('ends old sessions when the admin resets a code', async () => {
    const { call, signUp, inviteCode, admin, eventId } = await setupEvent(NAMES);
    const cookie = await signUp('alpha.fictif', inviteCode);
    await call('POST', `/api/admin/events/${eventId}/participants/alpha.fictif/reset-code`, {}, admin);
    expect((await call('GET', '/api/session', undefined, cookie)).body.user).toBeNull();
    expect((await call('POST', '/api/auth/check', { handle: 'alpha.fictif', invite: inviteCode })).body.state).toBe('register');
  });

  it('refuses forged cookies and non-JSON writes', async () => {
    const { call, admin } = await setupEvent(NAMES);
    const forged = admin.replace(/^[^.]+/, 'alpha');
    expect((await call('GET', '/api/session', undefined, forged)).body.user).toBeNull();
    const client = createClient();
    expect((await client.call('POST', '/api/auth/register', { handle: ADMIN, code: '123456', invite: 'nope' })).status).toBe(401);
    expect((await client.call('POST', '/api/auth/register', { handle: ADMIN, code: '123456', invite: ADMIN_INVITE })).status).toBe(200);
  });
});

describe('admin rights', () => {
  it('keeps the QG for the admin only', async () => {
    const { call, signUp, inviteCode, eventId } = await setupEvent(NAMES);
    const cookie = await signUp('alpha.fictif', inviteCode);
    expect((await call('GET', '/api/admin/events', undefined, cookie)).status).toBe(403);
    expect((await call('POST', `/api/admin/events/${eventId}/draw`, {}, cookie)).status).toBe(403);
    expect((await call('GET', '/api/admin/events')).status).toBe(401);
  });
});

describe('draw', () => {
  it('needs gifts + 1 participants and freezes the list', async () => {
    const { call, admin, eventId } = await setupEvent(['Alpha', 'Bravo'], 2);
    expect((await call('POST', `/api/admin/events/${eventId}/draw`, {}, admin)).status).toBe(409);
    await call('POST', `/api/admin/events/${eventId}/participants`, { name: 'Charlie', handle: 'charlie.fictif' }, admin);
    expect((await call('POST', `/api/admin/events/${eventId}/draw`, {}, admin)).status).toBe(200);
    expect((await call('POST', `/api/admin/events/${eventId}/participants`, { name: 'Echo', handle: 'echo.fictif' }, admin)).status).toBe(409);
    expect((await call('DELETE', `/api/admin/events/${eventId}/participants/alpha.fictif`, {}, admin)).status).toBe(409);
  });

  it('sends each person only their own targets, and only once revealed', async () => {
    const { call, signUp, inviteCode, admin, eventId } = await setupEvent(NAMES, 2);
    const cookies = Object.fromEntries(await Promise.all(NAMES.map(async (n) => [n, await signUp(handleOf(n), inviteCode)] as const)));
    await call('POST', `/api/admin/events/${eventId}/draw`, {}, admin);
    const before = await call('GET', `/api/events/${eventId}/draw`, undefined, cookies.Alpha);
    expect(before.body).toEqual({ isDrawn: true, isRevealed: false, targetCount: 2, targets: [] });
    const received = new Map<string, number>();
    for (const name of NAMES) {
      const draw = await call('POST', `/api/events/${eventId}/reveal`, {}, cookies[name]);
      const targets: string[] = draw.body.targets.map((t: { handle: string }) => t.handle);
      expect(targets).toHaveLength(2);
      expect(targets).not.toContain(handleOf(name));
      for (const t of targets) received.set(t, (received.get(t) ?? 0) + 1);
    }
    expect([...received.values()]).toEqual([2, 2, 2, 2]);
    const qg = await call('GET', `/api/admin/events/${eventId}`, undefined, admin);
    expect(JSON.stringify(qg.body)).not.toMatch(/targets/);
    expect(qg.body.participants.every((p: { hasRevealed: boolean }) => p.hasRevealed)).toBe(true);
    const adminDraw = await call('POST', `/api/events/${eventId}/reveal`, {}, admin);
    expect(adminDraw.body.targets).toEqual([]);
  });
});

describe('ideas', () => {
  it('hides the ideas about a person from that person', async () => {
    const { call, signUp, inviteCode, eventId } = await setupEvent(NAMES);
    const alpha = await signUp('alpha.fictif', inviteCode);
    const bravo = await signUp('bravo.fictif', inviteCode);
    const charlie = await signUp('charlie.fictif', inviteCode);
    const sheetOfAlpha = `/api/events/${eventId}/people/alpha.fictif`;
    await call('PUT', `${sheetOfAlpha}/idea`, { text: 'Aime les puzzles' }, bravo);
    await call('PUT', `${sheetOfAlpha}/idea`, { text: 'Cherche un moulin à café' }, charlie);
    await call('PUT', `${sheetOfAlpha}/idea`, { text: 'Les jeux coopératifs' }, alpha);

    const own = await call('GET', sheetOfAlpha, undefined, alpha);
    expect(own.body).toMatchObject({ isMe: true, ideas: [], hiddenIdeaCount: 2, selfNote: 'Les jeux coopératifs', myIdea: 'Les jeux coopératifs' });
    expect(JSON.stringify(own.body)).not.toMatch(/puzzles|moulin/);

    const seenByBravo = await call('GET', sheetOfAlpha, undefined, bravo);
    expect(seenByBravo.body).toMatchObject({ isMe: false, myIdea: 'Aime les puzzles', ideas: ['Cherche un moulin à café'], selfNote: 'Les jeux coopératifs' });
    expect(JSON.stringify(seenByBravo.body)).not.toMatch(/charlie/);
  });

  it('lets each author edit and remove only their own post-it', async () => {
    const { call, signUp, inviteCode, eventId } = await setupEvent(NAMES);
    const bravo = await signUp('bravo.fictif', inviteCode);
    const charlie = await signUp('charlie.fictif', inviteCode);
    const path = `/api/events/${eventId}/people/alpha.fictif`;
    await call('PUT', `${path}/idea`, { text: 'Idée de Bravo' }, bravo);
    await call('PUT', `${path}/idea`, { text: 'Idée de Charlie' }, charlie);
    await call('PUT', `${path}/idea`, { text: '' }, bravo);
    const seen = await call('GET', path, undefined, charlie);
    expect(seen.body.myIdea).toBe('Idée de Charlie');
    expect(seen.body.ideas).toEqual([]);
  });

  it('keeps people of other events out', async () => {
    const { call, signUp, inviteCode, eventId, admin } = await setupEvent(NAMES);
    const other = await call('POST', '/api/admin/events', { title: 'Autre', theme: 'pop', date: '2099-06-01', giftsPerPerson: 1 }, admin);
    await call('POST', `/api/admin/events/${other.body.id}/participants`, { name: 'Zulu', handle: 'zulu.fictif' }, admin);
    const zulu = await signUp('zulu.fictif', other.body.inviteCode);
    expect((await call('GET', `/api/events/${eventId}`, undefined, zulu)).status).toBe(403);
    expect((await call('GET', `/api/events/${eventId}/people/alpha.fictif`, undefined, zulu)).status).toBe(403);
    expect(inviteCode).not.toBe(other.body.inviteCode);
  });
});

describe('end of life', () => {
  it('closes an event 3 days after its date', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2099-12-01T12:00:00Z'));
    const { call, signUp, inviteCode, eventId } = await setupEvent(NAMES);
    const alpha = await signUp('alpha.fictif', inviteCode);
    vi.setSystemTime(new Date('2099-12-22T23:00:00Z'));
    expect((await call('GET', `/api/events/${eventId}`, undefined, alpha)).status).toBe(200);
    expect((await call('GET', `/api/events/${eventId}/status`)).body).toEqual({ isOpen: true });
    vi.setSystemTime(new Date('2099-12-23T00:00:01Z'));
    expect((await call('GET', `/api/events/${eventId}/status`)).body).toEqual({ isOpen: false });
    expect((await call('GET', `/api/events/${eventId}`, undefined, alpha)).status).toBe(401);
    expect((await call('GET', '/api/session', undefined, alpha)).body.user).toBeNull();
  });

  it('deletes everything at once from the QG', async () => {
    const { call, signUp, inviteCode, eventId, admin } = await setupEvent(NAMES);
    const alpha = await signUp('alpha.fictif', inviteCode);
    expect((await call('DELETE', `/api/admin/events/${eventId}`, {}, admin)).status).toBe(200);
    expect((await call('GET', `/api/events/${eventId}`, undefined, alpha)).status).toBe(401);
    expect((await call('POST', '/api/auth/check', { handle: 'alpha.fictif' })).body.state).toBe('not-listed');
    expect((await call('GET', '/api/admin/events', undefined, admin)).body).toEqual([]);
  });
});
