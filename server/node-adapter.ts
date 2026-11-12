import type { IncomingMessage, ServerResponse } from 'node:http';
import { Db } from './db.js';
import { parseCookies, type ApiRequest } from './http.js';
import { handleApi } from './routes.js';
import { getStore } from './store/index.js';

const MAX_BODY_BYTES = 16 * 1024;
const PATH_QUERY = '__path';

/** Node request as Vercel hands it: possibly with the body already parsed. */
type NodeRequest = IncomingMessage & { body?: unknown };

/** Reads and parses a JSON body from the stream, at most 16 KB. */
async function readJsonBody(req: NodeRequest): Promise<unknown> {
  if (req.body !== undefined) return typeof req.body === 'string' ? safeParse(req.body) : req.body;
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) return null;
    chunks.push(chunk as Buffer);
  }
  return safeParse(Buffer.concat(chunks).toString('utf8'));
}

/** JSON.parse that answers null instead of throwing. */
function safeParse(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

/** The API path of a request: from the rewrite's query on Vercel, else from the URL. */
function apiPath(url: URL): string {
  const rewritten = url.searchParams.get(PATH_QUERY);
  return rewritten !== null ? `/api/${rewritten}` : url.pathname;
}

/** Converts a Node request into the app's ApiRequest. */
async function toApiRequest(req: NodeRequest): Promise<ApiRequest> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const method = (req.method ?? 'GET').toUpperCase();
  return {
    method,
    path: apiPath(url),
    body: method === 'GET' ? null : await readJsonBody(req),
    cookies: parseCookies(req.headers.cookie),
    contentType: String(req.headers['content-type'] ?? ''),
  };
}

/** Serves one API request with Node's request/response objects. */
export async function serveNode(req: NodeRequest, res: ServerResponse): Promise<void> {
  const answer = await handleApi(new Db(getStore()), await toApiRequest(req));
  res.statusCode = answer.status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (answer.setCookies?.length) res.setHeader('Set-Cookie', answer.setCookies);
  res.end(JSON.stringify(answer.body));
}
