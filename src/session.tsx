import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { SessionInfo } from '../shared/types';
import { api } from './lib/api';

interface SessionContextValue {
  session: SessionInfo | null;
  reload: () => Promise<SessionInfo>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/** Loads who is signed in and shares it with every screen. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const reload = useCallback(async () => {
    const info = await api<SessionInfo>('GET', '/session').catch((): SessionInfo => ({ user: null, events: [], bossPronoun: null }));
    setSession(info);
    return info;
  }, []);
  useEffect(() => void reload(), [reload]);
  return <SessionContext.Provider value={{ session, reload }}>{children}</SessionContext.Provider>;
}

/** The session shared by SessionProvider. */
export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
