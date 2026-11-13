import type { SessionInfo } from '../../shared/types';
import { api } from './api';
import { navigate } from './router';

/** Signs out and goes back to the start. */
export async function logout(reload: () => Promise<SessionInfo>): Promise<void> {
  await api('POST', '/auth/logout').catch(() => undefined);
  await reload();
  navigate('/', { replace: true });
}
