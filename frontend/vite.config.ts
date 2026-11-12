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
  return {
    name: 'aiwa-local-api',
    configureServer(server) {
      server.middlewares.use('/api/quotes', async (req, res) => {
        const { handleQuotesRequest } = await server.ssrLoadModule('/server/quotes.ts');
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) if (typeof value === 'string') headers.set(key, value);
        const response: Response = await handleQuotesRequest(new Request(`http://localhost${req.originalUrl}`, { method: req.method, headers }), {
          brapiKey: env.BRAPI_API_KEY,
          supabaseUrl: env.SUPABASE_URL || env.VITE_SUPABASE_URL,
          supabaseKey: env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY,
        });
        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(await response.text());
      });
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
