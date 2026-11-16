// Shapes exchanged between the API and the web app.
import type { Pronoun, ThemeId } from './themes.js';

export const CODE_LENGTH = 6;
export const MAX_IDEA_LENGTH = 280;
export const MAX_TRIES = 5;
export const LOCK_MINUTES = 15;
export const MAX_MESSAGE_LENGTH = 500;

/** "100 % anonyme" (nobody sees the draw) or "visible" (the admin sees and adjusts it). */
export type DrawVisibility = 'anonymous' | 'visible';
export const DRAW_VISIBILITIES: readonly DrawVisibility[] = ['anonymous', 'visible'];

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
  /** True once names can be discovered: drawn, and the envelopes are open. */
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
  /** Admin only: participants are never told whether the draw is visible. */
  drawVisibility: DrawVisibility;
  envelopesOpen: boolean;
  participants: AdminParticipant[];
}

/** One line of "Qui offre à qui" (visible mode only). */
export interface DrawBoardRow {
  giver: Person;
  receivers: Person[];
  /** The giver discovered their names: their receivers can no longer change. */
  isLocked: boolean;
}

/** The whole draw, as the admin sees it in visible mode. */
export interface DrawBoard {
  rows: DrawBoardRow[];
  /** Duos who give to each other (A → B and B → A): allowed, but flagged. */
  reciprocalPairs: Array<[Person, Person]>;
  envelopesOpen: boolean;
}

/** A chat thread between a giver and one of their receivers, as one side sees it. */
export interface ChatSummary {
  /** Opaque id: it never tells the receiver who the giver is. */
  id: string;
  role: 'giver' | 'receiver';
  /** "Sam" for the giver; the theme's neutral title ("L'Esprit de Noël n°2") for the receiver. */
  title: string;
  /** The receiver, on the giver's side only. */
  with: Person | null;
  unread: number;
  isMuted: boolean;
}

/** A message, dated by its day only ("YYYY-MM-DD", Paris time): never the hour. */
export interface ChatMessage {
  isMine: boolean;
  text: string;
  day: string;
}

export interface ChatThreadView {
  thread: ChatSummary;
  messages: ChatMessage[];
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
  drawVisibility: DrawVisibility;
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
