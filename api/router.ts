// Single Vercel function: vercel.json rewrites every /api/* request here.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { serveNode } from '../server/node-adapter.js';

/** Vercel entry point. */
export default function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  return serveNode(req, res);
}
