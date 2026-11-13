import { useEffect, useState } from 'react';
import { bossTitle, capitalize, DEFAULT_THEME_ID, getTheme } from '../../shared/themes';
import type { AdminEvent, EventInput, EventSummary } from '../../shared/types';
import { blankEvent, EventForm } from '../components/EventForm';
import { Block, Button, ErrorLine, Header, Loading, MeChip } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { shortDate } from '../lib/format';
import { eventPath, navigate } from '../lib/router';
import { useTheme } from '../lib/theme';
import { useSession } from '../session';

/** The QG home: every event and the form to create one. */
export function QgHome() {
  const { session, reload } = useSession();
  const theme = getTheme(DEFAULT_THEME_ID);
  useTheme(theme);
  const [events, setEvents] = useState<EventSummary[] | null>(null);
  const [isCreating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<EventSummary[]>('GET', '/admin/events').then(setEvents).catch((caught) => setError(errorMessage(caught)));
  }, []);

  /** Creates the event and opens its QG page. */
  async function create(input: EventInput): Promise<void> {
    const created = await api<AdminEvent>('POST', '/admin/events', input);
    await reload();
    navigate(eventPath(created.id, 'qg'));
  }

  if (!events) return error ? <ErrorLine message={error} /> : <Loading />;
  return (
    <main className="screen">
      <Header title="Le QG 👑" sub={`Réservé à ${bossTitle(theme, session?.user?.pronoun)}`} theme={theme} />
      <div className="pad">
        {session?.user && <MeChip handle={session.user.handle} name={session.user.name} />}
        {events.length === 0 && <Block color="b3"><p className="lead">Aucun événement. Crée le premier !</p></Block>}
        <div className="list">
          {events.map((event, index) => {
            const eventTheme = getTheme(event.theme);
            return (
              <button key={event.id} type="button" className={`evcard b${(index % 3) + 1}`} onClick={() => navigate(eventPath(event.id, 'qg'))}>
                <span className="evemoji" aria-hidden="true">{eventTheme.emoji}</span>
                <span><b>{event.title}</b><span className="small">📅 {shortDate(event.date)} · {eventTheme.name}</span></span>
              </button>
            );
          })}
        </div>
        {isCreating ? (
          <Block color="b1">
            <div className="lh">Nouvel événement</div>
            <EventForm initial={blankEvent()} submitLabel="Créer l'événement" onSubmit={create} />
            <button type="button" className="link" onClick={() => setCreating(false)}>Annuler</button>
          </Block>
        ) : (
          <Button onClick={() => setCreating(true)}>＋ Créer un événement</Button>
        )}
        <button type="button" className="link" onClick={() => navigate('/')}>‹ Mes événements</button>
        <p className="small c">{capitalize(bossTitle(theme, session?.user?.pronoun))}, c'est toi 👑</p>
      </div>
    </main>
  );
}
