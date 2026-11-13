import { getTheme } from '../../shared/themes';
import { Identicon } from '../components/Identicon';
import { Header } from '../components/ui';
import { plural } from '../lib/format';
import { eventPath, navigate } from '../lib/router';
import { useSession } from '../session';
import type { EventContext } from './EventScreen';

const CARD_COLORS = ['b3', 'b1', 'b2', 'white'];

/** Screen 08: everybody of the event, with how many ideas their sheet holds. */
export function BandTab({ event }: EventContext) {
  const { session } = useSession();
  const me = session?.user?.handle;
  const theme = getTheme(event.theme);
  return (
    <main className="screen with-tabs">
      <Header title={<>La bande <span className="count-pill">{event.people.length}</span></>} theme={theme} />
      <div className="pad">
        <p className="small">Ajoute des idées sur la fiche de chacun : ça aidera la personne qui lui offre un cadeau, en secret.</p>
        {event.people.length === 0 && <p className="small">Personne dans la liste pour l'instant.</p>}
        <div className="grid">
          {event.people.map((person, index) => {
            const isMe = person.handle === me;
            return (
              <button key={person.handle} type="button" className={`pcard ${CARD_COLORS[index % CARD_COLORS.length]}${index % 2 ? ' low' : ''}`}
                onClick={() => navigate(eventPath(event.id, isMe ? 'fiche' : 'person', person.handle))}>
                {isMe && <span className="me">C'est toi</span>}
                <Identicon handle={person.handle} size={44} />
                <span className="cn">{person.name}</span>
                <span className="ch">@{person.handle}</span>
                <span className="cp">💡 {plural(person.ideaCount, 'idée')}</span>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
