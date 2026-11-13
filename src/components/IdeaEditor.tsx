import { useEffect, useState } from 'react';
import { MAX_IDEA_LENGTH } from '../../shared/types';
import { api, errorMessage } from '../lib/api';
import { Block, Button, ErrorLine } from './ui';
import type { PersonSheet } from '../../shared/types';

/** The viewer's own post-it on a sheet, editable by them alone. */
export function IdeaEditor({ eventId, handle, initial, label, placeholder, onSaved, offset = 0 }: {
  eventId: string;
  handle: string;
  initial: string | null;
  label: string;
  placeholder: string;
  onSaved: (sheet: PersonSheet) => void;
  offset?: 0 | 1 | 2;
}) {
  const [text, setText] = useState(initial ?? '');
  const [state, setState] = useState<'idle' | 'busy' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setText(initial ?? ''), [initial]);

  /** Saves the post-it (an empty text removes it). */
  async function save(): Promise<void> {
    setState('busy');
    setError(null);
    try {
      onSaved(await api<PersonSheet>('PUT', `/events/${eventId}/people/${encodeURIComponent(handle)}/idea`, { text }));
      setState('saved');
    } catch (caught) {
      setError(errorMessage(caught));
      setState('idle');
    }
  }

  const isUnchanged = text.trim() === (initial ?? '');
  return (
    <Block offset={offset} className="editor">
      <span className="tagpill">✏️ {label}</span>
      <textarea className="ta" value={text} maxLength={MAX_IDEA_LENGTH} placeholder={placeholder} aria-label={label}
        onChange={(e) => { setText(e.target.value); setState('idle'); }} />
      <div className="editor-foot">
        <span className="small">{text.length}/{MAX_IDEA_LENGTH}</span>
        {state === 'saved' && isUnchanged && <span className="hint">✓ Enregistré</span>}
      </div>
      <ErrorLine message={error} />
      <Button kind="strong" small onClick={() => void save()} disabled={state === 'busy' || isUnchanged}>
        {text.trim() === '' && initial ? 'Effacer' : 'Enregistrer'}
      </Button>
    </Block>
  );
}
