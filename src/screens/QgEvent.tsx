import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { bossTitle, getTheme } from '../../shared/themes';
import type { AdminEvent, AdminParticipant, EventInput } from '../../shared/types';
import { DrawBoardPanel } from '../components/DrawBoard';
import { EventForm } from '../components/EventForm';
import { Identicon } from '../components/Identicon';
import { Block, Button, ErrorLine, Header, Loading, Modal, Toast, useToast } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { dayMonth, numericDate, plural } from '../lib/format';
import { navigate } from '../lib/router';
import { useSession } from '../session';
import type { EventContext } from './EventScreen';

const VISIBLE_ROWS = 6;

/** The invitation link of an event; with a handle, the personal link that pre-fills the @. */
function inviteLink(event: AdminEvent, handle?: string): string {
  const params = new URLSearchParams({ i: event.inviteCode });
  if (handle) params.set('u', handle);
  return `${location.origin}/e/${event.id}?${params.toString()}`;
}

/** Screens 11–13: participants, personal links, draw, settings and deletion. */
export function QgEvent({ event: info, reloadEvent }: EventContext) {
  const { session, reload } = useSession();
  const theme = getTheme(info.theme);
  const [event, setEvent] = useState<AdminEvent | null>(null);
  const [dialog, setDialog] = useState<'draw' | 'delete' | { link: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, showToast] = useToast();

  useEffect(() => {
    api<AdminEvent>('GET', `/admin/events/${info.id}`).then(setEvent).catch((caught) => setError(errorMessage(caught)));
  }, [info.id]);

  /** Runs an admin action that answers the updated event; false when it failed (the error is shown). */
  const act = useCallback(async (method: string, path: string, body?: unknown, done?: string): Promise<boolean> => {
    setError(null);
    try {
      setEvent(await api<AdminEvent>(method, `/admin/events/${info.id}${path}`, body));
      void reloadEvent();
      if (done) showToast(done);
      return true;
    } catch (caught) {
      setError(errorMessage(caught));
      return false;
    }
  }, [info.id, reloadEvent, showToast]);

  /** Copies an invitation link (the group one without a handle), or shows it when the clipboard is unavailable. */
  async function copyLink(handle?: string): Promise<void> {
    if (!event) return;
    const link = inviteLink(event, handle);
    try {
      await navigator.clipboard.writeText(link);
      showToast(handle ? 'Lien perso copié 🔗' : 'Lien de groupe copié 🔗');
    } catch {
      setDialog({ link });
    }
  }

  /** Deletes the event and its data, then goes back to the QG. */
  async function deleteAll(): Promise<void> {
    await api('DELETE', `/admin/events/${info.id}`);
    await reload();
    navigate('/qg', { replace: true });
  }

  if (!event) return error ? <ErrorLine message={error} /> : <Loading />;
  const boss = bossTitle(theme, session?.user?.pronoun);
  const isDrawn = event.drawnAt !== null;
  const isVisible = event.drawVisibility === 'visible';
  return (
    <main className="screen with-tabs">
      <Header title="Le QG 👑" sub={`Réservé à ${boss}`} theme={theme} />
      <div className="pad">
        <div className="qg-title"><b>{theme.emoji} {event.title}</b></div>
        {isDrawn ? (
          <div className="locked">🔒 Tirage fait le {dayMonth(event.drawnAt as string)} · liste figée{event.envelopesOpen ? '' : ' · enveloppes fermées'}</div>
        ) : (
          <AddParticipant onAdd={(name, handle) => act('POST', '/participants', { name, handle }, `${name} est dans la liste ✓`)} />
        )}
        <GroupLink onCopy={() => void copyLink()} />
        <ParticipantList event={event} onCopy={(handle) => void copyLink(handle)}
          onRemove={(handle) => void act('DELETE', `/participants/${encodeURIComponent(handle)}`)}
          onReset={(handle) => void act('POST', `/participants/${encodeURIComponent(handle)}/reset-code`, {}, 'Code réinitialisé : envoie-lui son lien perso 🔗')} />
        <ErrorLine message={error} />
        {!isDrawn && <Button kind="head" onClick={() => setDialog('draw')}>🎲 Lancer le tirage</Button>}
        {isDrawn && isVisible && (
          <DrawBoardPanel eventId={event.id} envelopesOpen={event.envelopesOpen} onToast={showToast}
            onOpen={() => act('POST', '/envelopes', {}, 'Enveloppes ouvertes 🎁')} />
        )}
        <Block color="b3" offset={1}>
          <span className="label">L'événement</span>
          <EventForm initial={toInput(event)} isDrawn={isDrawn} submitLabel="Enregistrer"
            onSubmit={async (input) => { await act('PATCH', '', input, 'Enregistré ✓'); void reload(); }} />
        </Block>
        <p className="small c">Le site ferme et les données sont supprimées le {numericDate(event.closesOn)}.</p>
        <button type="button" className="danger" onClick={() => setDialog('delete')}>Tout supprimer maintenant</button>
      </div>
      {dialog === 'draw' && (
        <DrawDialog event={event} onClose={() => setDialog(null)}
          onConfirm={async () => { setDialog(null); await act('POST', '/draw', {}, 'Tirage fait 🎲'); }} />
      )}
      {dialog === 'delete' && <DeleteDialog title={event.title} onClose={() => setDialog(null)} onConfirm={deleteAll} />}
      {dialog && typeof dialog === 'object' && (
        <Modal title="🔗 Lien d'invitation" onClose={() => setDialog(null)}>
          <p className="small">Copie ce lien et envoie-le en message :</p>
          <input className="input sm" readOnly value={dialog.link} onFocus={(e) => e.target.select()} aria-label="Lien d'invitation" />
          <Button kind="white" small onClick={() => setDialog(null)}>Fermer</Button>
        </Modal>
      )}
      <Toast message={toast} />
    </main>
  );
}

/** The editable fields of an event. */
function toInput(event: AdminEvent): EventInput {
  const { title, theme, date, time, place, budget, giftsPerPerson, drawVisibility } = event;
  return { title, theme, date, time, place, budget, giftsPerPerson, drawVisibility };
}

/** "Ajouter un·e participant·e": first name + @. */
function AddParticipant({ onAdd }: { onAdd: (name: string, handle: string) => Promise<boolean> }) {
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');

  /** Adds the person, then clears the fields. */
  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!(await onAdd(name.trim(), handle.trim()))) return;
    setName('');
    setHandle('');
  }

  return (
    <Block color="b1">
      <form onSubmit={submit}>
        <span className="label">Ajouter un·e participant·e</span>
        <div className="row2">
          <input className="input sm" placeholder="Prénom" value={name} maxLength={30} required aria-label="Prénom"
            onChange={(e) => setName(e.target.value)} />
          <div className="input sm">
            <span className="at">@</span>
            <input placeholder="instagram" value={handle} required autoCapitalize="none" spellCheck={false} aria-label="@ Instagram"
              onChange={(e) => setHandle(e.target.value)} />
          </div>
        </div>
        <Button kind="strong" small type="submit">Ajouter</Button>
      </form>
    </Block>
  );
}

/** One link for the whole group chat: everyone types their own @. */
function GroupLink({ onCopy }: { onCopy: () => void }) {
  return (
    <Block color="b2">
      <span className="label">Lien de groupe</span>
      <p className="small">Un seul lien pour tout le monde, à coller dans le groupe : chacun·e tape son @ et choisit son code.</p>
      <Button kind="strong" small onClick={onCopy}>🔗 Copier le lien de groupe</Button>
    </Block>
  );
}

/** Status pill of a participant. */
function statusOf(person: AdminParticipant, isDrawn: boolean): [string, string] {
  if (!person.isRegistered) return ['no', 'Pas inscrit·e'];
  if (!isDrawn) return ['ok', 'Inscrit·e'];
  return person.hasRevealed ? ['ok', 'Nom découvert'] : ['wait', 'Pas encore vu'];
}

/** The list of participants with their status and actions (🔗 link, ✕ remove, 🔑 reset). */
function ParticipantList({ event, onCopy, onRemove, onReset }: {
  event: AdminEvent;
  onCopy: (handle: string) => void;
  onRemove: (handle: string) => void;
  onReset: (handle: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const isDrawn = event.drawnAt !== null;
  const people = event.participants;
  const registered = people.filter((p) => p.isRegistered).length;
  const revealed = people.filter((p) => p.hasRevealed).length;
  const visible = showAll ? people : people.slice(0, VISIBLE_ROWS);
  return (
    <Block offset={1}>
      <div className="lh">{isDrawn ? `${plural(revealed, 'nom découvert', 'noms découverts')} sur ${people.length}` : `${plural(people.length, 'participant')} · ${plural(registered, 'inscrit')}`}</div>
      <div className="legend">{isDrawn ? '🔑 réinitialiser son code (en cas d’oubli) · 🔗 son lien perso' : '🔗 copier son lien perso · ✕ retirer'}</div>
      {visible.map((person) => {
        const [statusClass, label] = statusOf(person, isDrawn);
        return (
          <div key={person.handle} className="arow">
            <Identicon handle={person.handle} size={32} />
            <div className="an"><b>{person.name}</b><span>@{person.handle}</span></div>
            <div className={`st ${statusClass}`}>{label}</div>
            {(!isDrawn || !person.isRegistered) && (
              <button type="button" className="ax" aria-label={`Copier le lien perso de ${person.name}`} onClick={() => onCopy(person.handle)}>🔗</button>
            )}
            {isDrawn
              ? person.isRegistered && <ConfirmAction icon="🔑" label={`Réinitialiser le code de ${person.name}`} onConfirm={() => onReset(person.handle)} />
              : <ConfirmAction icon="✕" label={`Retirer ${person.name}`} onConfirm={() => onRemove(person.handle)} />}
          </div>
        );
      })}
      {people.length > VISIBLE_ROWS && (
        <button type="button" className="more" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Réduire' : `+ ${people.length - VISIBLE_ROWS} autres`}
        </button>
      )}
    </Block>
  );
}

/** A small icon button that asks "Sûr ?" before acting. */
function ConfirmAction({ icon, label, onConfirm }: { icon: string; label: string; onConfirm: () => void }) {
  const [isArmed, setArmed] = useState(false);
  useEffect(() => {
    if (!isArmed) return;
    const timer = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(timer);
  }, [isArmed]);
  return (
    <button type="button" className={`ax${isArmed ? ' armed' : ''}`} aria-label={isArmed ? `Confirmer : ${label}` : label}
      onClick={() => (isArmed ? (setArmed(false), onConfirm()) : setArmed(true))}>
      {isArmed ? 'Sûr ?' : icon}
    </button>
  );
}

/** Screen 12: confirm the draw. */
function DrawDialog({ event, onClose, onConfirm }: { event: AdminEvent; onClose: () => void; onConfirm: () => Promise<void> }) {
  const missing = event.participants.filter((p) => !p.isRegistered).map((p) => p.name);
  const needed = event.giftsPerPerson + 1;
  const isEnough = event.participants.length >= needed;
  return (
    <Modal title="🎲 Lancer le tirage ?" onClose={onClose}>
      <ul className="warn">
        {!isEnough && <li>Il faut au moins <b>{needed} participants</b> pour {event.giftsPerPerson} cadeau(x) chacun.</li>}
        {missing.length > 0 && (
          <li><b>{missing.join(', ')}</b> {missing.length > 1 ? 'ne sont pas encore inscrits. Ils découvriront leur nom' : "n'est pas encore inscrit·e. Son nom sera visible"} en s'inscrivant.</li>
        )}
        <li>La liste sera <b>figée</b> : plus d'ajout ni de retrait.</li>
        {event.drawVisibility === 'visible' ? (
          <li>Les enveloppes restent <b>fermées</b> : tu vois qui offre à qui, tu peux échanger des personnes, puis tu ouvres les enveloppes 🎁</li>
        ) : (
          <li>Toi non plus, tu ne sauras pas qui a tiré qui 🙈</li>
        )}
      </ul>
      <div className="row">
        <Button kind="white" small onClick={onClose}>Annuler</Button>
        <Button kind="head" small onClick={() => void onConfirm()} disabled={!isEnough}>Lancer</Button>
      </div>
    </Modal>
  );
}

/** Confirms "Tout supprimer maintenant". */
function DeleteDialog({ title, onClose, onConfirm }: { title: string; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal title="Tout supprimer ?" onClose={onClose}>
      <p className="small">« {title} », ses participants, le tirage et toutes les idées seront supprimés <b>définitivement</b>.</p>
      <ErrorLine message={error} />
      <div className="row">
        <Button kind="white" small onClick={onClose}>Annuler</Button>
        <Button kind="head" small onClick={() => void onConfirm().catch((caught) => setError(errorMessage(caught)))}>Supprimer</Button>
      </div>
    </Modal>
  );
}
