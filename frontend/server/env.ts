import type { OpenFinanceEnv } from './pluggy/handlers.js';
import type { AssistantEnv } from './ai/handler.js';
import type { QuotesEnv } from './quotes.js';

type Source = Record<string, string | undefined>;

/**
 * Valores colados no painel da Vercel costumam trazer espaço, quebra de linha ou aspas.
 * Um "\n" no fim da chave invalida o header Authorization e a chamada falha antes de sair.
 */
export function clean(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim().replace(/^(['"])(.*)\1$/, '$2').trim();
  return trimmed || undefined;
}

function pick(source: Source, ...names: string[]): string | undefined {
  for (const name of names) {
    const value = clean(source[name]);
    if (value) return value;
  }
  return undefined;
}

function sessionEnv(source: Source) {
  return {
    supabaseUrl: pick(source, 'SUPABASE_URL', 'VITE_SUPABASE_URL'),
    supabaseKey: pick(source, 'SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY'),
  };
}

/** Variáveis do servidor. As secretas não usam o prefixo VITE_, portanto nunca chegam ao navegador. */
export function serverEnv(source: Source): OpenFinanceEnv & AssistantEnv {
  return {
    ...sessionEnv(source),
    supabaseSecretKey: pick(source, 'SUPABASE_SECRET_KEY'),
    pluggyClientId: pick(source, 'PLUGGY_CLIENT_ID'),
    pluggyClientSecret: pick(source, 'PLUGGY_CLIENT_SECRET'),
    aiProvider: (pick(source, 'AI_PROVIDER') ?? 'groq').toLowerCase(),
    groqApiKey: pick(source, 'GROQ_API_KEY'),
    groqModel: pick(source, 'GROQ_MODEL', 'AI_MODEL'),
    groqBaseUrl: pick(source, 'GROQ_BASE_URL')?.replace(/\/+$/, ''),
    geminiApiKey: pick(source, 'GEMINI_API_KEY'),
    geminiModel: pick(source, 'GEMINI_MODEL'),
    aiCompareEnabled: pick(source, 'AI_COMPARE_ENABLED') === 'true',
  };
}

export function quotesEnv(source: Source): QuotesEnv {
  return { ...sessionEnv(source), brapiKey: pick(source, 'BRAPI_API_KEY') };
}

/**
 * Presença (nunca o valor) de cada variável, para o diagnóstico autenticado em /api/health.
 * Um nome com prefixo VITE_ no servidor é aceito, mas o equivalente sem prefixo é o recomendado.
 */
export function configurationReport(source: Source) {
  const has = (...names: string[]) => names.some((n) => Boolean(clean(source[n])));
  const env = serverEnv(source);
  return {
    supabase: { url: has('SUPABASE_URL', 'VITE_SUPABASE_URL'), publishableKey: has('SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY'), secretKey: has('SUPABASE_SECRET_KEY') },
    groq: { provider: env.aiProvider, apiKey: has('GROQ_API_KEY'), model: env.groqModel ?? 'openai/gpt-oss-120b', customBaseUrl: Boolean(env.groqBaseUrl) },
    pluggy: { clientId: has('PLUGGY_CLIENT_ID'), clientSecret: has('PLUGGY_CLIENT_SECRET') },
    brapi: { apiKey: has('BRAPI_API_KEY') },
    secretsExposedAsPublic: ['VITE_SUPABASE_SECRET_KEY', 'VITE_GROQ_API_KEY', 'VITE_PLUGGY_CLIENT_SECRET', 'VITE_BRAPI_API_KEY'].filter((n) => has(n)),
  };
}
