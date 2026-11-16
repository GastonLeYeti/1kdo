import { beforeAll, describe, expect, it } from 'vitest';
import type { ChatSummary, ChatThreadView } from '../shared/types';
import { setTestEnv, setupEvent } from './helpers';

const NAMES = ['Alpha', 'Bravo', 'Charlie', 'Delta'];
const handleOf = (name: string) => `${name.toLowerCase()}.fictif`;

beforeAll(setTestEnv);

/** An anonymous event, everyone signed up and drawn, with helpers to chat. */
async function drawnEvent(giftsPerPerson = 1) {
  const setup = await setupEvent(NAMES, giftsPerPerson);
  const { call, signUp, admin, eventId, inviteCode } = setup;
  const cookies = Object.fromEntries(await Promise.all(NAMES.map(async (n) => [n, await signUp(handleOf(n), inviteCode)] as const)));
  await call('POST', `/api/admin/events/${eventId}/draw`, {}, admin);
  const base = `/api/events/${eventId}/chats`;
  const chats = async (name: string): Promise<ChatSummary[]> => (await call('GET', base, undefined, cookies[name])).body;
  /** Reveals `name`'s draw and returns their receivers' handles. */
  const reveal = async (name: string): Promise<string[]> =>
    (await call('POST', `/api/events/${eventId}/reveal`, {}, cookies[name])).body.targets.map((t: { handle: string }) => t.handle);
  const nameOf = (handle: string) => NAMES.find((n) => handleOf(n) === handle) as string;
  return { ...setup, cookies, base, chats, reveal, nameOf };
}

describe('anonymous chat', () => {
  it('opens a thread once the giver discovered the name, on both sides', async () => {
    const { chats, reveal, nameOf } = await drawnEvent();
    expect(await chats('Alpha')).toEqual([]);
    const [receiver] = await reveal('Alpha');
    const giverSide = await chats('Alpha');
    expect(giverSide).toMatchObject([{ role: 'giver', title: nameOf(receiver!), with: { handle: receiver } }]);
    const receiverSide = await chats(nameOf(receiver!));
    expect(receiverSide).toContainEqual(expect.objectContaining({ id: giverSide[0]!.id, role: 'receiver', title: "L'Esprit de Noël", with: null }));
  });

  it('never tells the receiver who writes, whatever the pronoun', async () => {
    const { call, cookies, base, chats, reveal, nameOf } = await drawnEvent();
    await call('PATCH', '/api/me', { pronoun: 'elle' }, cookies.Alpha);
    const [receiver] = await reveal('Alpha');
    const thread = (await chats('Alpha'))[0]!;
    await call('POST', `${base}/${thread.id}/messages`, { text: 'Coucou, tu préfères le thé ou le café ?' }, cookies.Alpha);
    const receiverCookie = cookies[nameOf(receiver!)];
    const seen = [
      JSON.stringify(await chats(nameOf(receiver!))),
      JSON.stringify((await call('GET', `${base}/${thread.id}`, undefined, receiverCookie)).body),
      JSON.stringify((await call('POST', `${base}/${thread.id}/messages`, { text: 'Le thé !' }, receiverCookie)).body),
    ].join('');
    expect(seen).not.toMatch(/alpha/i);
    expect(seen).not.toMatch(/Mère Noël/);
    expect(seen).toMatch(/L'Esprit de Noël/);
  });

  it('lets the receiver write first, then answers both sides with the day only', async () => {
    const { call, cookies, base, chats, reveal, nameOf } = await drawnEvent();
    const [receiver] = await reveal('Alpha');
    const receiverCookie = cookies[nameOf(receiver!)];
    const thread = (await chats(nameOf(receiver!))).find((t) => t.role === 'receiver')!;
    const sent = await call<ChatThreadView>('POST', `${base}/${thread.id}/messages`, { text: 'Merci par avance 🎁' }, receiverCookie);
    expect(sent.body.messages).toEqual([{ isMine: true, text: 'Merci par avance 🎁', day: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }]);
    expect(JSON.stringify(sent.body)).not.toMatch(/T\d{2}:\d{2}/);
    expect((await chats('Alpha'))[0]!.unread).toBe(1);
    const read = await call<ChatThreadView>('GET', `${base}/${thread.id}`, undefined, cookies.Alpha);
    expect(read.body.messages[0]).toMatchObject({ isMine: false, text: 'Merci par avance 🎁' });
    expect((await chats('Alpha'))[0]!.unread).toBe(0);
  });

  it('keeps everyone else out, the admin included', async () => {
    const { call, cookies, admin, base, chats, reveal, nameOf } = await drawnEvent();
    const [receiver] = await reveal('Alpha');
    const thread = (await chats('Alpha'))[0]!;
    const outsider = NAMES.find((n) => n !== 'Alpha' && n !== nameOf(receiver!))!;
    expect((await call('GET', `${base}/${thread.id}`, undefined, cookies[outsider])).status).toBe(404);
    expect((await call('POST', `${base}/${thread.id}/messages`, { text: 'Coucou' }, cookies[outsider])).status).toBe(404);
    expect((await call('GET', `${base}/${thread.id}`, undefined, admin)).status).toBe(404);
    expect((await call('GET', `${base}/constructor`, undefined, cookies.Alpha)).status).toBe(404);
  });

  it('refuses empty and too long messages', async () => {
    const { call, cookies, base, chats, reveal } = await drawnEvent();
    await reveal('Alpha');
    const thread = (await chats('Alpha'))[0]!;
    expect((await call('POST', `${base}/${thread.id}/messages`, { text: '   ' }, cookies.Alpha)).status).toBe(400);
    expect((await call('POST', `${base}/${thread.id}/messages`, { text: 'x'.repeat(501) }, cookies.Alpha)).status).toBe(400);
    expect((await call('POST', `${base}/${thread.id}/messages`, { text: 'x'.repeat(500) }, cookies.Alpha)).status).toBe(200);
  });

  it('numbers the threads of a receiver of several gifts', async () => {
    const { chats, reveal } = await drawnEvent(2);
    for (const name of NAMES) await reveal(name);
    const titles = (await chats('Alpha')).filter((t) => t.role === 'receiver').map((t) => t.title).sort();
    expect(titles).toEqual(["L'Esprit de Noël n°1", "L'Esprit de Noël n°2"]);
  });

  it('lets the receiver pause a thread', async () => {
    const { call, cookies, base, chats, reveal, nameOf } = await drawnEvent();
    const [receiver] = await reveal('Alpha');
    const thread = (await chats('Alpha'))[0]!;
    const receiverCookie = cookies[nameOf(receiver!)];
    expect((await call('POST', `${base}/${thread.id}/mute`, { isMuted: true }, cookies.Alpha)).status).toBe(403);
    expect((await call('POST', `${base}/${thread.id}/mute`, { isMuted: true }, receiverCookie)).body.thread.isMuted).toBe(true);
    expect((await call('POST', `${base}/${thread.id}/messages`, { text: 'Coucou' }, cookies.Alpha)).status).toBe(403);
    await call('POST', `${base}/${thread.id}/mute`, { isMuted: false }, receiverCookie);
    expect((await call('POST', `${base}/${thread.id}/messages`, { text: 'Coucou' }, cookies.Alpha)).status).toBe(200);
  });

  it('deletes the messages with the event', async () => {
    const { db, call, cookies, admin, eventId, base, chats, reveal } = await drawnEvent();
    await reveal('Alpha');
    const thread = (await chats('Alpha'))[0]!;
    await call('POST', `${base}/${thread.id}/messages`, { text: 'Coucou' }, cookies.Alpha);
    await call('DELETE', `/api/admin/events/${eventId}`, {}, admin);
    expect(await db.getMessages(eventId, thread.id)).toEqual([]);
    expect(await db.getChatIndex(eventId)).toEqual({});
  });
});
