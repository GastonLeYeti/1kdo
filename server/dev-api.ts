import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';

/** The security headers of vercel.json, so `npm run preview` behaves like production. */
function productionHeaders(): Record<string, string> {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')) as {
    headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
  };
  const all = config.headers.find((rule) => rule.source === '/(.*)')?.headers ?? [];
  return Object.fromEntries(all.filter((h) => h.key !== 'Strict-Transport-Security').map((h) => [h.key, h.value.replace(' upgrade-insecure-requests', '')]));
}

/** Vite plugin serving /api/* from the same code as the Vercel function, in `npm run dev` and `npm run preview`. */
export function devApi(): Plugin {
  return {
    name: '1kdo-dev-api',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        req.url = `/api${req.url ?? ''}`;
        const { serveNode } = (await server.ssrLoadModule('/server/node-adapter.ts')) as typeof import('./node-adapter.js');
        await serveNode(req, res);
      });
    },
    configurePreviewServer(server) {
      const headers = productionHeaders();
      server.middlewares.use(async (req, res, next) => {
        for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
        if (!req.url?.startsWith('/api/')) return next();
        const { serveNode } = await import('./node-adapter.js');
        await serveNode(req, res);
      });
    },
  };
}
