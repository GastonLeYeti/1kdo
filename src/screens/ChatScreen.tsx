import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { getTheme } from '../../shared/themes';
import { MAX_MESSAGE_LENGTH, type ChatMessage, type ChatSummary, type ChatThreadView } from '../../shared/types';
import { Block, Button, ErrorLine, Header, Loading } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { useRefresh } from '../lib/chats';
import { chatDay } from '../lib/format';
import { eventPath, navigate } from '../lib/router';
import type { EventContext } from './EventScreen';

/** How often an open conversation looks for new messages. */
const THREAD_REFRESH_MS = 20_000;

/** One anonymous conversation between a giver and a receiver. */
export function ChatScreen({ event, reloadChats, threadId }: EventContext & { threadId: string }) {
  const theme = getTheme(event.theme);
  const path = `/events/${encodeURIComponent(event.id)}/chats/${encodeURIComponent(threadId)}`;
  const [view, setView] = useState<ChatThreadView | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Shows a fresh copy of the thread, then refreshes the badges (it is now read). */
  const show = useCallback((fresh: ChatThreadView) => {
    setView(fresh);
    void reloadChats();
  }, [reloadChats]);

  const load = useCallback(() => {
    api<ChatThreadView>('GET', path).then(show).catch((caught) => setError(errorMessage(caught)));
  }, [path, show]);
  useRefresh(load, THREAD_REFRESH_MS);

  const back = () => navigate(eventPath(event.id));
  if (!view) {
    return error ? <main className="screen with-tabs"><div className="pad"><ErrorLine message={error} /><Button onClick={back}>‹ Mon tirage</Button></div></main> : <Loading />;
  }
  const { thread, messages } = view;
  return (
    <main className="screen with-tabs">
      <Header title={<>💬 {thread.title}</>} sub="‹ Mon tirage" onSubClick={back} theme={theme} />
      <div className="pad">
        <Intro thread={thread} />
        <Messages messages={messages} />
        {thread.role === 'giver' && thread.isMuted
          ? <Block color="b3"><p className="small">⏸️ Ce fil est en pause : tu ne peux plus écrire pour l’instant.</p></Block>
          : <Composer path={path} onSent={show} />}
        {thread.role === 'receiver' && <MuteToggle thread={thread} path={path} onChanged={show} />}
      </div>
    </main>
  );
}

/** Who is on the other side, and the promise of secrecy. */
function Intro({ thread }: { thread: ChatSummary }) {
  return (
    <Block color="b1" narrow>
      <p className="small">
        {thread.role === 'giver'
          ? <>Tu écris à <b>{thread.with?.name}</b> en secret : ton nom n’apparaît jamais 🤫</>
          : <>Une personne qui t’offre un cadeau. Tu ne sauras pas qui c’est 🤫 Tu peux lui répondre ou lui écrire en premier.</>}
      </p>
    </Block>
  );
}

/** The messages, grouped under their day ("aujourd'hui", "hier", "le 12/12"). */
function Messages({ messages }: { messages: ChatMessage[] }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (messages.length > 0) end.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);
  if (messages.length === 0) return <p className="small c">Pas encore de message. Lance la conversation ✍️</p>;
  return (
    <div className="thread" aria-live="polite">
      {messages.map((message, index) => (
        <div key={index} className="msg-wrap">
          {message.day !== messages[index - 1]?.day && <div className="day">{chatDay(message.day)}</div>}
          <p className={`msg ${message.isMine ? 'mine' : 'theirs'}`}>
            <span className="sr-only">{message.isMine ? 'Toi : ' : 'Message reçu : '}</span>
            {message.text}
          </p>
        </div>
      ))}
      <div ref={end} />
    </div>
  );
}

/** The box to write a message; Ctrl/Cmd + Entrée sends it too. */
function Composer({ path, onSent }: { path: string; onSent: (view: ChatThreadView) => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Sends the message and clears the box. */
  async function send(event?: FormEvent): Promise<void> {
    event?.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      onSent(await api<ChatThreadView>('POST', `${path}/messages`, { text }));
      setText('');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  /** Ctrl/Cmd + Enter sends; Enter alone adds a line. */
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void send();
  }

  return (
    <form onSubmit={send}>
      <Block className="editor">
        <label className="label" htmlFor="message">Ton message</label>
        <textarea id="message" className="ta" value={text} maxLength={MAX_MESSAGE_LENGTH} placeholder="Écris ici…"
          onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown} />
        <div className="editor-foot">
          <span className="small">{text.length}/{MAX_MESSAGE_LENGTH}</span>
          <Button kind="strong" small type="submit" disabled={busy || !text.trim()}>Envoyer ➤</Button>
        </div>
      </Block>
      <ErrorLine message={error} />
    </form>
  );
}

/** The receiver pauses or resumes the thread. */
function MuteToggle({ thread, path, onChanged }: { thread: ChatSummary; path: string; onChanged: (view: ChatThreadView) => void }) {
  const [error, setError] = useState<string | null>(null);

  /** Flips the pause and shows the updated thread. */
  async function toggle(): Promise<void> {
    setError(null);
    try {
      onChanged(await api<ChatThreadView>('POST', `${path}/mute`, { isMuted: !thread.isMuted }));
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <>
      {thread.isMuted && <p className="small c">⏸️ Fil en pause : la personne ne peut plus t’écrire.</p>}
      <button type="button" className="link" onClick={() => void toggle()}>
        {thread.isMuted ? '🔔 Reprendre ce fil' : '🔇 Mettre ce fil en pause'}
      </button>
      <ErrorLine message={error} />
    </>
  );
}
