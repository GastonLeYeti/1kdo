// "Tirage visible": the admin sees who gives to whom, swaps receivers, then opens the envelopes.
import type { DrawBoard } from '../shared/types.js';
import type { Db, DrawRecord, EventRecord } from './db.js';
import { areEnvelopesOpen, isParticipant, personOf, visibilityOf } from './events.js';
import { HttpError } from './http.js';
import { closesAt } from './lifecycle.js';

/** Throws unless the event's draw is made in visible mode: an anonymous draw is never shown. */
function assertVisibleDraw(event: EventRecord): void {
  if (visibilityOf(event) !== 'visible') {
    throw new HttpError(403, 'anonymous-draw', 'Ce tirage est 100 % anonyme : personne ne peut le voir.');
  }
  if (!event.drawnAt) throw new HttpError(409, 'not-drawn', "Le tirage n'est pas encore lancé.");
}

/** Duos who give to each other (A → B and B → A), each listed once. */
export function reciprocalPairs(draw: DrawRecord): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (const [giver, receivers] of Object.entries(draw)) {
    for (const receiver of receivers) {
      if (giver < receiver && draw[receiver]?.includes(giver)) pairs.push([giver, receiver]);
    }
  }
  return pairs;
}

/**
 * True when the draw follows the rules: everybody gives `gifts` presents and receives
 * `gifts` presents, never to themselves and never twice to the same person.
 */
export function isBalancedDraw(draw: DrawRecord, handles: readonly string[], gifts: number): boolean {
  const received = new Map(handles.map((handle) => [handle, 0]));
  for (const giver of handles) {
    const receivers = draw[giver] ?? [];
    if (receivers.length !== gifts || new Set(receivers).size !== gifts || receivers.includes(giver)) return false;
    for (const receiver of receivers) {
      const count = received.get(receiver);
      if (count === undefined) return false;
      received.set(receiver, count + 1);
    }
  }
  return [...received.values()].every((count) => count === gifts);
}

/** The whole draw as the admin's table, with names. */
function toBoard(event: EventRecord, draw: DrawRecord): DrawBoard {
  return {
    rows: event.participants.map((giver) => ({
      giver,
      receivers: (draw[giver.handle] ?? []).map((receiver) => personOf(event, receiver)),
      isLocked: event.revealed.includes(giver.handle),
    })),
    reciprocalPairs: reciprocalPairs(draw).map(([a, b]) => [personOf(event, a), personOf(event, b)]),
    envelopesOpen: areEnvelopesOpen(event),
  };
}

/** Admin, visible mode: "Qui offre à qui". */
export async function drawBoard(db: Db, event: EventRecord): Promise<DrawBoard> {
  assertVisibleDraw(event);
  return toBoard(event, await db.getDraw(event.id));
}

/** Throws unless `handle` is a participant whose receivers may still change. */
function assertSwappable(event: EventRecord, handle: string): void {
  if (!isParticipant(event, handle)) throw new HttpError(404, 'unknown-person', "Cette personne ne fait pas partie de l'événement.");
  if (event.revealed.includes(handle)) {
    throw new HttpError(409, 'locked', `${personOf(event, handle).name} a déjà découvert son nom : sa ligne est verrouillée 🔒`);
  }
}

/** Admin, visible mode: `a` and `b` exchange their lists of receivers. */
export async function swapReceivers(db: Db, event: EventRecord, a: string, b: string): Promise<DrawBoard> {
  assertVisibleDraw(event);
  if (a === b) throw new HttpError(400, 'same-person', 'Choisis deux personnes différentes.');
  assertSwappable(event, a);
  assertSwappable(event, b);
  const draw = await db.getDraw(event.id);
  const swapped: DrawRecord = { ...draw, [a]: draw[b] ?? [], [b]: draw[a] ?? [] };
  const selfGiver = [a, b].find((handle) => swapped[handle]?.includes(handle));
  if (selfGiver) {
    throw new HttpError(409, 'self-gift', `Échange impossible : ${personOf(event, selfGiver).name} s'offrirait un cadeau.`);
  }
  if (!isBalancedDraw(swapped, event.participants.map((p) => p.handle), event.giftsPerPerson)) {
    throw new HttpError(409, 'unbalanced', 'Échange impossible : le tirage ne serait plus équilibré.');
  }
  await db.saveDraw(event.id, swapped, closesAt(event.date));
  return toBoard(event, swapped);
}

/** Admin, visible mode: from now on participants can discover their names. */
export async function openEnvelopes(db: Db, event: EventRecord): Promise<EventRecord> {
  assertVisibleDraw(event);
  if (areEnvelopesOpen(event)) throw new HttpError(409, 'already-open', 'Les enveloppes sont déjà ouvertes.');
  const opened: EventRecord = { ...event, envelopesOpen: true };
  await db.saveEvent(opened, closesAt(event.date));
  return opened;
}
