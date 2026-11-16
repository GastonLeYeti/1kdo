import { useEffect, useState } from 'react';
import { bossTitle, capitalize, getTheme, giverTitle, type Theme } from '../../shared/themes';
import type { ChatSummary, EventInfo, MyDraw, Person } from '../../shared/types';
import { Confetti, Gift } from '../components/Gift';
import { Identicon } from '../components/Identicon';
import { Block, Button, Countdown, ErrorLine, Header, InfoStrip, Loading, MeChip, UnreadBadge } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { eventPath, navigate } from '../lib/router';
import { useSession } from '../session';
import type { EventContext } from './EventScreen';

const SHAKE_MS = 1100;

/** True when the user asked the system for less motion. */
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** "Mon tirage": waiting, to discover, or the revealed name(s). */
export function DrawTab({ event, chats, reloadChats }: EventContext) {
  const { session } = useSession();
  const theme = getTheme(event.theme);
  const [draw, setDraw] = useState<MyDraw | null>(null);
  const [phase, setPhase] = useState<'hidden' | 'shaking' | 'shown'>('hidden');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<MyDraw>('GET', `/events/${event.id}/draw`).then(setDraw).catch((caught) => setError(errorMessage(caught)));
  }, [event.id]);

  /** Asks the server for the names, then plays the discovery animation. */
  async function reveal(): Promise<void> {
    setError(null);
    try {
      const revealed = await api<MyDraw>('POST', `/events/${event.id}/reveal`);
      const show = () => {
        setDraw(revealed);
        setPhase('shown');
        void reloadChats();
      };
      if (draw?.isRevealed || prefersReducedMotion()) return show();
      setPhase('shaking');
      setTimeout(show, SHAKE_MS);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  const user = session?.user;
  if (!draw || !user) return error ? <ErrorLine message={error} /> : <Loading />;
  if (phase === 'shown' && draw.targets.length > 0) {
    return <Revealed event={event} theme={theme} targets={draw.targets} giver={giverTitle(theme, user.pronoun)} chats={chats} onHide={() => setPhase('hidden')} />;
  }
  const isParticipant = event.people.some((p) => p.handle === user.handle);
  const boss = bossTitle(theme, event.bossPronoun);
  return (
    <main className="screen with-tabs">
      <Header title="Mon tirage" theme={theme} />
      <InfoStrip date={event.date} place={event.place} budget={event.budget} />
      <div className="pad">
        <MeChip handle={user.handle} name={user.name} greeting="Salut" onClick={() => navigate(eventPath(event.id, 'fiche'))} />
        {!isParticipant ? (
          <Block color="b3"><p className="lead">Tu ne participes pas à cet événement : tu le gères depuis le QG 👑</p></Block>
        ) : !draw.isDrawn ? (
          <Waiting theme={theme} boss={boss} />
        ) : (
          <ToDiscover draw={draw} shaking={phase === 'shaking'} onReveal={() => void reveal()} />
        )}
        {isParticipant && event.drawVisibility === 'visible' && <p className="small c tight">👀 Tirage visible par {boss}</p>}
        <ErrorLine message={error} />
        <ChatList eventId={event.id} chats={chats} />
        <Countdown date={event.date} time={event.time} />
      </div>
    </main>
  );
}

/** Screen 05: the draw has not been made yet. */
function Waiting({ theme, boss }: { theme: Theme; boss: string }) {
  return (
    <Block className="center">
      <Gift grey />
      <div className="bt">⏳ Patience…</div>
      <p className="small c">{capitalize(boss)} n'a pas encore fait le tirage {theme.glyphs[0]}</p>
    </Block>
  );
}

/** Screen 06: the draw is made, the name hides behind the tag. */
function ToDiscover({ draw, shaking, onReveal }: { draw: MyDraw; shaking: boolean; onReveal: () => void }) {
  const many = draw.targetCount > 1;
  return (
    <>
      <Block color="b3" className="center">
        {!draw.isRevealed && <div className="new">NOUVEAU</div>}
        <Gift tag="*******" hidden shaking={shaking} />
        <div className="bt">{draw.isRevealed ? 'Ton secret est bien gardé' : 'Le tirage est fait !'}</div>
        <p className="small c">
          {draw.isRevealed
            ? 'Le nom est masqué. Tu peux le revoir quand tu veux.'
            : `Découvre à qui tu vas offrir ${many ? `tes ${draw.targetCount} cadeaux` : 'un cadeau'}.`}
          <br />Personne d'autre ne le saura 🤫
        </p>
      </Block>
      <Button kind="head" onClick={onReveal} disabled={shaking}>
        {draw.isRevealed ? 'Revoir le nom 👀' : `Découvrir ${many ? 'les noms' : 'le nom'} 🎁`}
      </Button>
    </>
  );
}

/** "💬 Messages": the threads with one's receivers, then the anonymous ones of one's givers. */
function ChatList({ eventId, chats }: { eventId: string; chats: ChatSummary[] }) {
  if (chats.length === 0) return null;
  return (
    <section className="list" aria-label="Messages">
      <div className="lh">💬 Messages secrets</div>
      {chats.map((chat, index) => (
        <button key={chat.id} type="button" className={`evcard b${(index % 3) + 1}`} onClick={() => navigate(eventPath(eventId, 'chat', chat.id))}>
          <span className="evemoji" aria-hidden="true">{chat.role === 'giver' ? '🎁' : '🤫'}</span>
          <span className="evtext">
            <b>{chat.role === 'giver' ? `Discuter avec ${chat.title}` : chat.title}</b>
            <span className="small">{chat.role === 'giver' ? 'Ton nom reste secret' : 'Une personne qui t’offre un cadeau'}{chat.isMuted ? ' · ⏸️ en pause' : ''}</span>
          </span>
          <UnreadBadge count={chat.unread} />
        </button>
      ))}
    </section>
  );
}

/** Screen 07: "Tu es la Mère Noël de… Sam". */
function Revealed({ event, theme, targets, giver, chats, onHide }: {
  event: EventInfo;
  theme: Theme;
  targets: Person[];
  giver: string;
  chats: ChatSummary[];
  onHide: () => void;
}) {
  const first = targets[0] as Person;
  return (
    <main className="screen with-tabs">
      <Header title={<>Tu es {giver}<br />de…</>} theme={theme} big strong />
      <div className="pad">
        <Confetti />
        <div className="pop-in"><Gift tag={targets.length === 1 ? first.name : `${targets.length} noms`} /></div>
        <div className="names">
          {targets.map((target) => (
            <Block key={target.handle} color="cta" className="row shadow pop-in">
              <Identicon handle={target.handle} size={64} />
              <div>
                <div className="bigname">{target.name}</div>
                <div className="small">@{target.handle}</div>
              </div>
            </Block>
          ))}
        </div>
        <div className="row">
          <Button kind="head" onClick={() => navigate(eventPath(event.id, targets.length === 1 ? 'person' : 'bande', first.handle))}>
            💡 {targets.length === 1 ? 'Ses idées' : 'Leurs idées'}
          </Button>
          <Button kind="white" onClick={onHide}>🙈 Masquer</Button>
        </div>
        {targets.map((target) => {
          const chat = chats.find((c) => c.role === 'giver' && c.with?.handle === target.handle);
          return chat && (
            <Button key={target.handle} kind="strong" small onClick={() => navigate(eventPath(event.id, 'chat', chat.id))}>
              💬 Discuter avec {target.name} en secret
            </Button>
          );
        })}
        <p className="small c">Chut, c'est un secret 🤐</p>
      </div>
    </main>
  );
}
