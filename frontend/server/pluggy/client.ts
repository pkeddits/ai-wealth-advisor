import { HttpError } from '../http';

export interface PluggyEnv {
  pluggyClientId?: string;
  pluggyClientSecret?: string;
  /** Somente para testes; em produção é sempre a API oficial. */
  pluggyApiUrl?: string;
}

const API_URL = 'https://api.pluggy.ai';
const KEY_TTL = 110 * 60_000;
let apiKey: { value: string; expiresAt: number; client: string } | null = null;

export function resetPluggyKey() {
  apiKey = null;
}

/** Cliente da API Pluggy. A API Key (válida por 2 h) é obtida com client id/secret e reaproveitada. */
export function pluggyClient(env: PluggyEnv, fetcher: typeof fetch) {
  if (!env.pluggyClientId || !env.pluggyClientSecret) throw new HttpError(503, 'Integração bancária não configurada.');
  const base = (env.pluggyApiUrl ?? API_URL).replace(/\/$/, '');

  async function key(force = false): Promise<string> {
    if (!force && apiKey && apiKey.client === env.pluggyClientId && apiKey.expiresAt > Date.now()) return apiKey.value;
    const res = await fetcher(`${base}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: env.pluggyClientId, clientSecret: env.pluggyClientSecret }),
    });
    if (!res.ok) throw new HttpError(502, 'Não foi possível autenticar com o provedor de Open Finance.');
    const body = (await res.json()) as { apiKey?: string };
    if (!body.apiKey) throw new HttpError(502, 'Resposta inesperada do provedor de Open Finance.');
    apiKey = { value: body.apiKey, expiresAt: Date.now() + KEY_TTL, client: env.pluggyClientId! };
    return body.apiKey;
  }

  async function request<T>(method: string, path: string, body?: unknown, retry = true): Promise<T> {
    const res = await fetcher(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': await key() },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 401 && retry) {
      await key(true);
      return request<T>(method, path, body, false);
    }
    if (res.status === 404) throw new HttpError(404, 'Conexão não encontrada no provedor.');
    if (res.status === 429) throw new HttpError(429, 'Limite de requisições do provedor atingido. Tente novamente em alguns minutos.');
    if (!res.ok) throw new HttpError(502, `O provedor de Open Finance respondeu com erro (HTTP ${res.status}).`);
    const text = await res.text();
    return (text ? JSON.parse(text) : null) as T;
  }

  return {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
    remove: (path: string) => request<unknown>('DELETE', path),
  };
}
