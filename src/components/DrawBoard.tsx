import { useEffect, useState } from 'react';
import type { DrawBoard, DrawBoardRow, Person } from '../../shared/types';
import { api, errorMessage } from '../lib/api';
import { Identicon } from './Identicon';
import { Block, Button, ErrorLine, Modal } from './ui';

/** First names of a list of people: "Sam, Lou". */
function names(people: readonly Person[]): string {
  return people.map((person) => person.name).join(', ');
}

/** Selects up to two givers: a third tap replaces the oldest choice; tapping again unselects. */
function toggleChoice(selected: readonly string[], handle: string): string[] {
  if (selected.includes(handle)) return selected.filter((h) => h !== handle);
  return [...selected, handle].slice(-2);
}

/** QG, visible mode: "Qui offre à qui", swaps of two people, then "Ouvrir les enveloppes". */
export function DrawBoardPanel({ eventId, envelopesOpen, onOpen, onToast }: {
  eventId: string;
  envelopesOpen: boolean;
  onOpen: () => Promise<boolean>;
  onToast: (message: string) => void;
}) {
  const base = `/admin/events/${encodeURIComponent(eventId)}`;
  const [board, setBoard] = useState<DrawBoard | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setConfirming] = useState(false);

  useEffect(() => {
    api<DrawBoard>('GET', `${base}/draw-board`).then(setBoard).catch((caught) => setError(errorMessage(caught)));
  }, [base, envelopesOpen]);

  /** Swaps the receivers of the two selected people. */
  async function swap(): Promise<void> {
    const [a, b] = selected;
    if (!board || !a || !b) return;
    setError(null);
    try {
      const updated = await api<DrawBoard>('POST', `${base}/draw-board/swap`, { a, b });
      const isNewDuo = updated.reciprocalPairs.length > board.reciprocalPairs.length;
      setBoard(updated);
      setSelected([]);
      onToast(isNewDuo ? 'Échangé 🔀 · attention, nouveau duo réciproque' : 'Échangé 🔀');
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  if (!board) return error ? <ErrorLine message={error} /> : null;
  const chosen = selected.map((handle) => board.rows.find((row) => row.giver.handle === handle)?.giver.name ?? handle);
  return (
    <>
      <Block offset={1}>
        <div className="lh">👀 Qui offre à qui</div>
        <div className="legend">
          {envelopesOpen ? 'Enveloppes ouvertes · 🔒 nom déjà découvert, ligne verrouillée' : 'Enveloppes fermées : personne ne voit encore son nom'}
          {' · touche deux personnes pour échanger leurs destinataires'}
        </div>
        {board.rows.map((row) => (
          <BoardRow key={row.giver.handle} row={row} isSelected={selected.includes(row.giver.handle)}
            onToggle={() => setSelected((old) => toggleChoice(old, row.giver.handle))} />
        ))}
        {board.reciprocalPairs.map(([a, b]) => (
          <p key={`${a.handle}-${b.handle}`} className="dwarn">⚠️ Duo réciproque : {a.name} ⇄ {b.name} s’offrent un cadeau l’un à l’autre.</p>
        ))}
        <ErrorLine message={error} />
        {selected.length === 1 && <p className="small">Choisis une deuxième personne.</p>}
        {selected.length === 2 && (
          <Button kind="strong" small onClick={() => void swap()}>🔀 Échanger les destinataires de {chosen[0]} et {chosen[1]}</Button>
        )}
      </Block>
      {!envelopesOpen && <Button kind="head" onClick={() => setConfirming(true)}>Ouvrir les enveloppes 🎁</Button>}
      {isConfirming && (
        <Modal title="🎁 Ouvrir les enveloppes ?" onClose={() => setConfirming(false)}>
          <ul className="warn">
            <li>Tout le monde pourra <b>découvrir son nom</b>.</li>
            <li>Dès qu’une personne a découvert son nom, sa ligne est <b>verrouillée</b> 🔒.</li>
            <li>On ne pourra pas refermer les enveloppes.</li>
          </ul>
          <div className="row">
            <Button kind="white" small onClick={() => setConfirming(false)}>Annuler</Button>
            <Button kind="head" small onClick={() => void onOpen().then(() => setConfirming(false))}>Ouvrir</Button>
          </div>
        </Modal>
      )}
    </>
  );
}

/** One giver and their receivers; a locked line cannot be chosen. */
function BoardRow({ row, isSelected, onToggle }: { row: DrawBoardRow; isSelected: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={`drow${isSelected ? ' on' : ''}`} disabled={row.isLocked} aria-pressed={isSelected} onClick={onToggle}
      aria-label={`${row.giver.name} offre à ${names(row.receivers)}${row.isLocked ? ', verrouillé' : ''}`}>
      <Identicon handle={row.giver.handle} size={28} />
      <b className="dgiver">{row.giver.name}</b>
      <span className="darrow" aria-hidden="true">→</span>
      <span className="drecv">{names(row.receivers)}</span>
      {row.isLocked && <span aria-hidden="true">🔒</span>}
    </button>
  );
}
