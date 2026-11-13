import { useEffect, useState } from 'react';
import { DEFAULT_THEME_ID, getTheme } from '../shared/themes';
import type { EventStatus } from '../shared/types';
import { Loading } from './components/ui';
import { api } from './lib/api';
import { eventPath, inviteFromUrl, navigate, useRoute } from './lib/router';
import { Closed } from './screens/Closed';
import { EventScreen } from './screens/EventScreen';
import { Home } from './screens/Home';
import { Login } from './screens/Login';
import { Profile } from './screens/Profile';
import { QgHome } from './screens/QgHome';
import { useSession } from './session';

const APP_TITLE = 'Un kdo pour qui ?';

/** Picks the screen for the URL and the session. */
export function App() {
  const route = useRoute();
  const { session, reload } = useSession();
  if (!session) return <Loading />;
  if (route.page === 'event') return <EventGate key={route.eventId} eventId={route.eventId} />;
  if (!session.user) {
    const { invite, handle } = inviteFromUrl();
    return <Login title={APP_TITLE} themeId={DEFAULT_THEME_ID} invite={invite} prefillHandle={handle}
      bossPronoun={session.bossPronoun} onSignedIn={() => void reload()} />;
  }
  if (route.page === 'qg' && session.user.isAdmin) return <QgHome />;
  if (route.page === 'moi') return <Profile />;
  return <Home />;
}

/** An event link: "C'est fini" when closed, the sign-in when signed out, the event otherwise. */
function EventGate({ eventId }: { eventId: string }) {
  const { session, reload } = useSession();
  const [status, setStatus] = useState<EventStatus | null>(null);
  useEffect(() => {
    api<EventStatus>('GET', `/events/${encodeURIComponent(eventId)}/status`)
      .then(setStatus)
      .catch(() => setStatus({ isOpen: false }));
  }, [eventId]);
  if (!session || !status) return <Loading />;
  if (!status.isOpen) return <Closed theme={getTheme(DEFAULT_THEME_ID)} />;
  if (!session.user) {
    const { invite, handle } = inviteFromUrl();
    const signedIn = async () => {
      await reload();
      navigate(eventPath(eventId), { replace: true });
    };
    return <Login title={status.title} themeId={status.theme} invite={invite} prefillHandle={handle}
      bossPronoun={session.bossPronoun} onSignedIn={() => void signedIn()} />;
  }
  return <EventScreen eventId={eventId} />;
}
