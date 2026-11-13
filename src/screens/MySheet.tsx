import { useEffect, useState, type FormEvent } from 'react';
import { getTheme, PRONOUNS, type Pronoun } from '../../shared/themes';
import { CODE_LENGTH, type PersonSheet } from '../../shared/types';
import { IdeaEditor } from '../components/IdeaEditor';
import { PinField } from '../components/Pin';
import { Block, Button, ErrorLine, Header, Modal, Toast, useToast } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { plural } from '../lib/format';
import { logout } from '../lib/logout';
import { useSession } from '../session';
import type { EventContext } from './EventScreen';

/** Screen 10: pronoun, "Ce que tu aimes", the hidden count of ideas, code and sign-out. */
export function MySheet({ event, reloadEvent }: EventContext) {
  const { session, reload } = useSession();
  const theme = getTheme(event.theme);
  const user = session?.user;
  const [sheet, setSheet] = useState<PersonSheet | null>(null);
  const [isChangingCode, setChangingCode] = useState(false);
  const [toast, showToast] = useToast();
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
        <PronounPicker pronoun={user.pronoun} onSaved={() => void reload()} />
        {isParticipant && sheet && (
          <>
            <IdeaEditor eventId={event.id} handle={user.handle} initial={sheet.myIdea} label="Ce que tu aimes" offset={1}
              placeholder="Tes passions, tes couleurs, ce que tu collectionnes…"
              onSaved={(saved) => { setSheet(saved); void reloadEvent(); }} />
            <HiddenIdeas count={sheet.hiddenIdeaCount} />
          </>
        )}
        <div className="links">
          <button type="button" onClick={() => setChangingCode(true)}>🔑 Changer mon code</button>
          <button type="button" onClick={() => void logout(reload)}>🚪 Me déconnecter</button>
        </div>
      </div>
      {isChangingCode && (
        <ChangeCode onClose={() => setChangingCode(false)} onDone={() => { setChangingCode(false); showToast('Code changé ✓'); }} />
      )}
      <Toast message={toast} />
    </main>
  );
}

/** "On parle de toi au… il / elle / iel". */
function PronounPicker({ pronoun, onSaved }: { pronoun: Pronoun | null; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null);

  /** Saves the chosen pronoun. */
  async function choose(next: Pronoun): Promise<void> {
    try {
      await api('PATCH', '/me', { pronoun: next });
      onSaved();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <Block color="b1" narrow>
      <span className="label" id="pronoun-label">On parle de toi au…</span>
      <div className="seg" role="radiogroup" aria-labelledby="pronoun-label">
        {PRONOUNS.map((option) => (
          <button key={option} type="button" role="radio" aria-checked={pronoun === option}
            className={pronoun === option ? 'on' : ''} onClick={() => void choose(option)}>{option}</button>
        ))}
      </div>
      <ErrorLine message={error} />
    </Block>
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

/** Dialog to replace one's own code. */
function ChangeCode({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<string | null>(null);

  /** Sends the current and the new code. */
  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    try {
      await api('POST', '/me/code', { current, next });
      onDone();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <Modal title="🔑 Changer mon code" onClose={onClose}>
      <form onSubmit={submit}>
        <PinField label="Ton code actuel" value={current} onChange={setCurrent} autoFocus />
        <PinField label="Ton nouveau code" value={next} onChange={setNext} focusNow={current.length === CODE_LENGTH} />
        <ErrorLine message={error} />
        <div className="row">
          <Button kind="white" small onClick={onClose}>Annuler</Button>
          <Button kind="strong" small type="submit" disabled={current.length !== CODE_LENGTH || next.length !== CODE_LENGTH}>Valider</Button>
        </div>
      </form>
    </Modal>
  );
}
