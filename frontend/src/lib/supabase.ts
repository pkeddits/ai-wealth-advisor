import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const publicKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY)?.trim();

export const supabaseConfigError: string | null = !url || !publicKey
  ? 'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.'
  : /^sb_secret_/.test(publicKey) || /service_role/.test(atobSafe(publicKey.split('.')[1]))
    ? 'A chave configurada é secreta (service role). Use a chave publicável do projeto.'
    : null;

function atobSafe(segment?: string): string {
  if (!segment) return '';
  try {
    return atob(segment.replace(/-/g, '+').replace(/_/g, '/'));
  } catch {
    return '';
  }
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (supabaseConfigError) throw new Error(supabaseConfigError);
  client ??= createClient(url!, publicKey!, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}
