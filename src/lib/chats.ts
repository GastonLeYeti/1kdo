import { useCallback, useEffect, useState } from 'react';
import type { ChatSummary } from '../../shared/types';
import { api } from './api';

/** How often the list of threads is refreshed, for the "new message" badges. */
const LIST_REFRESH_MS = 60_000;

/** Runs `task` now and every `intervalMs` while the page is visible; stops with the component. */
export function useRefresh(task: () => void, intervalMs: number, isEnabled = true): void {
  useEffect(() => {
    if (!isEnabled) return;
    task();
    const timer = setInterval(() => document.visibilityState === 'visible' && task(), intervalMs);
    const onVisible = () => document.visibilityState === 'visible' && task();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [task, intervalMs, isEnabled]);
}

/** The signed-in person's chat threads in an event, refreshed while names can be discovered. */
export function useChats(eventId: string, isEnabled: boolean): { chats: ChatSummary[]; reloadChats: () => Promise<void> } {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const reloadChats = useCallback(async () => {
    try {
      setChats(await api<ChatSummary[]>('GET', `/events/${encodeURIComponent(eventId)}/chats`));
    } catch {
      // A failed refresh keeps the last list; the next one will retry.
    }
  }, [eventId]);
  const refresh = useCallback(() => void reloadChats(), [reloadChats]);
  useRefresh(refresh, LIST_REFRESH_MS, isEnabled);
  return { chats, reloadChats };
}

/** Unread messages over all threads. */
export function unreadTotal(chats: readonly ChatSummary[]): number {
  return chats.reduce((total, chat) => total + chat.unread, 0);
}
