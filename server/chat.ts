// Anonymous chat: one thread per "giver → receiver" pair. The receiver never learns who writes.
import { randomInt } from 'node:crypto';
import { capitalize, getTheme, giverTitle } from '../shared/themes.js';
import { MAX_MESSAGE_LENGTH, type ChatMessage, type ChatSummary, type ChatThreadView } from '../shared/types.js';
import { sessionSecret } from './config.js';
import { sign } from './crypto.js';
import { keys, type ChatIndexRecord, type ChatMessageRecord, type ChatThreadRecord, type Db, type EventRecord } from './db.js';
import { areEnvelopesOpen, personOf } from './events.js';
import { HttpError } from './http.js';
import { closesAt } from './lifecycle.js';

const RATE_LIMIT = 30;
const RATE_WINDOW_SECONDS = 10 * 60;
const PARIS_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' });

type Role = ChatSummary['role'];

/** The opaque id of a pair's thread: stable, but meaningless without the server's secret. */
export function threadIdOf(eventId: string, giver: string, receiver: string): string {
  return sign(`chat|${eventId}|${giver}|${receiver}`, sessionSecret()).slice(0, 22);
}

/** A random "n°" among the ones the receiver's other threads do not use yet. */
function freeNumber(index: ChatIndexRecord, receiver: string, count: number): number {
  const used = new Set(Object.values(index).filter((t) => t.receiver === receiver).map((t) => t.number));
  const free = Array.from({ length: count }, (_, i) => i + 1).filter((n) => !used.has(n));
  return free.length > 0 ? (free[randomInt(free.length)] as number) : used.size + 1;
}

/** Opens the threads of every giver who discovered their names, and returns the index. */
export async function ensureThreads(db: Db, event: EventRecord): Promise<ChatIndexRecord> {
  const index = await db.getChatIndex(event.id);
  if (!areEnvelopesOpen(event) || event.revealed.length === 0) return index;
  const draw = await db.getDraw(event.id);
  let isChanged = false;
  for (const giver of event.revealed) {
    for (const receiver of draw[giver] ?? []) {
      const id = threadIdOf(event.id, giver, receiver);
      if (Object.hasOwn(index, id)) continue;
      index[id] = { giver, receiver, number: freeNumber(index, receiver, event.giftsPerPerson), isMuted: false };
      isChanged = true;
    }
  }
  if (isChanged) await db.saveChatIndex(event.id, index, closesAt(event.date));
  return index;
}

/** The viewer's side of a thread, or null when the thread is not theirs. */
function roleOf(thread: ChatThreadRecord, viewer: string): Role | null {
  if (thread.giver === viewer) return 'giver';
  if (thread.receiver === viewer) return 'receiver';
  return null;
}

/** The thread `id` and the viewer's side of it; 404 for anyone else (its existence stays secret). */
function requireThread(index: ChatIndexRecord, id: string, viewer: string): { thread: ChatThreadRecord; role: Role } {
  const thread = Object.hasOwn(index, id) ? index[id] : undefined;
  const role = thread ? roleOf(thread, viewer) : null;
  if (!thread || !role) throw new HttpError(404, 'unknown-thread', "Cette discussion n'existe pas.");
  return { thread, role };
}

/**
 * A thread as one side sees it. The receiver only gets the theme's neutral title,
 * whatever the giver's pronoun: nothing in it can point to the giver.
 */
function toSummary(event: EventRecord, id: string, thread: ChatThreadRecord, role: Role, unread: number): ChatSummary {
  const isGiver = role === 'giver';
  const receiver = personOf(event, thread.receiver);
  const neutral = capitalize(giverTitle(getTheme(event.theme), 'iel'));
  const title = isGiver ? receiver.name : event.giftsPerPerson > 1 ? `${neutral} n°${thread.number}` : neutral;
  return { id, role, title, with: isGiver ? receiver : null, unread, isMuted: thread.isMuted };
}

/** How many messages of the other side came after the ones already seen. */
function unreadCount(messages: readonly ChatMessageRecord[], role: Role, seenCount: number): number {
  return messages.slice(seenCount).filter((message) => message.from !== role).length;
}

/** A stored message as the viewer sees it: the day only, never the hour. */
function toMessage(message: ChatMessageRecord, role: Role): ChatMessage {
  return { isMine: message.from === role, text: message.text, day: PARIS_DAY.format(new Date(message.at)) };
}

/** The viewer's threads: the ones where they give first, then the ones where they receive. */
export async function listChats(db: Db, event: EventRecord, viewer: string): Promise<ChatSummary[]> {
  const index = await ensureThreads(db, event);
  const seen = await db.getChatSeen(event.id, viewer);
  const mine = Object.entries(index).flatMap(([id, thread]) => {
    const role = roleOf(thread, viewer);
    return role ? [{ id, thread, role }] : [];
  });
  const summaries = await Promise.all(mine.map(async ({ id, thread, role }) => {
    const messages = await db.getMessages(event.id, id);
    return toSummary(event, id, thread, role, unreadCount(messages, role, seen[id] ?? 0));
  }));
  return summaries.sort((a, b) => (a.role === b.role ? a.title.localeCompare(b.title) : a.role === 'giver' ? -1 : 1));
}

/** One thread with its messages; marks them as seen by the viewer (the other side is never told). */
export async function openThread(db: Db, event: EventRecord, viewer: string, id: string): Promise<ChatThreadView> {
  const { thread, role } = requireThread(await ensureThreads(db, event), id, viewer);
  const messages = await db.getMessages(event.id, id);
  const seen = await db.getChatSeen(event.id, viewer);
  if (seen[id] !== messages.length) {
    await db.saveChatSeen(event.id, viewer, { ...seen, [id]: messages.length }, closesAt(event.date));
  }
  return { thread: toSummary(event, id, thread, role, 0), messages: messages.map((message) => toMessage(message, role)) };
}

/** Validates a message: trimmed, not empty, at most MAX_MESSAGE_LENGTH characters. */
function parseMessage(raw: unknown): string {
  const text = typeof raw === 'string' ? raw.trim().replace(/\s+\n/g, '\n') : '';
  if (!text) throw new HttpError(400, 'empty-message', 'Écris un message.');
  if (text.length > MAX_MESSAGE_LENGTH) throw new HttpError(400, 'message-too-long', `${MAX_MESSAGE_LENGTH} caractères maximum.`);
  return text;
}

/** Throws a 429 once a person sent too many messages in the last minutes. */
async function assertUnderRate(db: Db, handle: string): Promise<void> {
  const count = await db.store.incr(keys.chatRate(handle), RATE_WINDOW_SECONDS);
  if (count > RATE_LIMIT) throw new HttpError(429, 'too-many-messages', 'Doucement ! Réessaie dans quelques minutes.');
}

/** Adds the viewer's message to a thread, then returns the thread. A paused thread refuses the giver. */
export async function sendMessage(db: Db, event: EventRecord, viewer: string, id: string, raw: unknown): Promise<ChatThreadView> {
  const { thread, role } = requireThread(await ensureThreads(db, event), id, viewer);
  if (role === 'giver' && thread.isMuted) throw new HttpError(403, 'muted', 'Ce fil est en pause : ton message ne peut pas être envoyé.');
  const text = parseMessage(raw);
  await assertUnderRate(db, viewer);
  await db.addMessage(event.id, id, { from: role, text, at: new Date().toISOString() }, closesAt(event.date));
  return openThread(db, event, viewer, id);
}

/** The receiver pauses (or resumes) a thread. */
export async function setMuted(db: Db, event: EventRecord, viewer: string, id: string, isMuted: boolean): Promise<ChatThreadView> {
  const index = await ensureThreads(db, event);
  const { thread, role } = requireThread(index, id, viewer);
  if (role !== 'receiver') throw new HttpError(403, 'receiver-only', 'Seule la personne qui reçoit peut mettre ce fil en pause.');
  await db.saveChatIndex(event.id, { ...index, [id]: { ...thread, isMuted } }, closesAt(event.date));
  return openThread(db, event, viewer, id);
}
