import { useEffect } from 'react';
import { getTheme, DEFAULT_THEME_ID } from '../../shared/themes';
import { Identicon } from '../components/Identicon';
import { Block, Button, Header } from '../components/ui';
import { shortDate } from '../lib/format';
import { eventPath, navigate } from '../lib/router';
import { useTheme } from '../lib/theme';
import { useSession } from '../session';
import { logout } from '../lib/logout';

/** "Mes événements": the signed-in person's events (one event opens directly). */
export function Home() {
  const { session, reload } = useSession();
  const theme = getTheme(DEFAULT_THEME_ID);
  useTheme(theme);
  const user = session?.user;
  const events = session?.events ?? [];
  const onlyEvent = events.length === 1 && !user?.isAdmin ? events[0] : undefined;
  useEffect(() => {
    if (onlyEvent) navigate(eventPath(onlyEvent.id), { replace: true });
  }, [onlyEvent]);
  if (!user || onlyEvent) return null;
  return (
    <main className="screen">
      <Header title="Mes événements" sub={user.name === user.handle ? `@${user.handle}` : `${user.name} · @${user.handle}`} theme={theme} />
      <div className="pad">
        {events.length === 0 && (
          <Block color="b3"><p className="lead">Aucun événement pour l'instant {theme.glyphs[0]}</p></Block>
        )}
        <div className="list">
          {events.map((event, index) => {
            const eventTheme = getTheme(event.theme);
            return (
              <button key={event.id} type="button" className={`evcard b${(index % 3) + 1}`} onClick={() => navigate(eventPath(event.id))}>
                <span className="evemoji" aria-hidden="true">{eventTheme.emoji}</span>
                <span><b>{event.title}</b><span className="small">📅 {shortDate(event.date)} · {eventTheme.name}</span></span>
              </button>
            );
          })}
        </div>
        {user.isAdmin && <Button kind="head" onClick={() => navigate('/qg')}>👑 Aller au QG</Button>}
        <div className="hello end"><Identicon handle={user.handle} size={32} />
          <button type="button" className="link" onClick={() => void logout(reload)}>🚪 Me déconnecter</button>
        </div>
      </div>
    </main>
  );
}
