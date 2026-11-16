import { useEffect, useState } from 'react';

/** The pages of the app, read from the URL. */
export type Route =
  | { page: 'home' }
  | { page: 'qg' }
  | { page: 'moi' }
  | { page: 'event'; eventId: string; tab: EventTab; handle?: string; thread?: string };

export type EventTab = 'tirage' | 'bande' | 'person' | 'fiche' | 'qg' | 'chat';

/** Reads a route from a pathname. */
export function parseRoute(pathname: string): Route {
  const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'qg' && parts.length === 1) return { page: 'qg' };
  if (parts[0] === 'moi' && parts.length === 1) return { page: 'moi' };
  if (parts[0] !== 'e' || !parts[1]) return { page: 'home' };
  const eventId = parts[1];
  if (parts[2] === 'p' && parts[3]) return { page: 'event', eventId, tab: 'person', handle: parts[3] };
  if (parts[2] === 'm' && parts[3]) return { page: 'event', eventId, tab: 'chat', thread: parts[3] };
  if (parts[2] === 'bande' || parts[2] === 'fiche' || parts[2] === 'qg') return { page: 'event', eventId, tab: parts[2] };
  return { page: 'event', eventId, tab: 'tirage' };
}

/** The URL of an event's tab; `param` is the handle of a person's sheet or the id of a chat thread. */
export function eventPath(eventId: string, tab: EventTab = 'tirage', param?: string): string {
  const base = `/e/${encodeURIComponent(eventId)}`;
  if (tab === 'tirage') return base;
  if (tab === 'person') return `${base}/p/${encodeURIComponent(param ?? '')}`;
  if (tab === 'chat') return `${base}/m/${encodeURIComponent(param ?? '')}`;
  return `${base}/${tab}`;
}

/** Goes to a page without reloading. */
export function navigate(path: string, { replace = false } = {}): void {
  if (replace) history.replaceState(null, '', path);
  else history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo(0, 0);
}

/** The current route, updated on navigation. */
export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.pathname));
  useEffect(() => {
    const update = () => setRoute(parseRoute(location.pathname));
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  return route;
}

/** The invitation fields of a personal link (?i=…&u=…). */
export function inviteFromUrl(): { invite: string | null; handle: string | null } {
  const params = new URLSearchParams(location.search);
  return { invite: params.get('i'), handle: params.get('u') };
}
