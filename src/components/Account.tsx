import { useState, type FormEvent } from 'react';
import { PRONOUNS, type Pronoun } from '../../shared/themes';
import { CODE_LENGTH } from '../../shared/types';
import { api, errorMessage } from '../lib/api';
import { logout } from '../lib/logout';
import { useSession } from '../session';
import { PinField } from './Pin';
import { Block, Button, ErrorLine, Modal, Toast, useToast } from './ui';

/** "On parle de toi au… il / elle / iel", saved at once. */
export function PronounPicker() {
  const { session, reload } = useSession();
  const [error, setError] = useState<string | null>(null);
  const pronoun = session?.user?.pronoun ?? null;

  /** Saves the chosen pronoun. */
  async function choose(next: Pronoun): Promise<void> {
    try {
      await api('PATCH', '/me', { pronoun: next });
      await reload();
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

/** "Changer mon code" and "Me déconnecter", with the code dialog. */
export function AccountActions() {
  const { reload } = useSession();
  const [isChangingCode, setChangingCode] = useState(false);
  const [toast, showToast] = useToast();
  return (
    <>
      <div className="links">
        <button type="button" onClick={() => setChangingCode(true)}>🔑 Changer mon code</button>
        <button type="button" onClick={() => void logout(reload)}>🚪 Me déconnecter</button>
      </div>
      {isChangingCode && (
        <ChangeCode onClose={() => setChangingCode(false)} onDone={() => { setChangingCode(false); showToast('Code changé ✓'); }} />
      )}
      <Toast message={toast} />
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
