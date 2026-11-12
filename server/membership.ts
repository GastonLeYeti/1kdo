import { adminHandle } from './config.js';
import { keys, type Db, type EventRecord } from './db.js';
import { adminAccountExpiry, closesAt, isClosed } from './lifecycle.js';

/** The still-running events a handle takes part in. */
export async function liveEventsOf(db: Db, handle: string): Promise<EventRecord[]> {
  const ids = await db.getMembership(handle);
  const events = await Promise.all(ids.map((id) => db.getEvent(id)));
  return events.filter((event): event is EventRecord => event !== null && !isClosed(event.date));
}

/** True when this handle is the admin's. */
export function isAdmin(handle: string): boolean {
  return handle === adminHandle();
}

/** When an account (or membership) should expire: with its last running event, later for the admin. */
export function expiryFor(handle: string, events: readonly EventRecord[], now = Date.now()): number {
  const latest = Math.max(now, ...events.map((event) => closesAt(event.date)));
  return isAdmin(handle) ? Math.max(latest, adminAccountExpiry(now)) : latest;
}

/** The first name the admin gave this handle, or the handle itself. */
export function displayName(handle: string, events: readonly EventRecord[]): string {
  for (const event of events) {
    const participant = event.participants.find((p) => p.handle === handle);
    if (participant) return participant.name;
  }
  return handle;
}

/** Rewrites a handle's membership list and account expiry after its events changed. */
export async function refreshMembership(db: Db, handle: string): Promise<void> {
  const events = await liveEventsOf(db, handle);
  const stillMember = events.filter((event) => event.participants.some((p) => p.handle === handle));
  const expireAt = expiryFor(handle, stillMember);
  await db.saveMembership(handle, stillMember.map((event) => event.id), expireAt);
  const account = await db.getAccount(handle);
  if (!account) return;
  if (stillMember.length === 0 && !isAdmin(handle)) await db.store.del(keys.account(handle));
  else await db.saveAccount(account, expireAt);
}

/** Records that a handle takes part in an event, then refreshes its expiries. */
export async function addMembership(db: Db, handle: string, eventId: string): Promise<void> {
  const ids = await db.getMembership(handle);
  if (!ids.includes(eventId)) await db.saveMembership(handle, [...ids, eventId], Date.now() + 60_000);
  await refreshMembership(db, handle);
}

/** Records that a handle left an event (or that it was deleted), then refreshes its expiries. */
export async function removeMembership(db: Db, handle: string, eventId: string): Promise<void> {
  const ids = await db.getMembership(handle);
  await db.saveMembership(handle, ids.filter((id) => id !== eventId), Date.now() + 60_000);
  await refreshMembership(db, handle);
}
