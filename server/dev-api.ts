import type { Plugin } from 'vite';

/** Vite plugin serving /api/* from the same code as the Vercel function, during `npm run dev`. */
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
  };
}
