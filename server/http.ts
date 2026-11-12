import type { ApiErrorBody } from '../shared/types.js';

/** A request as the route handlers see it, whatever the hosting runtime. */
export interface ApiRequest {
  method: string;
  path: string;
  body: unknown;
  cookies: Record<string, string>;
  contentType: string;
}

/** What a route handler answers. */
export interface ApiResponse {
  status: number;
  body: unknown;
  setCookies?: string[];
}

/** An error that becomes a JSON answer with this status. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly extra: Partial<ApiErrorBody> = {},
  ) {
    super(message);
  }

  /** The JSON body sent to the client. */
  toBody(): ApiErrorBody {
    return { error: this.code, message: this.message, ...this.extra };
  }
}

/** A 200 answer. */
export function ok(body: unknown, setCookies?: string[]): ApiResponse {
  return { status: 200, body, setCookies };
}

/** Reads the body as an object of unknown fields (an empty object when it is not one). */
export function bodyFields(req: ApiRequest): Record<string, unknown> {
  const body = req.body;
  return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}

/** Parses a Cookie header into a name → value map. */
export function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of (header ?? '').split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    if (name) cookies[name] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return cookies;
}
