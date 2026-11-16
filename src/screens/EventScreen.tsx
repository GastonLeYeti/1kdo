import { useCallback, useEffect, useState } from 'react';
import { getTheme } from '../../shared/themes';
import type { ChatSummary, EventInfo } from '../../shared/types';
import { Loading, TabBar } from '../components/ui';
import { api, ApiError, errorMessage } from '../lib/api';
import { unreadTotal, useChats } from '../lib/chats';
import { useRoute } from '../lib/router';
import { useTheme } from '../lib/theme';
import { useSession } from '../session';
import { BandTab } from './BandTab';
import { ChatScreen } from './ChatScreen';
import { Closed } from './Closed';
import { DrawTab } from './DrawTab';
import { MySheet } from './MySheet';
import { PersonSheetScreen } from './PersonSheet';
import { QgEvent } from './QgEvent';

/** Everything the tabs of an event need. */
export interface EventContext {
  event: EventInfo;
  reloadEvent: () => Promise<void>;
  /** The signed-in person's anonymous chat threads (empty until they can discover names). */
  chats: ChatSummary[];
  reloadChats: () => Promise<void>;
}

/** An event with its four tabs. */
export function EventScreen({ eventId }: { eventId: string }) {
  const route = useRoute();
  const { session } = useSession();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [failure, setFailure] = useState<ApiError | Error | null>(null);
  const reloadEvent = useCallback(async () => {
    try {
      setEvent(await api<EventInfo>('GET', `/events/${encodeURIComponent(eventId)}`));
    } catch (caught) {
      setFailure(caught instanceof Error ? caught : new Error(errorMessage(caught)));
    }
  }, [eventId]);
  useEffect(() => void reloadEvent(), [reloadEvent]);
  const { chats, reloadChats } = useChats(eventId, Boolean(event?.isDrawn));
  useTheme(getTheme(event?.theme));

  const user = session?.user;
  if (failure instanceof ApiError && (failure.status === 404 || failure.status === 410)) return <Closed theme={getTheme(event?.theme)} />;
  if (failure) return <main className="screen"><div className="pad"><p className="error">{failure.message}</p></div></main>;
  if (!event || !user || route.page !== 'event') return <Loading />;
  const context: EventContext = { event, reloadEvent, chats, reloadChats };
  const tab = route.tab === 'qg' && !user.isAdmin ? 'tirage' : route.tab;
  const theme = getTheme(event.theme);
  return (
    <div className="shell">
      {tab === 'tirage' && <DrawTab {...context} />}
      {tab === 'bande' && <BandTab {...context} />}
      {tab === 'person' && <PersonSheetScreen {...context} handle={route.handle ?? ''} />}
      {tab === 'fiche' && <MySheet {...context} />}
      {tab === 'qg' && <QgEvent {...context} />}
      {tab === 'chat' && <ChatScreen {...context} threadId={route.thread ?? ''} />}
      <TabBar eventId={event.id} active={tab} isAdmin={user.isAdmin} title={event.title} emoji={theme.emoji} me={user}
        badges={{ tirage: unreadTotal(chats) }} />
    </div>
  );
}
