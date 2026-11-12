import type { OpenFinanceEnv } from './pluggy/handlers';
import type { AssistantEnv } from './ai/handler';

/** Variáveis do servidor. Nenhuma delas usa o prefixo VITE_, portanto nunca chegam ao navegador. */
export function serverEnv(source: Record<string, string | undefined>): OpenFinanceEnv & AssistantEnv {
  return {
    supabaseUrl: source.SUPABASE_URL || source.VITE_SUPABASE_URL,
    supabaseKey: source.SUPABASE_PUBLISHABLE_KEY || source.VITE_SUPABASE_PUBLISHABLE_KEY || source.VITE_SUPABASE_ANON_KEY,
    supabaseSecretKey: source.SUPABASE_SECRET_KEY,
    pluggyClientId: source.PLUGGY_CLIENT_ID,
    pluggyClientSecret: source.PLUGGY_CLIENT_SECRET,
    aiProvider: source.AI_PROVIDER || 'groq',
    groqApiKey: source.GROQ_API_KEY,
    groqModel: source.GROQ_MODEL || source.AI_MODEL,
    geminiApiKey: source.GEMINI_API_KEY,
    geminiModel: source.GEMINI_MODEL,
    aiCompareEnabled: source.AI_COMPARE_ENABLED === 'true',
  };
}
