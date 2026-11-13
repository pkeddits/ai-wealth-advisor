import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Executa as funções de /api (as mesmas da Vercel) no servidor de desenvolvimento.
 * Variáveis sem prefixo VITE_ (ex.: BRAPI_API_KEY) ficam apenas no servidor.
 */
function localApi(env: Record<string, string>): Plugin {
  const routes: Record<string, [string, string]> = {
    '/api/quotes': ['/server/quotes.ts', 'handleQuotesRequest'],
    '/api/pluggy/connect-token': ['/server/pluggy/handlers.ts', 'handleConnectToken'],
    '/api/pluggy/items': ['/server/pluggy/handlers.ts', 'handleRegisterItem'],
    '/api/pluggy/sync': ['/server/pluggy/handlers.ts', 'handleSync'],
    '/api/pluggy/disconnect': ['/server/pluggy/handlers.ts', 'handleDisconnect'],
    '/api/ai/chat': ['/server/ai/handler.ts', 'handleChat'],
    '/api/ai/snapshot': ['/server/ai/handler.ts', 'handleSnapshot'],
    '/api/health': ['/server/health.ts', 'handleHealth'],
  };
  return {
    name: 'aiwa-local-api',
    configureServer(server) {
      for (const [route, [file, handler]] of Object.entries(routes)) {
        server.middlewares.use(route, async (req, res) => {
          const mod = await server.ssrLoadModule(file);
          const { serverEnv, quotesEnv } = await server.ssrLoadModule('/server/env.ts');
          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) if (typeof value === 'string') headers.set(key, value);
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const body = chunks.length && req.method !== 'GET' ? Buffer.concat(chunks) : undefined;
          const abort = new AbortController();
          res.on('close', () => abort.abort());
          const request = new Request(`http://localhost${req.originalUrl}`, { method: req.method, headers, body, signal: abort.signal });
          const response: Response =
            route === '/api/quotes'
              ? await mod[handler](request, quotesEnv(env))
              : route === '/api/health'
                ? await mod[handler](request, env)
                : await mod[handler](request, serverEnv(env));
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          if (!response.body) return res.end();
          const reader = response.body.getReader();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const useGoBackend = env.VITE_APP_MODE === 'api' || env.VITE_DEMO_MODE === 'false';

  return {
    plugins: [react(), localApi(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: useGoBackend
        ? {
            '/api': { target: 'http://localhost:8080', changeOrigin: true },
            '/ws': { target: 'ws://localhost:8080', ws: true },
          }
        : undefined,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            ui: ['lucide-react', 'recharts'],
            forms: ['react-hook-form', '@hookform/resolvers/zod', 'zod'],
            state: ['zustand', '@tanstack/react-query'],
          },
        },
      },
    },
  };
});
