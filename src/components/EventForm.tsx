import { useState, type FormEvent } from 'react';
import { THEMES, type ThemeId } from '../../shared/themes';
import type { DrawVisibility, EventInput } from '../../shared/types';
import { Button, ErrorLine } from './ui';

/** An empty event, Christmas themed, one gift each. */
export function blankEvent(): EventInput {
  return { title: '', theme: 'noel', date: '', time: null, place: '', budget: '', giftsPerPerson: 1, drawVisibility: 'anonymous' };
}

/** Form to create or edit an event; `isDrawn` locks the number of gifts and the draw mode. */
export function EventForm({ initial, submitLabel, isDrawn = false, onSubmit }: {
  initial: EventInput;
  submitLabel: string;
  isDrawn?: boolean;
  onSubmit: (input: EventInput) => Promise<void>;
}) {
  const [input, setInput] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof EventInput>(key: K, value: EventInput[K]) => setInput((old) => ({ ...old, [key]: value }));

  /** Sends the form and shows the API's message on failure. */
  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(input);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Oups.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <label className="field">Titre
        <input className="input sm" value={input.title} maxLength={60} required placeholder="Secret Santa 2026"
          onChange={(e) => set('title', e.target.value)} />
      </label>
      <label className="field">Thème
        <select className="input sm" value={input.theme} onChange={(e) => set('theme', e.target.value as ThemeId)}>
          {THEMES.map((theme) => <option key={theme.id} value={theme.id}>{theme.emoji} {theme.name}</option>)}
        </select>
      </label>
      <div className="row2">
        <label className="field">📅 Date
          <input className="input sm" type="date" value={input.date} required onChange={(e) => set('date', e.target.value)} />
        </label>
        <label className="field">🕖 Heure
          <input className="input sm" type="time" value={input.time ?? ''} onChange={(e) => set('time', e.target.value || null)} />
        </label>
      </div>
      <label className="field">📍 Lieu
        <input className="input sm" value={input.place} maxLength={80} placeholder="Chez …" onChange={(e) => set('place', e.target.value)} />
      </label>
      <div className="row2">
        <label className="field">💰 Budget
          <input className="input sm" value={input.budget} maxLength={30} placeholder="20 € max" onChange={(e) => set('budget', e.target.value)} />
        </label>
        <label className="field">🎁 Cadeaux / pers.
          <input className="input sm" type="number" min={1} max={5} value={input.giftsPerPerson} disabled={isDrawn}
            onChange={(e) => set('giftsPerPerson', Number(e.target.value))} />
        </label>
      </div>
      <DrawModePicker value={input.drawVisibility} isLocked={isDrawn} onChange={(mode) => set('drawVisibility', mode)} />
      <ErrorLine message={error} />
      <Button kind="strong" small type="submit" disabled={busy}>{submitLabel}</Button>
    </form>
  );
}

const DRAW_MODES: Array<[DrawVisibility, string, string]> = [
  ['anonymous', '🙈 100 % anonyme', 'Personne ne verra qui offre à qui, toi non plus.'],
  ['visible', '👀 Visible par moi', 'Tu vois le tirage et tu peux échanger des personnes avant d’ouvrir les enveloppes. Personne d’autre ne le sait.'],
];

/** "100 % anonyme" or "Tirage visible par l'admin"; frozen once the draw is made. */
function DrawModePicker({ value, isLocked, onChange }: { value: DrawVisibility; isLocked: boolean; onChange: (mode: DrawVisibility) => void }) {
  const hint = DRAW_MODES.find(([mode]) => mode === value)?.[2];
  return (
    <div className="field" role="group" aria-label="Tirage">
      <span>🎲 Tirage</span>
      <div className="seg">
        {DRAW_MODES.map(([mode, label]) => (
          <button key={mode} type="button" className={mode === value ? 'on' : ''} aria-pressed={mode === value}
            disabled={isLocked} onClick={() => onChange(mode)}>{label}</button>
        ))}
      </div>
      <span className="small">{isLocked ? `${hint} Le tirage est fait : le mode est figé.` : hint}</span>
    </div>
  );
}
