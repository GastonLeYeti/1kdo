import type { ApiErrorBody } from '../../shared/types';

/** An API answer that is not a success. */
export class ApiError extends Error {
  constructor(readonly status: number, readonly body: ApiErrorBody) {
    super(body.message);
  }
}

/** Calls the API with JSON in and out; throws ApiError on failure. */
export async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: method === 'GET' ? {} : { 'Content-Type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    });
  } catch {
    throw new ApiError(0, { error: 'network', message: 'Pas de réseau. Vérifie ta connexion et réessaie.' });
  }
  const data = (await response.json().catch(() => null)) as T | ApiErrorBody | null;
  if (!response.ok) {
    throw new ApiError(response.status, (data as ApiErrorBody) ?? { error: 'server', message: 'Oups, une erreur est survenue.' });
  }
  return data as T;
}

/** The message to show for any error. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Oups, une erreur est survenue.';
}
