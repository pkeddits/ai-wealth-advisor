import { create } from 'zustand';
import { getSupabase } from '../lib/supabase';

export type QuoteFailure = 'not_found' | 'requires_key' | 'plan_restricted' | 'rate_limited' | 'provider_error' | 'service_unavailable';

export type QuoteResult =
  | { symbol: string; status: 'ok'; price: number; changePercent: number | null; currency: string; quotedAt: string | null; cachedAt: string }
  | { symbol: string; status: 'unavailable'; reason: QuoteFailure };

interface QuoteStatus {
  checkedAt: string | null;
  serviceDown: boolean;
  refreshing: boolean;
}

export const useQuoteStatus = create<QuoteStatus>(() => ({ checkedAt: null, serviceDown: false, refreshing: false }));

const CLIENT_TTL = 10 * 60_000;
const STORAGE_KEY = 'aiwa.quotes.v1';
const memory = new Map<string, { result: QuoteResult; storedAt: number }>();
let forceNext = false;

function load() {
  if (memory.size) return;
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, { result: QuoteResult; storedAt: number }>;
    for (const [symbol, entry] of Object.entries(stored)) memory.set(symbol, entry);
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

function persist() {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(memory)));
}

export function clearQuoteCache() {
  memory.clear();
  sessionStorage.removeItem(STORAGE_KEY);
  useQuoteStatus.setState({ checkedAt: null, serviceDown: false });
}

/** A próxima consulta ignora o cache local (o servidor aplica intervalo mínimo de 60 s). */
export function requestQuoteRefresh() {
  forceNext = true;
}

export async function getQuotes(symbols: string[]): Promise<Map<string, QuoteResult>> {
  load();
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const result = new Map<string, QuoteResult>();
  if (!unique.length) return result;

  const force = forceNext;
  forceNext = false;
  const now = Date.now();
  const missing = unique.filter((s) => {
    const entry = memory.get(s);
    if (!force && entry && now - entry.storedAt < CLIENT_TTL) {
      result.set(s, entry.result);
      return false;
    }
    return true;
  });
  if (!missing.length) return result;

  useQuoteStatus.setState({ refreshing: true });
  try {
    const { data } = await getSupabase().auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('sem sessão');
    const res = await fetch(`/api/quotes?symbols=${missing.join(',')}${force ? '&force=1' : ''}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { quotes?: QuoteResult[] };
    for (const quote of body.quotes ?? []) {
      result.set(quote.symbol, quote);
      memory.set(quote.symbol, { result: quote, storedAt: now });
    }
    persist();
    useQuoteStatus.setState({ checkedAt: new Date().toISOString(), serviceDown: false });
  } catch {
    useQuoteStatus.setState({ serviceDown: true });
  } finally {
    useQuoteStatus.setState({ refreshing: false });
  }
  for (const s of missing) if (!result.has(s)) result.set(s, { symbol: s, status: 'unavailable', reason: 'service_unavailable' });
  return result;
}
