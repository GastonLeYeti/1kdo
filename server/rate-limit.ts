import { LOCK_MINUTES, MAX_TRIES } from '../shared/types.js';
import { keys, type Db } from './db.js';
import { HttpError } from './http.js';

/** Throws a 429 while a handle is locked after too many wrong tries. */
export async function assertNotLocked(db: Db, handle: string): Promise<void> {
  const failures = (await db.store.get<number>(keys.failures(handle))) ?? 0;
  if (failures >= MAX_TRIES) throw lockedError();
}

/** Counts a wrong try and throws: 401 with the tries left, or 429 once locked. */
export async function failTry(db: Db, handle: string, message: string): Promise<never> {
  const failures = await db.store.incr(keys.failures(handle), LOCK_MINUTES * 60);
  const remainingTries = Math.max(0, MAX_TRIES - failures);
  if (remainingTries === 0) throw lockedError();
  throw new HttpError(401, 'wrong-code', message, { remainingTries });
}

/** Forgets the wrong tries of a handle (after a success or a reset). */
export function clearFailures(db: Db, handle: string): Promise<void> {
  return db.store.del(keys.failures(handle));
}

/** The error of a locked handle. */
function lockedError(): HttpError {
  return new HttpError(429, 'locked', `Trop d'essais. Réessaie dans ${LOCK_MINUTES} minutes.`, {
    retryInMinutes: LOCK_MINUTES,
  });
}
