import { beforeAll, describe, expect, it } from 'vitest';
import type { DrawBoard } from '../shared/types';
import { isBalancedDraw, reciprocalPairs } from '../server/draw-board';
import { setTestEnv, setupEvent } from './helpers';

const NAMES = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'];
const SEVEN = [...NAMES, 'Foxtrot', 'Golf'];
const handleOf = (name: string) => `${name.toLowerCase()}.fictif`;

beforeAll(setTestEnv);

/** An event in visible mode, everyone signed up, drawn; envelopes still closed. */
async function visibleDraw(giftsPerPerson = 1, names = NAMES) {
  const setup = await setupEvent(names, giftsPerPerson);
  const { call, signUp, admin, eventId, inviteCode } = setup;
  await call('PATCH', `/api/admin/events/${eventId}`, { drawVisibility: 'visible' }, admin);
  const cookies = Object.fromEntries(await Promise.all(names.map(async (n) => [n, await signUp(handleOf(n), inviteCode)] as const)));
  expect((await call('POST', `/api/admin/events/${eventId}/draw`, {}, admin)).status).toBe(200);
  const board = async (): Promise<DrawBoard> => (await call('GET', `/api/admin/events/${eventId}/draw-board`, undefined, admin)).body;
  return { ...setup, cookies, board };
}

/** Receivers by giver handle, read from the admin's table. */
function asDraw(board: DrawBoard): Record<string, string[]> {
  return Object.fromEntries(board.rows.map((row) => [row.giver.handle, row.receivers.map((r) => r.handle)]));
}

/** Two givers whose swap is valid (nobody would give to themselves). */
function swappablePair(draw: Record<string, string[]>): [string, string] {
  for (const a of Object.keys(draw)) {
    for (const b of Object.keys(draw)) {
      if (a !== b && !draw[b]?.includes(a) && !draw[a]?.includes(b)) return [a, b];
    }
  }
  throw new Error('no swappable pair');
}

describe('visible draw', () => {
  it('keeps the envelopes closed until the admin opens them', async () => {
    const { call, cookies, admin, eventId } = await visibleDraw();
    const alpha = cookies.Alpha;
    expect((await call('GET', `/api/events/${eventId}/draw`, undefined, alpha)).body).toMatchObject({ isDrawn: false, targets: [] });
    expect((await call('POST', `/api/events/${eventId}/reveal`, {}, alpha)).status).toBe(409);
    expect((await call('GET', `/api/events/${eventId}`, undefined, alpha)).body).toMatchObject({ isDrawn: false, drawVisibility: 'visible' });
    expect((await call('POST', `/api/admin/events/${eventId}/envelopes`, {}, admin)).body.envelopesOpen).toBe(true);
    expect((await call('POST', `/api/events/${eventId}/reveal`, {}, alpha)).body.targets).toHaveLength(1);
  });

  it('shows the whole draw to the admin only', async () => {
    const { call, cookies, eventId, board } = await visibleDraw(2);
    const table = await board();
    expect(table.rows).toHaveLength(NAMES.length);
    expect(isBalancedDraw(asDraw(table), NAMES.map(handleOf), 2)).toBe(true);
    expect((await call('GET', `/api/admin/events/${eventId}/draw-board`, undefined, cookies.Alpha)).status).toBe(403);
  });

  it('swaps two lists and keeps X given and X received for everyone', async () => {
    // With 5 people and 2 gifts every swap would make someone give to themselves: 7 leave room.
    const { call, admin, eventId, board } = await visibleDraw(2, SEVEN);
    const before = asDraw(await board());
    const [a, b] = swappablePair(before);
    const swapped = await call('POST', `/api/admin/events/${eventId}/draw-board/swap`, { a, b }, admin);
    expect(swapped.status).toBe(200);
    const after = asDraw(swapped.body);
    expect(after[a]).toEqual(before[b]);
    expect(after[b]).toEqual(before[a]);
    expect(isBalancedDraw(after, SEVEN.map(handleOf), 2)).toBe(true);
    expect(asDraw(await board())).toEqual(after);
  });

  it('refuses a swap that makes someone give to themselves', async () => {
    const { call, admin, eventId, board } = await visibleDraw();
    const draw = asDraw(await board());
    const [giver, receivers] = Object.entries(draw)[0] as [string, string[]];
    const receiver = receivers[0] as string;
    const result = await call('POST', `/api/admin/events/${eventId}/draw-board/swap`, { a: giver, b: receiver }, admin);
    expect(result.status).toBe(409);
    expect(result.body.error).toBe('self-gift');
    expect(asDraw(await board())).toEqual(draw);
  });

  it('locks the line of someone who discovered their name', async () => {
    const { call, cookies, admin, eventId, board } = await visibleDraw();
    await call('POST', `/api/admin/events/${eventId}/envelopes`, {}, admin);
    await call('POST', `/api/events/${eventId}/reveal`, {}, cookies.Alpha);
    const table = await board();
    expect(table.rows.find((row) => row.giver.handle === 'alpha.fictif')?.isLocked).toBe(true);
    const other = table.rows.find((row) => row.giver.handle !== 'alpha.fictif')!.giver.handle;
    const result = await call('POST', `/api/admin/events/${eventId}/draw-board/swap`, { a: 'alpha.fictif', b: other }, admin);
    expect(result.status).toBe(409);
    expect(result.body.error).toBe('locked');
  });

  it('flags reciprocal duos without refusing them', () => {
    expect(reciprocalPairs({ a: ['b'], b: ['a'], c: ['d'], d: ['c'] })).toEqual([['a', 'b'], ['c', 'd']]);
    expect(reciprocalPairs({ a: ['b'], b: ['c'], c: ['a'] })).toEqual([]);
    expect(isBalancedDraw({ a: ['b'], b: ['a'], c: ['d'], d: ['c'] }, ['a', 'b', 'c', 'd'], 1)).toBe(true);
    expect(isBalancedDraw({ a: ['a'], b: ['c'], c: ['b'] }, ['a', 'b', 'c'], 1)).toBe(false);
    expect(isBalancedDraw({ a: ['b'], b: ['b'], c: ['a'] }, ['a', 'b', 'c'], 1)).toBe(false);
  });

  it('never shows an anonymous draw, and freezes the mode once drawn', async () => {
    const { call, admin, eventId } = await setupEvent(NAMES);
    await call('POST', `/api/admin/events/${eventId}/draw`, {}, admin);
    expect((await call('GET', `/api/admin/events/${eventId}/draw-board`, undefined, admin)).status).toBe(403);
    expect((await call('POST', `/api/admin/events/${eventId}/draw-board/swap`, { a: 'alpha.fictif', b: 'bravo.fictif' }, admin)).status).toBe(403);
    expect((await call('POST', `/api/admin/events/${eventId}/envelopes`, {}, admin)).status).toBe(403);
    expect((await call('PATCH', `/api/admin/events/${eventId}`, { drawVisibility: 'visible' }, admin)).status).toBe(400);
    expect((await call('GET', `/api/admin/events/${eventId}`, undefined, admin)).body.envelopesOpen).toBe(true);
  });

  it('reads events saved before the option as anonymous and open once drawn', async () => {
    const { db, call, signUp, inviteCode, admin, eventId } = await setupEvent(NAMES);
    const alpha = await signUp('alpha.fictif', inviteCode);
    const stored = (await db.getEvent(eventId))!;
    const { drawVisibility: _mode, envelopesOpen: _open, ...legacy } = stored;
    await db.saveEvent(legacy, Date.now() + 60_000);
    expect((await call('GET', `/api/admin/events/${eventId}`, undefined, admin)).body).toMatchObject({ drawVisibility: 'anonymous', envelopesOpen: false });
    await call('POST', `/api/admin/events/${eventId}/draw`, {}, admin);
    const { envelopesOpen: _again, ...drawnLegacy } = (await db.getEvent(eventId))!;
    await db.saveEvent(drawnLegacy, Date.now() + 60_000);
    expect((await call('POST', `/api/events/${eventId}/reveal`, {}, alpha)).body.targets).toHaveLength(1);
  });
});
