import { HttpError } from './http';

export interface AdminEnv {
  supabaseUrl?: string;
  supabaseSecretKey?: string;
}

/**
 * Acesso ao banco com a chave secreta (ignora RLS). Toda chamada deve filtrar explicitamente
 * pelo user_id já verificado pela sessão.
 */
export function adminDb(env: AdminEnv, fetcher: typeof fetch) {
  if (!env.supabaseUrl || !env.supabaseSecretKey) throw new HttpError(503, 'Integração bancária não configurada.');
  const base = `${env.supabaseUrl.replace(/\/$/, '')}/rest/v1`;
  const key = env.supabaseSecretKey;
  const headers: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' };
  if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;

  async function call<T>(method: string, path: string, body?: unknown, prefer?: string): Promise<T> {
    const res = await fetcher(`${base}/${path}`, {
      method,
      headers: prefer ? { ...headers, Prefer: prefer } : headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new HttpError(502, 'Falha ao gravar os dados importados.');
    const text = await res.text();
    return (text ? JSON.parse(text) : null) as T;
  }

  return {
    select: <T>(path: string) => call<T[]>('GET', path),
    insert: <T>(table: string, rows: unknown, onConflict?: string) =>
      call<T[]>('POST', onConflict ? `${table}?on_conflict=${onConflict}` : table, rows, onConflict ? 'resolution=merge-duplicates,return=representation' : 'return=representation'),
    update: <T>(path: string, body: unknown) => call<T[]>('PATCH', path, body, 'return=representation'),
    remove: (path: string) => call<unknown>('DELETE', path, undefined, 'return=minimal'),
  };
}

export type AdminDb = ReturnType<typeof adminDb>;
