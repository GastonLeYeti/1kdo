// Shapes exchanged between the API and the web app.
import type { Pronoun, ThemeId } from './themes.js';

export const CODE_LENGTH = 6;
export const MAX_IDEA_LENGTH = 280;
export const MAX_TRIES = 5;
export const LOCK_MINUTES = 15;

/** Someone of an event, as everybody sees them. */
export interface Person {
  handle: string;
  name: string;
}

/** A card of "La bande". */
export interface PersonCard extends Person {
  ideaCount: number;
}

/** What the session endpoint says about the signed-in person. */
export interface SessionUser {
  handle: string;
  name: string;
  isAdmin: boolean;
  pronoun: Pronoun | null;
}

/** An event in a list ("Mes événements", QG). */
export interface EventSummary {
  id: string;
  title: string;
  theme: ThemeId;
  date: string;
  time: string | null;
}

export interface SessionInfo {
  user: SessionUser | null;
  events: EventSummary[];
  /** Pronoun of the admin, to write her title right ("la Mère Noël Supérieure"). */
  bossPronoun: Pronoun | null;
}

/** An event as one of its participants sees it. */
export interface EventInfo extends EventSummary {
  place: string;
  budget: string;
  giftsPerPerson: number;
  closesOn: string;
  isDrawn: boolean;
  bossPronoun: Pronoun | null;
  people: PersonCard[];
}

/** The signed-in person's own draw. Targets are only sent once revealed. */
export interface MyDraw {
  isDrawn: boolean;
  isRevealed: boolean;
  targetCount: number;
  targets: Person[];
}

/** A person's sheet: the ideas the viewer may see. */
export interface PersonSheet extends Person {
  isMe: boolean;
  pronoun: Pronoun | null;
  /** What the person wrote about themselves ("Ce que tu aimes"). */
  selfNote: string | null;
  /** Anonymous ideas of the others (never sent to the person themselves). */
  ideas: string[];
  /** The viewer's own post-it on this sheet. */
  myIdea: string | null;
  /** On one's own sheet: how many ideas the others wrote (content hidden). */
  hiddenIdeaCount: number;
}

/** A participant as the admin sees them in the QG. */
export interface AdminParticipant extends Person {
  isRegistered: boolean;
  hasRevealed: boolean;
}

/** An event as the admin manages it. */
export interface AdminEvent extends Omit<EventInfo, 'people'> {
  inviteCode: string;
  drawnAt: string | null;
  participants: AdminParticipant[];
}

/** Fields the admin types when creating or editing an event. */
export interface EventInput {
  title: string;
  theme: ThemeId;
  date: string;
  time: string | null;
  place: string;
  budget: string;
  giftsPerPerson: number;
}

/** Public status of an event link. */
export type EventStatus = { isOpen: false } | { isOpen: true; title: string; theme: ThemeId };

/** Where a handle stands before signing in. */
export type AuthState =
  | { state: 'not-listed' }
  | { state: 'needs-invite'; name: string }
  | { state: 'register'; name: string }
  | { state: 'login'; name: string };

/** Body of an API error. */
export interface ApiErrorBody {
  error: string;
  message: string;
  remainingTries?: number;
  retryInMinutes?: number;
}
