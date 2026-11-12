/**
 * Cotações via brapi.dev (API v2), executado apenas no servidor.
 *
 * Plano gratuito: 1 ativo por requisição, 1 requisição simultânea, 15 mil requisições/mês e dados
 * atualizados a cada 30 minutos. Sem chave, somente PETR4, VALE3, MGLU3 e ITUB4 (20 req/min por IP).
 * Por isso as consultas são sequenciais, um ticker por vez, com cache.
 */

export type QuoteFailure = 'not_found' | 'requires_key' | 'plan_restricted' | 'rate_limited' | 'provider_error';

export type QuoteResult =
  | { symbol: string; status: 'ok'; price: number; changePercent: number | null; currency: string; quotedAt: string | null; cachedAt: string }
  | { symbol: string; status: 'unavailable'; reason: QuoteFailure };

export interface QuotesEnv {
  brapiKey?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
}

const BRAPI_URL = 'https://brapi.dev/api/v2/stocks/quote';
const SYMBOL = /^[A-Z0-9]{4,12}$/;
const MAX_SYMBOLS = 20;
const OK_TTL = 15 * 60_000;
const FAILURE_TTL = 10 * 60_000;
const MIN_FORCE_INTERVAL = 60_000;
const AUTH_TTL = 5 * 60_000;

interface CacheEntry {
  result: QuoteResult;
  storedAt: number;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const verifiedTokens = new Map<string, number>();
let blockedUntil = 0;

export function resetQuoteState() {
  cache.clear();
  verifiedTokens.clear();
  blockedUntil = 0;
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store', ...extra },
  });
}

async function isAuthenticated(token: string, env: QuotesEnv, fetcher: typeof fetch): Promise<boolean> {
  const now = Date.now();
  const cached = verifiedTokens.get(token);
  if (cached && cached > now) return true;
  const res = await fetcher(`${env.supabaseUrl!.replace(/\/$/, '')}/auth/v1/user`, {
    headers: { apikey: env.supabaseKey!, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return false;
  verifiedTokens.set(token, now + AUTH_TTL);
  return true;
}

async function fetchOne(symbol: string, env: QuotesEnv, fetcher: typeof fetch): Promise<QuoteResult> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (env.brapiKey) headers.Authorization = `Bearer ${env.brapiKey}`;
  let res: Response;
  try {
    res = await fetcher(`${BRAPI_URL}?symbols=${encodeURIComponent(symbol)}`, { headers });
  } catch {
    return { symbol, status: 'unavailable', reason: 'provider_error' };
  }

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After'));
    blockedUntil = Date.now() + (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 60_000);
    return { symbol, status: 'unavailable', reason: 'rate_limited' };
  }
  if (res.status === 404) return { symbol, status: 'unavailable', reason: 'not_found' };
  if (res.status === 401) return { symbol, status: 'unavailable', reason: 'requires_key' };
  if (res.status === 403) return { symbol, status: 'unavailable', reason: 'plan_restricted' };
  if (!res.ok) return { symbol, status: 'unavailable', reason: 'provider_error' };

  try {
    const body = (await res.json()) as { results?: { requestedSymbol?: string; symbol?: string; data?: Record<string, unknown> }[] };
    const item = body.results?.find((r) => (r.requestedSymbol ?? r.symbol)?.toUpperCase() === symbol) ?? body.results?.[0];
    const price = Number(item?.data?.regularMarketPrice);
    if (!item?.data || !Number.isFinite(price) || price <= 0) return { symbol, status: 'unavailable', reason: 'not_found' };
    const change = Number(item.data.regularMarketChangePercent);
    const time = item.data.regularMarketTime;
    return {
      symbol,
      status: 'ok',
      price,
      changePercent: Number.isFinite(change) ? change : null,
      currency: typeof item.data.currency === 'string' ? item.data.currency : 'BRL',
      quotedAt: typeof time === 'string' && !Number.isNaN(Date.parse(time)) ? new Date(time).toISOString() : null,
      cachedAt: new Date().toISOString(),
    };
  } catch {
    return { symbol, status: 'unavailable', reason: 'provider_error' };
  }
}

export async function handleQuotesRequest(request: Request, env: QuotesEnv, fetcher: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'GET') return json({ error: 'Método não permitido.' }, 405, { Allow: 'GET' });
  if (!env.supabaseUrl || !env.supabaseKey) return json({ error: 'Serviço de cotações não configurado.' }, 503);

  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: 'Autenticação necessária.' }, 401);
  try {
    if (!(await isAuthenticated(token, env, fetcher))) return json({ error: 'Sessão inválida ou expirada.' }, 401);
  } catch {
    return json({ error: 'Não foi possível validar a sessão.' }, 503);
  }

  const url = new URL(request.url);
  const symbols = [...new Set((url.searchParams.get('symbols') ?? '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean))];
  if (!symbols.length) return json({ error: 'Informe ao menos um ativo.' }, 400);
  if (symbols.length > MAX_SYMBOLS) return json({ error: `Máximo de ${MAX_SYMBOLS} ativos por consulta.` }, 400);
  if (symbols.some((s) => !SYMBOL.test(s))) return json({ error: 'Código de ativo inválido.' }, 400);
  const force = url.searchParams.get('force') === '1';

  const quotes: QuoteResult[] = [];
  let upstreamCalls = 0;
  for (const symbol of symbols) {
    const now = Date.now();
    const entry = cache.get(symbol);
    const forceAllowed = force && entry && now - entry.storedAt >= MIN_FORCE_INTERVAL;
    if (entry && entry.expiresAt > now && !forceAllowed) {
      quotes.push(entry.result);
      continue;
    }
    if (now < blockedUntil) {
      quotes.push(entry?.result.status === 'ok' ? entry.result : { symbol, status: 'unavailable', reason: 'rate_limited' });
      continue;
    }
    const result = await fetchOne(symbol, env, fetcher);
    upstreamCalls++;
    if (result.status === 'ok') {
      cache.set(symbol, { result, storedAt: now, expiresAt: now + OK_TTL });
      quotes.push(result);
    } else if (entry?.result.status === 'ok') {
      quotes.push(entry.result);
    } else {
      if (result.reason !== 'rate_limited' && result.reason !== 'provider_error') cache.set(symbol, { result, storedAt: now, expiresAt: now + FAILURE_TTL });
      quotes.push(result);
    }
  }

  return json({ source: 'brapi.dev', quotes, upstreamCalls, generatedAt: new Date().toISOString() });
}
