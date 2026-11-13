import { useEffect, useState } from 'react';
import { getTheme } from '../../shared/themes';
import type { PersonSheet } from '../../shared/types';
import { IdeaEditor } from '../components/IdeaEditor';
import { Identicon } from '../components/Identicon';
import { ErrorLine, Header, Loading } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { eventPath, navigate } from '../lib/router';
import { useSession } from '../session';
import type { EventContext } from './EventScreen';

const POSTIT_STYLES = [['b3', 'tilt-l', 'off0'], ['b2', 'tilt-r', 'off2'], ['b1', 'tilt-s', 'off1']] as const;

/** Screen 09: someone's sheet, a wall of anonymous post-its plus the viewer's own. */
export function PersonSheetScreen({ event, reloadEvent, handle }: EventContext & { handle: string }) {
  const { session } = useSession();
  const theme = getTheme(event.theme);
  const [sheet, setSheet] = useState<PersonSheet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isParticipant = event.people.some((p) => p.handle === session?.user?.handle);

  useEffect(() => {
    if (handle === session?.user?.handle) return navigate(eventPath(event.id, 'fiche'), { replace: true });
    api<PersonSheet>('GET', `/events/${event.id}/people/${encodeURIComponent(handle)}`).then(setSheet).catch((c) => setError(errorMessage(c)));
  }, [event.id, handle, session?.user?.handle]);

  if (!sheet) return error ? <main className="screen"><div className="pad"><ErrorLine message={error} /></div></main> : <Loading />;
  return (
    <main className="screen with-tabs">
      <Header title={sheet.name} sub="‹ La bande" onSubClick={() => navigate(eventPath(event.id, 'bande'))} theme={theme} />
      <div className="pad">
        <div className="prof">
          <Identicon handle={sheet.handle} size={64} />
          <a className="btn white sm" href={`https://www.instagram.com/${encodeURIComponent(sheet.handle)}/`} target="_blank" rel="noopener noreferrer">
            📸 Voir son Insta
          </a>
        </div>
        <div className="lbl">💡 Idées pour {sheet.name}</div>
        <p className="small tight">{sheet.name} ne voit pas ce qui est écrit ici.</p>
        {sheet.selfNote && (
          <div className="postit bg tilt-s off0"><span className="self">❤️ {sheet.name} aime :</span> {sheet.selfNote}</div>
        )}
        {sheet.ideas.map((idea, index) => {
          const [color, tilt, offset] = POSTIT_STYLES[index % POSTIT_STYLES.length]!;
          return <div key={index} className={`postit ${color} ${tilt} ${offset}`}>{idea}</div>;
        })}
        {!sheet.selfNote && sheet.ideas.length === 0 && <p className="small">Pas encore d'idée. Lance-toi !</p>}
        {isParticipant && (
          <IdeaEditor eventId={event.id} handle={sheet.handle} initial={sheet.myIdea} label="Ton idée"
            placeholder={`Ce que ${sheet.name} aime, ce qui lui ferait plaisir…`}
            onSaved={(saved) => { setSheet(saved); void reloadEvent(); }} />
        )}
      </div>
    </main>
  );
}
