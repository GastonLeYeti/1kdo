import { useEffect, useState } from 'react';
import { getTheme } from '../../shared/themes';
import type { PersonSheet } from '../../shared/types';
import { AccountActions, PronounPicker } from '../components/Account';
import { IdeaEditor } from '../components/IdeaEditor';
import { Header } from '../components/ui';
import { api } from '../lib/api';
import { plural } from '../lib/format';
import { useSession } from '../session';
import type { EventContext } from './EventScreen';

/** Screen 10: pronoun, "Ce que tu aimes", the hidden count of ideas, code and sign-out. */
export function MySheet({ event, reloadEvent }: EventContext) {
  const { session } = useSession();
  const theme = getTheme(event.theme);
  const user = session?.user;
  const [sheet, setSheet] = useState<PersonSheet | null>(null);
  const isParticipant = event.people.some((p) => p.handle === user?.handle);

  useEffect(() => {
    if (!user || !isParticipant) return;
    api<PersonSheet>('GET', `/events/${event.id}/people/${encodeURIComponent(user.handle)}`).then(setSheet).catch(() => undefined);
  }, [event.id, user, isParticipant]);

  if (!user) return null;
  return (
    <main className="screen with-tabs">
      <Header title="Ma fiche" sub={user.name === user.handle ? `@${user.handle}` : `${user.name} · @${user.handle}`} theme={theme} />
      <div className="pad">
        <PronounPicker />
        {isParticipant && sheet && (
          <>
            <IdeaEditor eventId={event.id} handle={user.handle} initial={sheet.myIdea} label="Ce que tu aimes" offset={1}
              placeholder="Tes passions, tes couleurs, ce que tu collectionnes…"
              onSaved={(saved) => { setSheet(saved); void reloadEvent(); }} />
            <HiddenIdeas count={sheet.hiddenIdeaCount} />
          </>
        )}
        <AccountActions />
      </div>
    </main>
  );
}

/** Ghost post-its: the ideas of the others stay a surprise. */
function HiddenIdeas({ count }: { count: number }) {
  return (
    <>
      <div className="secret" aria-hidden="true">
        {Array.from({ length: Math.min(count, 3) || 1 }, (_, index) => (
          <div key={index} className={`ghost g${index}`}>?</div>
        ))}
      </div>
      <p className="small c">
        {count > 0 ? <><b>Les autres ont écrit {plural(count, 'idée')} sur toi.</b><br />Surprise ! 🤫</> : 'Personne n’a encore écrit d’idée sur toi.'}
      </p>
    </>
  );
}
