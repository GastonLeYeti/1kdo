import type { Pronoun, ThemeId } from '../shared/themes.js';
import type { DrawVisibility } from '../shared/types.js';
import type { KeyValueStore } from './store/kv.js';

/** A sign-in account, shared by every event of its handle. */
export interface AccountRecord {
  handle: string;
  /** scrypt hash of the 6-digit code; null until set (or after a reset). */
  codeHash: string | null;
  codeVersion: number;
  pronoun: Pronoun | null;
  createdAt: string;
}

export interface ParticipantRecord {
  handle: string;
  name: string;
}

export interface EventRecord {
  id: string;
  title: string;
  theme: ThemeId;
  date: string;
  time: string | null;
  place: string;
  budget: string;
  giftsPerPerson: number;
  /** Missing on events saved before this option existed: read as "anonymous". */
  drawVisibility?: DrawVisibility;
  /** Missing on events saved before this option existed: read as "open once drawn". */
  envelopesOpen?: boolean;
  inviteCode: string;
  createdAt: string;
  drawnAt: string | null;
  participants: ParticipantRecord[];
  /** Handles of the participants who revealed their names. */
  revealed: string[];
}

/** Who gives to whom: giver handle → receiver handles. Never sent whole to anyone. */
export type DrawRecord = Record<string, string[]>;

/** Post-its of an event: person written about → author → text. */
export type IdeasRecord = Record<string, Record<string, string>>;

/** A chat thread between one giver and one of their receivers. */
export interface ChatThreadRecord {
  giver: string;
  receiver: string;
  /** "n°…" shown to the receiver, picked at random among their free numbers. */
  number: number;
  isMuted: boolean;
}

/** The chat threads of an event, by opaque thread id. */
export type ChatIndexRecord = Record<string, ChatThreadRecord>;

export interface ChatMessageRecord {
  from: 'giver' | 'receiver';
  text: string;
  at: string;
}

/** How many messages of each thread a person has seen: thread id → count. */
export type ChatSeenRecord = Record<string, number>;

const PREFIX = 'kdo';

/** Every key the app writes, in one place. */
export const keys = {
  account: (handle: string) => `${PREFIX}:account:${handle}`,
  membership: (handle: string) => `${PREFIX}:member:${handle}`,
  eventIndex: () => `${PREFIX}:events`,
  event: (id: string) => `${PREFIX}:event:${id}`,
  draw: (eventId: string) => `${PREFIX}:draw:${eventId}`,
  ideas: (eventId: string) => `${PREFIX}:ideas:${eventId}`,
  failures: (handle: string) => `${PREFIX}:fails:${handle}`,
  chatIndex: (eventId: string) => `${PREFIX}:chat:${eventId}`,
  chatMessages: (eventId: string, threadId: string) => `${PREFIX}:chat:${eventId}:${threadId}`,
  chatSeen: (eventId: string, handle: string) => `${PREFIX}:chatseen:${eventId}:${handle}`,
  chatRate: (handle: string) => `${PREFIX}:chatrate:${handle}`,
};

/** Typed reads and writes of the app's records. */
export class Db {
  constructor(readonly store: KeyValueStore) {}

  getAccount(handle: string): Promise<AccountRecord | null> {
    return this.store.get<AccountRecord>(keys.account(handle));
  }

  saveAccount(account: AccountRecord, expireAt: number): Promise<void> {
    return this.store.set(keys.account(account.handle), account, { expireAt });
  }

  /** Ids of the events a handle takes part in (possibly some already gone). */
  async getMembership(handle: string): Promise<string[]> {
    return (await this.store.get<string[]>(keys.membership(handle))) ?? [];
  }

  saveMembership(handle: string, eventIds: string[], expireAt: number): Promise<void> {
    if (eventIds.length === 0) return this.store.del(keys.membership(handle));
    return this.store.set(keys.membership(handle), eventIds, { expireAt });
  }

  async getEventIds(): Promise<string[]> {
    return (await this.store.get<string[]>(keys.eventIndex())) ?? [];
  }

  saveEventIds(ids: string[]): Promise<void> {
    return this.store.set(keys.eventIndex(), ids);
  }

  getEvent(id: string): Promise<EventRecord | null> {
    return this.store.get<EventRecord>(keys.event(id));
  }

  saveEvent(event: EventRecord, expireAt: number): Promise<void> {
    return this.store.set(keys.event(event.id), event, { expireAt });
  }

  async getDraw(eventId: string): Promise<DrawRecord> {
    return (await this.store.get<DrawRecord>(keys.draw(eventId))) ?? {};
  }

  saveDraw(eventId: string, draw: DrawRecord, expireAt: number): Promise<void> {
    return this.store.set(keys.draw(eventId), draw, { expireAt });
  }

  async getIdeas(eventId: string): Promise<IdeasRecord> {
    return (await this.store.get<IdeasRecord>(keys.ideas(eventId))) ?? {};
  }

  saveIdeas(eventId: string, ideas: IdeasRecord, expireAt: number): Promise<void> {
    return this.store.set(keys.ideas(eventId), ideas, { expireAt });
  }

  async getChatIndex(eventId: string): Promise<ChatIndexRecord> {
    return (await this.store.get<ChatIndexRecord>(keys.chatIndex(eventId))) ?? {};
  }

  saveChatIndex(eventId: string, index: ChatIndexRecord, expireAt: number): Promise<void> {
    return this.store.set(keys.chatIndex(eventId), index, { expireAt });
  }

  getMessages(eventId: string, threadId: string): Promise<ChatMessageRecord[]> {
    return this.store.list<ChatMessageRecord>(keys.chatMessages(eventId, threadId));
  }

  addMessage(eventId: string, threadId: string, message: ChatMessageRecord, expireAt: number): Promise<void> {
    return this.store.push(keys.chatMessages(eventId, threadId), message, { expireAt });
  }

  async getChatSeen(eventId: string, handle: string): Promise<ChatSeenRecord> {
    return (await this.store.get<ChatSeenRecord>(keys.chatSeen(eventId, handle))) ?? {};
  }

  saveChatSeen(eventId: string, handle: string, seen: ChatSeenRecord, expireAt: number): Promise<void> {
    return this.store.set(keys.chatSeen(eventId, handle), seen, { expireAt });
  }

  /** Every chat key of an event: its index, each thread's messages, each participant's "seen". */
  async chatKeys(event: EventRecord): Promise<string[]> {
    const threadIds = Object.keys(await this.getChatIndex(event.id));
    return [
      keys.chatIndex(event.id),
      ...threadIds.map((threadId) => keys.chatMessages(event.id, threadId)),
      ...event.participants.map((p) => keys.chatSeen(event.id, p.handle)),
    ];
  }

  /** Removes an event and everything attached to it. */
  async deleteEventData(event: EventRecord): Promise<void> {
    await this.store.del(keys.event(event.id), keys.draw(event.id), keys.ideas(event.id), ...(await this.chatKeys(event)));
  }
}
