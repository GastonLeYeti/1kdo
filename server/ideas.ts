import { MAX_IDEA_LENGTH } from '../shared/types.js';
import type { PersonSheet } from '../shared/types.js';
import type { Db, EventRecord, IdeasRecord } from './db.js';
import { cleanText } from './handles.js';
import { HttpError } from './http.js';
import { closesAt } from './lifecycle.js';

/** How many post-its are about this person (their own included). */
export function countIdeasAbout(ideas: IdeasRecord, handle: string): number {
  return Object.keys(ideas[handle] ?? {}).length;
}

/** Throws a 404 when the handle is not in the event's list. */
function requireListed(event: EventRecord, handle: string): void {
  if (!event.participants.some((p) => p.handle === handle)) {
    throw new HttpError(404, 'unknown-person', "Cette personne ne fait pas partie de l'événement.");
  }
}

/**
 * A person's sheet as `viewer` may see it. On their own sheet people only get
 * what they wrote themselves and a count of the others' ideas: the surprise holds.
 * Elsewhere the others' ideas come without author, sorted so their order tells nothing.
 */
export async function personSheet(db: Db, event: EventRecord, viewer: string, about: string): Promise<PersonSheet> {
  requireListed(event, about);
  const byAuthor = (await db.getIdeas(event.id))[about] ?? {};
  const selfNote = byAuthor[about] ?? null;
  const othersIdeas = Object.entries(byAuthor).filter(([author]) => author !== about);
  const account = await db.getAccount(about);
  const person = event.participants.find((p) => p.handle === about)!;
  const isMe = viewer === about;
  return {
    ...person,
    isMe,
    pronoun: account?.pronoun ?? null,
    selfNote,
    ideas: isMe ? [] : othersIdeas.filter(([author]) => author !== viewer).map(([, text]) => text).sort(),
    myIdea: isMe ? selfNote : (byAuthor[viewer] ?? null),
    hiddenIdeaCount: isMe ? othersIdeas.length : 0,
  };
}

/** Writes (or with an empty text, removes) the viewer's own post-it on a sheet. */
export async function saveIdea(db: Db, event: EventRecord, viewer: string, about: string, rawText: unknown): Promise<void> {
  requireListed(event, about);
  requireListed(event, viewer);
  const text = cleanText(rawText, MAX_IDEA_LENGTH);
  const ideas = await db.getIdeas(event.id);
  const byAuthor = { ...(ideas[about] ?? {}) };
  if (text) byAuthor[viewer] = text;
  else delete byAuthor[viewer];
  await db.saveIdeas(event.id, { ...ideas, [about]: byAuthor }, closesAt(event.date));
}
