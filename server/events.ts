import { isThemeId } from '../shared/themes.js';
import { DRAW_VISIBILITIES, type AdminEvent, type DrawVisibility, type EventInfo, type EventInput, type EventSummary, type MyDraw, type Person } from '../shared/types.js';
import { randomId } from './crypto.js';
import type { Db, EventRecord } from './db.js';
import { drawTargets } from './draw.js';
import { cleanText } from './handles.js';
import { HttpError } from './http.js';
import { countIdeasAbout } from './ideas.js';
import { closesAt, closingDay, isClosed, parseDate } from './lifecycle.js';
import { addMembership, isAdmin, refreshMembership, removeMembership } from './membership.js';
import { adminHandle } from './config.js';

const MAX_GIFTS = 5;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Validates what the admin typed for an event, or throws a 400 naming the faulty field. */
export function parseEventInput(fields: Record<string, unknown>): EventInput {
  const title = cleanText(fields.title, 60);
  if (!title) throw badInput('Donne un titre à l’événement.');
  if (!isThemeId(fields.theme)) throw badInput('Choisis un thème.');
  if (typeof fields.date !== 'string' || !parseDate(fields.date)) throw badInput('Choisis une date valide.');
  if (isClosed(fields.date)) throw badInput('La date est déjà passée.');
  const time = typeof fields.time === 'string' && TIME_PATTERN.test(fields.time) ? fields.time : null;
  const giftsPerPerson = Number(fields.giftsPerPerson);
  if (!Number.isInteger(giftsPerPerson) || giftsPerPerson < 1 || giftsPerPerson > MAX_GIFTS) {
    throw badInput(`Le nombre de cadeaux par personne va de 1 à ${MAX_GIFTS}.`);
  }
  return {
    title,
    theme: fields.theme,
    date: fields.date,
    time,
    place: cleanText(fields.place, 80) ?? '',
    budget: cleanText(fields.budget, 30) ?? '',
    giftsPerPerson,
    drawVisibility: DRAW_VISIBILITIES.includes(fields.drawVisibility as DrawVisibility) ? (fields.drawVisibility as DrawVisibility) : 'anonymous',
  };
}

/** The draw mode of an event; events saved before the option existed are anonymous. */
export function visibilityOf(event: EventRecord): DrawVisibility {
  return event.drawVisibility ?? 'anonymous';
}

/** True once participants may discover their names (events saved before the option: as soon as drawn). */
export function areEnvelopesOpen(event: EventRecord): boolean {
  return event.drawnAt !== null && (event.envelopesOpen ?? true);
}

/** A 400 error about the event form. */
function badInput(message: string): HttpError {
  return new HttpError(400, 'bad-input', message);
}

/** Loads a running event, or throws 404 (unknown or expired) / 410 (over). */
export async function requireEvent(db: Db, id: string): Promise<EventRecord> {
  const event = await db.getEvent(id);
  if (!event) throw new HttpError(404, 'event-gone', "Cet événement n'existe pas ou il est terminé.");
  if (isClosed(event.date)) throw new HttpError(410, 'event-closed', "C'est fini !");
  return event;
}

/** Loads an event the signed-in person may open: a participant's, or any event for the admin. */
export async function requireVisibleEvent(db: Db, id: string, handle: string): Promise<EventRecord> {
  const event = await requireEvent(db, id);
  if (!isParticipant(event, handle) && !isAdmin(handle)) {
    throw new HttpError(403, 'not-a-participant', "Tu ne fais pas partie de cet événement.");
  }
  return event;
}

/** True when the handle is in the event's list. */
export function isParticipant(event: EventRecord, handle: string): boolean {
  return event.participants.some((participant) => participant.handle === handle);
}

/** Saves an event and moves the expiry of everything attached to it (draw, ideas, chats) to its date. */
async function saveEventEverywhere(db: Db, event: EventRecord): Promise<void> {
  const expireAt = closesAt(event.date);
  await db.saveEvent(event, expireAt);
  await db.saveDraw(event.id, await db.getDraw(event.id), expireAt);
  await db.saveIdeas(event.id, await db.getIdeas(event.id), expireAt);
  await Promise.all((await db.chatKeys(event)).map((key) => db.store.expire(key, expireAt)));
}

/** Admin: creates an event with its own invitation code. */
export async function createEvent(db: Db, input: EventInput): Promise<EventRecord> {
  const event: EventRecord = {
    ...input,
    id: randomId(10),
    inviteCode: randomId(8),
    createdAt: new Date().toISOString(),
    drawnAt: null,
    participants: [],
    revealed: [],
  };
  await db.saveEvent(event, closesAt(event.date));
  await db.saveEventIds([...(await db.getEventIds()), event.id]);
  await refreshMembership(db, adminHandle());
  return event;
}

/** Admin: changes an event's settings; the number of gifts is frozen once drawn. */
export async function updateEvent(db: Db, event: EventRecord, input: EventInput): Promise<EventRecord> {
  if (event.drawnAt && input.giftsPerPerson !== event.giftsPerPerson) {
    throw badInput('Le tirage est fait : le nombre de cadeaux ne peut plus changer.');
  }
  if (event.drawnAt && input.drawVisibility !== visibilityOf(event)) {
    throw badInput('Le tirage est fait : son mode ne peut plus changer.');
  }
  const updated: EventRecord = { ...event, ...input };
  await saveEventEverywhere(db, updated);
  if (updated.date !== event.date) {
    await Promise.all(updated.participants.map((p) => refreshMembership(db, p.handle)));
  }
  return updated;
}

/** Throws while the list is frozen by the draw. */
function assertNotDrawn(event: EventRecord): void {
  if (event.drawnAt) throw new HttpError(409, 'already-drawn', 'Le tirage est fait : la liste est figée.');
}

/** Admin: adds someone to the list (before the draw). */
export async function addParticipant(db: Db, event: EventRecord, person: Person): Promise<EventRecord> {
  assertNotDrawn(event);
  if (isParticipant(event, person.handle)) throw new HttpError(409, 'duplicate', `@${person.handle} est déjà dans la liste.`);
  const updated = { ...event, participants: [...event.participants, person] };
  await db.saveEvent(updated, closesAt(updated.date));
  await addMembership(db, person.handle, event.id);
  return updated;
}

/** Admin: removes someone from the list (before the draw), with the ideas by and about them. */
export async function removeParticipant(db: Db, event: EventRecord, handle: string): Promise<EventRecord> {
  assertNotDrawn(event);
  const updated = { ...event, participants: event.participants.filter((p) => p.handle !== handle) };
  await db.saveEvent(updated, closesAt(updated.date));
  await db.saveIdeas(event.id, withoutIdeasOf(await db.getIdeas(event.id), handle), closesAt(updated.date));
  await removeMembership(db, handle, event.id);
  return updated;
}

/** The ideas of an event minus the ones written by or about `handle`. */
function withoutIdeasOf(ideas: Record<string, Record<string, string>>, handle: string): Record<string, Record<string, string>> {
  const kept: Record<string, Record<string, string>> = {};
  for (const [about, byAuthor] of Object.entries(ideas)) {
    if (about === handle) continue;
    kept[about] = Object.fromEntries(Object.entries(byAuthor).filter(([author]) => author !== handle));
  }
  return kept;
}

/** Admin: runs the secret draw and freezes the list. */
export async function launchDraw(db: Db, event: EventRecord): Promise<EventRecord> {
  assertNotDrawn(event);
  const needed = event.giftsPerPerson + 1;
  if (event.participants.length < needed) {
    throw new HttpError(409, 'too-few', `Il faut au moins ${needed} participants pour ${event.giftsPerPerson} cadeau(x) chacun.`);
  }
  const draw = drawTargets(event.participants.map((p) => p.handle), event.giftsPerPerson);
  // In visible mode the envelopes stay closed until the admin has checked the draw.
  const drawn: EventRecord = { ...event, drawnAt: new Date().toISOString(), envelopesOpen: visibilityOf(event) === 'anonymous' };
  await db.saveDraw(event.id, draw, closesAt(event.date));
  await db.saveEvent(drawn, closesAt(event.date));
  return drawn;
}

/** Admin: deletes an event and all of its data right now. */
export async function deleteEvent(db: Db, event: EventRecord): Promise<void> {
  await db.deleteEventData(event);
  await db.saveEventIds((await db.getEventIds()).filter((id) => id !== event.id));
  await Promise.all(event.participants.map((p) => removeMembership(db, p.handle, event.id)));
  await refreshMembership(db, adminHandle());
}

/** Admin: every running event, dropping the ones that expired from the index. */
export async function listAllEvents(db: Db): Promise<EventRecord[]> {
  const ids = await db.getEventIds();
  const events = await Promise.all(ids.map((id) => db.getEvent(id)));
  const live = events.filter((event): event is EventRecord => event !== null && !isClosed(event.date));
  if (live.length !== ids.length) await db.saveEventIds(live.map((event) => event.id));
  return live;
}

/** The fields of an event every list shows. */
export function toSummary(event: EventRecord): EventSummary {
  return { id: event.id, title: event.title, theme: event.theme, date: event.date, time: event.time };
}

/** An event as a participant sees it, with "La bande". */
export async function toEventInfo(db: Db, event: EventRecord): Promise<EventInfo> {
  const ideas = await db.getIdeas(event.id);
  const boss = await db.getAccount(adminHandle());
  return {
    ...toSummary(event),
    place: event.place,
    budget: event.budget,
    giftsPerPerson: event.giftsPerPerson,
    closesOn: closingDay(event.date),
    isDrawn: areEnvelopesOpen(event),
    bossPronoun: boss?.pronoun ?? null,
    people: event.participants.map((p) => ({ ...p, ideaCount: countIdeasAbout(ideas, p.handle) })),
  };
}

/** An event as the admin manages it: who signed up and who revealed, never who drew whom. */
export async function toAdminEvent(db: Db, event: EventRecord): Promise<AdminEvent> {
  const { people, ...info } = await toEventInfo(db, event);
  const accounts = await Promise.all(people.map((p) => db.getAccount(p.handle)));
  return {
    ...info,
    inviteCode: event.inviteCode,
    drawnAt: event.drawnAt,
    drawVisibility: visibilityOf(event),
    envelopesOpen: areEnvelopesOpen(event),
    participants: people.map((p, index) => ({
      handle: p.handle,
      name: p.name,
      isRegistered: Boolean(accounts[index]?.codeHash),
      hasRevealed: event.revealed.includes(p.handle),
    })),
  };
}

/**
 * The signed-in person's draw; names are only sent once revealed (`reveal` reveals them).
 * While the envelopes are closed the draw looks not made yet, and revealing is refused.
 */
export async function myDraw(db: Db, event: EventRecord, handle: string, reveal: boolean): Promise<MyDraw> {
  const isOpen = areEnvelopesOpen(event);
  if (reveal && event.drawnAt && !isOpen) {
    throw new HttpError(409, 'envelopes-closed', "Patience : le tirage n'est pas encore fait.");
  }
  const receivers = isOpen ? ((await db.getDraw(event.id))[handle] ?? []) : [];
  let isRevealed = event.revealed.includes(handle);
  if (reveal && receivers.length > 0 && !isRevealed) {
    await db.saveEvent({ ...event, revealed: [...event.revealed, handle] }, closesAt(event.date));
    isRevealed = true;
  }
  const targets = isRevealed ? receivers.map((receiver) => personOf(event, receiver)) : [];
  return { isDrawn: isOpen, isRevealed, targetCount: receivers.length, targets };
}

/** The participant with this handle (name falls back to the handle). */
export function personOf(event: EventRecord, handle: string): Person {
  return event.participants.find((p) => p.handle === handle) ?? { handle, name: handle };
}
