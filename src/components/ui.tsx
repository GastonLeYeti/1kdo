import { useEffect, useState, type ReactNode } from 'react';
import type { Theme } from '../../shared/themes';
import { eventDate, shortDate, timeLeft } from '../lib/format';
import { Identicon } from './Identicon';
import { eventPath, navigate, type EventTab } from '../lib/router';
import { mapsUrl } from '../lib/maps';

/** Coloured header band with the theme's glyphs and a light snowfall. */
export function Header({ title, sub, theme, big = false, strong = false, onSubClick }: {
  title: ReactNode;
  sub?: ReactNode;
  theme: Theme;
  big?: boolean;
  strong?: boolean;
  onSubClick?: () => void;
}) {
  const [first, second, third] = theme.glyphs;
  return (
    <header className={`hd${big ? ' big' : ''}${strong ? ' strong' : ''}`}>
      {theme.id === 'noel' && <div className="snow" aria-hidden="true" />}
      <span className="g g1" aria-hidden="true">{first}</span>
      <span className="g s g2" aria-hidden="true">{second}</span>
      <span className="g s g3" aria-hidden="true">{third}</span>
      <h1 className="ht">{title}</h1>
      {sub && (onSubClick ? <button type="button" className="hs back" onClick={onSubClick}>{sub}</button> : <div className="hs">{sub}</div>)}
    </header>
  );
}

type BlockColor = 'white' | 'b1' | 'b2' | 'b3' | 'cta' | 'bg';

/** A pastel outlined block; `offset` shifts it right for the asymmetric grid. */
export function Block({ children, color = 'white', offset = 0, narrow = false, className = '' }: {
  children: ReactNode;
  color?: BlockColor;
  offset?: 0 | 1 | 2;
  narrow?: boolean;
  className?: string;
}) {
  return <div className={`blk ${color} off${offset}${narrow ? ' narrow' : ''} ${className}`}>{children}</div>;
}

type ButtonKind = 'cta' | 'head' | 'strong' | 'white';

/** A chunky button with a hard offset shadow. */
export function Button({ children, kind = 'cta', small = false, onClick, disabled, type = 'button' }: {
  children: ReactNode;
  kind?: ButtonKind;
  small?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button type={type} className={`btn ${kind}${small ? ' sm' : ''}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

/** Red error line under a form. */
export function ErrorLine({ message }: { message: string | null }) {
  return message ? <p className="error" role="alert">{message}</p> : null;
}

/** Strip with the event's practical info. */
export function InfoStrip({ date, place, budget }: { date: string; place: string; budget: string }) {
  return (
    <div className="strip">
      <span>📅 {shortDate(date)}</span>
      {place && (
        <a className="strip-link" href={mapsUrl(place, navigator.userAgent)} target="_blank" rel="noopener noreferrer"
          aria-label={`Ouvrir ${place} dans une app de cartes`}>📍 {place}</a>
      )}
      {budget && <span>💰 {budget}</span>}
    </div>
  );
}

/** Ticks every second. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** "Échange des cadeaux dans" with days / hours / minutes / seconds. */
export function Countdown({ date, time }: { date: string; time: string | null }) {
  const left = timeLeft(eventDate(date, time), useNow());
  const boxes: Array<[number, string]> = [[left.days, 'jours'], [left.hours, 'heures'], [left.minutes, 'min'], [left.seconds, 's']];
  return (
    <section aria-label="Compte à rebours">
      <div className="lbl">⏰ Échange des cadeaux dans</div>
      <div className="count">
        {boxes.map(([value, unit], index) => (
          <div key={unit} className={`cbox${index === 0 ? ' head' : ''}`}>
            <b>{String(value).padStart(2, '0')}</b>
            <span>{unit}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

const TABS: Array<[EventTab, string, string]> = [
  ['tirage', '🎁', 'Mon tirage'],
  ['bande', '👯', 'La bande'],
  ['fiche', '📝', 'Ma fiche'],
  ['qg', '👑', 'QG'],
];

/** The tab a page belongs to: a person's sheet is in "La bande", a chat in "Mon tirage". */
function tabOf(active: EventTab): EventTab {
  if (active === 'person') return 'bande';
  if (active === 'chat') return 'tirage';
  return active;
}

/** Navigation of an event: a bottom tab bar on phones, a sidebar on large screens. QG is admin-only. */
export function TabBar({ eventId, active, isAdmin, title, emoji, me, badges = {} }: {
  eventId: string;
  active: EventTab;
  isAdmin: boolean;
  title: string;
  emoji: string;
  me: { handle: string; name: string };
  /** Unread counts shown on tabs. */
  badges?: Partial<Record<EventTab, number>>;
}) {
  const tabs = TABS.filter(([tab]) => tab !== 'qg' || isAdmin);
  const current = tabOf(active);
  return (
    <nav className="tabs" aria-label="Navigation">
      <button type="button" className="side-only brand" onClick={() => navigate('/')}>
        <span className="brand-mark" aria-hidden="true">🎁</span>
        <span>Un kdo pour qui ?</span>
      </button>
      <div className="side-only side-event"><span aria-hidden="true">{emoji}</span> {title}</div>
      {tabs.map(([tab, icon, label]) => (
        <button key={tab} type="button" className={`tab${tab === current ? ' on' : ''}`} aria-current={tab === current ? 'page' : undefined}
          onClick={() => navigate(eventPath(eventId, tab))}>
          <span className="ti" aria-hidden="true">{icon}</span>
          <span>{label}</span>
          <UnreadBadge count={badges[tab] ?? 0} className="tbadge" />
        </button>
      ))}
      <div className="side-only side-foot"><MeChip handle={me.handle} name={me.name} /></div>
    </nav>
  );
}

/** A small red pill with a number of new messages; nothing when there are none. */
export function UnreadBadge({ count, className = 'unread' }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return <span className={className} aria-label={`${count} nouveau${count > 1 ? 'x' : ''} message${count > 1 ? 's' : ''}`}>{count > 9 ? '9+' : count}</span>;
}

/** A dimmed overlay with a centred dialog block. */
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="dim" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <Block color="bg" className="shadow">
          <div className="bt left">{title}</div>
          {children}
        </Block>
      </div>
    </div>
  );
}

/** A short message at the bottom of the screen. */
export function Toast({ message }: { message: string | null }) {
  return message ? <div className="toast" role="status">{message}</div> : null;
}

/** Shows a toast for two seconds. */
export function useToast(): [string | null, (message: string) => void] {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 2200);
    return () => clearTimeout(timer);
  }, [message]);
  return [message, setMessage];
}

/** Full-page spinner text while data loads. */
export function Loading() {
  return <div className="loading" aria-busy="true">Chargement…</div>;
}

/** The signed-in person's avatar, name and @, opening their profile. */
export function MeChip({ handle, name, greeting, onClick }: { handle: string; name: string; greeting?: string; onClick?: () => void }) {
  return (
    <button type="button" className="hello mechip" onClick={onClick ?? (() => navigate('/moi'))} aria-label="Mon profil">
      <Identicon handle={handle} size={40} />
      <span className="mechip-text">
        <b>{greeting ? `${greeting} ${name}` : name === handle ? `@${handle}` : name}</b>
        <span>{name === handle ? 'Mon profil' : `@${handle}`}</span>
      </span>
      <span className="mechip-go" aria-hidden="true">›</span>
    </button>
  );
}
