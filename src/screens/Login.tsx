import { useEffect, useState, type FormEvent } from 'react';
import { bossTitle, capitalize, getTheme, type Pronoun, type Theme, type ThemeId } from '../../shared/themes';
import { CODE_LENGTH, type AuthState } from '../../shared/types';
import { Identicon } from '../components/Identicon';
import { Keypad, PinDots, PinField } from '../components/Pin';
import { Block, Button, ErrorLine, Header } from '../components/ui';
import { api, ApiError, errorMessage } from '../lib/api';
import { useTheme } from '../lib/theme';

type Step = { kind: 'handle' } | ({ handle: string } & AuthState);

interface LoginProps {
  title: string;
  themeId: ThemeId;
  invite: string | null;
  prefillHandle: string | null;
  bossPronoun: Pronoun | null;
  onSignedIn: () => void;
}

/** Sign-in flow: @ → (first visit: choose a code) | (back: type the code) | not in the list. */
export function Login({ title, themeId, invite, prefillHandle, bossPronoun, onSignedIn }: LoginProps) {
  const theme = getTheme(themeId);
  const boss = bossTitle(theme, bossPronoun);
  useTheme(theme);
  const [step, setStep] = useState<Step>({ kind: 'handle' });
  if (!('state' in step)) {
    return <HandleStep title={title} theme={theme} prefill={prefillHandle} invite={invite} onChecked={setStep} />;
  }
  const back = () => setStep({ kind: 'handle' });
  if (step.state === 'not-listed') return <NotListedStep theme={theme} boss={boss} handle={step.handle} onRetry={back} />;
  if (step.state === 'needs-invite') return <NeedsInviteStep theme={theme} boss={boss} handle={step.handle} onRetry={back} />;
  if (step.state === 'register') {
    return <RegisterStep theme={theme} handle={step.handle} invite={invite} onDone={onSignedIn} />;
  }
  return <CodeStep theme={theme} boss={boss} handle={step.handle} name={step.name} onDone={onSignedIn} onChangeHandle={back} />;
}

/** Screen 01: the @ (pre-filled by the personal link). */
function HandleStep({ title, theme, prefill, invite, onChecked }: {
  title: string;
  theme: Theme;
  prefill: string | null;
  invite: string | null;
  onChecked: (step: Step) => void;
}) {
  const [handle, setHandle] = useState(prefill ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Asks the API where this @ stands. */
  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const state = await api<AuthState>('POST', '/auth/check', { handle, invite });
      onChecked({ ...state, handle: handle.trim().replace(/^@+/, '').toLowerCase() });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="screen">
      <Header title={title} sub={theme.example === title ? undefined : `${theme.emoji} ${theme.name}`} theme={theme} big />
      <form className="pad" onSubmit={submit}>
        <Block color="b1" narrow>
          <p className="lead">{theme.emoji} Coucou !<br />Connecte-toi pour découvrir à qui tu vas offrir un cadeau.</p>
        </Block>
        <Block offset={1}>
          <label className="label" htmlFor="handle">Ton @ Instagram</label>
          <div className="input">
            <span className="at">@</span>
            <input id="handle" autoComplete="username" autoCapitalize="none" spellCheck={false} value={handle}
              onChange={(e) => setHandle(e.target.value)} placeholder="ton.insta" required />
          </div>
          {prefill && handle === prefill && <div className="hint">✓ Rempli grâce à ton lien perso</div>}
        </Block>
        <ErrorLine message={error} />
        <Button type="submit" disabled={busy || handle.trim().length === 0}>Continuer →</Button>
      </form>
    </main>
  );
}

/** Screen 03: the @ is not in the list. */
function NotListedStep({ theme, boss, handle, onRetry }: { theme: Theme; boss: string; handle: string; onRetry: () => void }) {
  return (
    <main className="screen">
      <Header title="Oups !" theme={theme} />
      <div className="pad">
        <div className="bigemoji" aria-hidden="true">🧝</div>
        <Block color="b2"><p className="lead"><b>@{handle}</b> n'est pas dans la liste des participants.</p></Block>
        <Block offset={2}>
          <p className="small">Vérifie l'orthographe de ton @, ou demande à <b>{boss}</b> de t'ajouter.</p>
        </Block>
        <Button onClick={onRetry}>Réessayer</Button>
      </div>
    </main>
  );
}

/** The @ is listed but has no code yet and came without its personal link. */
function NeedsInviteStep({ theme, boss, handle, onRetry }: { theme: Theme; boss: string; handle: string; onRetry: () => void }) {
  return (
    <main className="screen">
      <Header title="Ton lien d'invitation" theme={theme} />
      <div className="pad">
        <div className="bigemoji" aria-hidden="true">🔗</div>
        <Block color="b3">
          <p className="lead">Pour ta première connexion, <b>@{handle}</b>, ouvre le lien d'invitation reçu en message.</p>
        </Block>
        <Block offset={2}>
          <p className="small">Tu ne le retrouves pas ? Demande-le à <b>{boss}</b>.</p>
        </Block>
        <Button onClick={onRetry}>Retour</Button>
      </div>
    </main>
  );
}

/** Screen 02: first visit, choose and confirm a 6-digit code. */
function RegisterStep({ theme, handle, invite, onDone }: { theme: Theme; handle: string; invite: string | null; onDone: () => void }) {
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isComplete = code.length === CODE_LENGTH && confirm.length === CODE_LENGTH;

  /** Creates the account once both codes match. */
  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (code !== confirm) {
      setError('Les deux codes ne sont pas pareils.');
      setConfirm('');
      return;
    }
    setBusy(true);
    try {
      await api('POST', '/auth/register', { handle, code, invite });
      onDone();
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }

  return (
    <main className="screen">
      <Header title="Bienvenue !" theme={theme} />
      <form className="pad" onSubmit={submit}>
        <Block color="b1" narrow>
          <p className="lead">Coucou <b>@{handle}</b> 👋<br />Choisis un code à {CODE_LENGTH} chiffres : il te servira à te reconnecter.</p>
        </Block>
        <Block className="w-inset"><PinField label="Ton code" value={code} onChange={setCode} autoFocus /></Block>
        <Block color="b2" offset={2} className="w-inset"><PinField label="Confirme ton code" value={confirm} onChange={setConfirm} focusNow={code.length === CODE_LENGTH} /></Block>
        <ErrorLine message={error} />
        <Button type="submit" disabled={!isComplete || busy}>Créer mon accès →</Button>
      </form>
    </main>
  );
}

/** Screen 04: back again, type the code on the pad. */
function CodeStep({ theme, boss, handle, name, onDone, onChangeHandle }: {
  theme: Theme;
  boss: string;
  handle: string;
  name: string;
  onDone: () => void;
  onChangeHandle: () => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setLocked] = useState(false);

  useEffect(() => {
    if (code.length !== CODE_LENGTH) return;
    api('POST', '/auth/login', { handle, code })
      .then(onDone)
      .catch((caught: unknown) => {
        const remaining = caught instanceof ApiError ? caught.body.remainingTries : undefined;
        setError(remaining ? `${errorMessage(caught)} Encore ${remaining} essai${remaining > 1 ? 's' : ''}.` : errorMessage(caught));
        setLocked(caught instanceof ApiError && caught.status === 429);
        setCode('');
      });
  }, [code, handle, onDone]);

  useKeyboardDigits(code, setCode);
  return (
    <main className="screen">
      <Header title={<>Re-bonjour<br />{name} !</>} theme={theme} big />
      <div className="pad">
        <div className="avfloat"><Identicon handle={handle} size={76} /></div>
        <Block>
          <span className="label">Ton code</span>
          <PinDots length={code.length} />
          {!isLocked && <Keypad value={code} onChange={setCode} />}
        </Block>
        <ErrorLine message={error} />
        <Block color="b3" offset={2}><p className="small">Code oublié ? <b>{capitalize(boss)}</b> peut le réinitialiser.</p></Block>
        <button type="button" className="link" onClick={onChangeHandle}>Ce n'est pas toi ? Changer de @</button>
      </div>
    </main>
  );
}

/** Lets a physical keyboard type digits into the code as well. */
function useKeyboardDigits(code: string, setCode: (code: string) => void): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (/^\d$/.test(event.key) && code.length < CODE_LENGTH) setCode(code + event.key);
      if (event.key === 'Backspace') setCode(code.slice(0, -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [code, setCode]);
}

