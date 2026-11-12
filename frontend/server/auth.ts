import { HttpError } from './http';

export interface SessionEnv {
  supabaseUrl?: string;
  supabaseKey?: string;
}

const TTL = 5 * 60_000;
const verified = new Map<string, { userId: string; expiresAt: number }>();

/** Resolve o usuário a partir do token do Supabase Auth. O id nunca vem do cliente. */
export async function requireUser(token: string, env: SessionEnv, fetcher: typeof fetch): Promise<string> {
  if (!env.supabaseUrl || !env.supabaseKey) throw new HttpError(503, 'Serviço não configurado.');
  const cached = verified.get(token);
  if (cached && cached.expiresAt > Date.now()) return cached.userId;
  let res: Response;
  try {
    res = await fetcher(`${env.supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, { headers: { apikey: env.supabaseKey, Authorization: `Bearer ${token}` } });
  } catch {
    throw new HttpError(503, 'Não foi possível validar a sessão.');
  }
  if (!res.ok) throw new HttpError(401, 'Sessão inválida ou expirada.');
  const user = (await res.json().catch(() => null)) as { id?: string } | null;
  if (!user?.id) throw new HttpError(401, 'Sessão inválida ou expirada.');
  verified.set(token, { userId: user.id, expiresAt: Date.now() + TTL });
  return user.id;
}
