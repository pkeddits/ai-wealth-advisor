import type { BankConnection, ImportedInvestment } from '../types';
import { getSupabase } from '../lib/supabase';
import { dbError } from './supabase/errors';

export class OpenFinanceUnavailableError extends Error {}

async function api<T>(path: string, body: unknown = {}): Promise<T> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
  let res: Response;
  try {
    res = await fetch(`/api/pluggy/${path}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    throw new OpenFinanceUnavailableError('Serviço de conexão bancária indisponível no momento.');
  }
  const payload = (await res.json().catch(() => ({}))) as T & { error?: string; kind?: string; title?: string };
  if (res.status === 503) throw new OpenFinanceUnavailableError(payload.error ?? 'Conexão bancária não configurada.');
  if (!res.ok) throw Object.assign(new Error(payload.error ?? 'Não foi possível concluir a operação.'), { kind: payload.kind, title: payload.title });
  return payload;
}

export interface SyncResult {
  status: string;
  accounts: number;
  created: number;
  updated: number;
  review: number;
  investments: number;
}

export const openFinance = {
  connectToken: (connectionId?: string) => api<{ accessToken: string; itemId: string | null }>('connect-token', connectionId ? { connectionId } : {}),
  registerItem: (itemId: string) => api<{ connectionId: string; status: string }>('items', { itemId }),
  sync: (connectionId: string) => api<SyncResult>('sync', { connectionId }),
  disconnect: (connectionId: string) => api<{ disconnected: boolean }>('disconnect', { connectionId }),

  async connections(): Promise<BankConnection[]> {
    const { data, error } = await getSupabase()
      .from('bank_connections')
      .select('id, institution_name, institution_logo, status, status_message, products, connected_at, last_synced_at, last_sync_error, accounts:bank_accounts(id, kind, name, number_last4, currency, balance, balance_reported_at)')
      .order('connected_at');
    if (error) throw dbError(error, 'Não foi possível carregar as conexões bancárias.');
    return (data ?? []).map((c: any) => ({
      id: c.id,
      institutionName: c.institution_name,
      institutionLogo: c.institution_logo,
      status: c.status,
      statusMessage: c.status_message,
      products: c.products ?? [],
      connectedAt: c.connected_at,
      lastSyncedAt: c.last_synced_at,
      lastSyncError: c.last_sync_error,
      accounts: (c.accounts ?? []).map((a: any) => ({
        id: a.id,
        kind: a.kind,
        name: a.name,
        numberLast4: a.number_last4,
        currency: a.currency,
        balance: a.balance === null ? null : Number(a.balance),
        balanceReportedAt: a.balance_reported_at,
      })),
    }));
  },

  async investments(): Promise<ImportedInvestment[]> {
    const { data, error } = await getSupabase()
      .from('investment_positions')
      .select('id, connection_id, name, code, type, subtype, status, quantity, unit_value, balance, amount_original, reported_at, due_date, connection:bank_connections(institution_name), movements:investment_movements(count)')
      .order('balance', { ascending: false, nullsFirst: false });
    if (error) throw dbError(error, 'Não foi possível carregar os investimentos importados.');
    const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
    return (data ?? []).map((p: any) => ({
      id: p.id,
      connectionId: p.connection_id,
      institutionName: p.connection?.institution_name ?? 'Instituição',
      name: p.name,
      code: p.code,
      type: p.type,
      subtype: p.subtype,
      status: p.status,
      quantity: n(p.quantity),
      unitValue: n(p.unit_value),
      balance: n(p.balance),
      amountOriginal: n(p.amount_original),
      reportedAt: p.reported_at,
      dueDate: p.due_date,
      movements: p.movements?.[0]?.count ?? 0,
    }));
  },
};

export interface OpenFinanceStats {
  importedEntries: number;
  toReview: number;
  investmentsActive: number;
  investmentsWithdrawn: number;
}

/** Contagens para o resumo da Central de Integrações (consultas de contagem, sem trazer registros). */
export async function openFinanceStats(): Promise<OpenFinanceStats> {
  const sb = getSupabase();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [importedEntries, toReview, investmentsActive, investmentsWithdrawn] = await Promise.all([
    count(sb.from('finance_entries').select('id', { count: 'exact', head: true }).eq('source', 'open_finance')),
    count(sb.from('finance_entries').select('id', { count: 'exact', head: true }).eq('source', 'open_finance').eq('needs_review', true)),
    count(sb.from('investment_positions').select('id', { count: 'exact', head: true }).or('status.is.null,status.neq.TOTAL_WITHDRAWAL')),
    count(sb.from('investment_positions').select('id', { count: 'exact', head: true }).eq('status', 'TOTAL_WITHDRAWAL')),
  ]);
  return { importedEntries, toReview, investmentsActive, investmentsWithdrawn };
}

export interface ConnectionStats {
  entries: number;
  review: number;
  investments: number;
  withdrawn: number;
}

/** Indicadores por instituição: contagens filtradas pelas contas de cada conexão. */
export async function connectionStats(connections: BankConnection[]): Promise<Record<string, ConnectionStats>> {
  const sb = getSupabase();
  const { data: positions } = await sb.from('investment_positions').select('connection_id, status');
  const entries = await Promise.all(connections.map(async (c) => {
    const ids = c.accounts.map((a) => a.id);
    if (!ids.length) return [0, 0];
    const [all, review] = await Promise.all([
      sb.from('finance_entries').select('id', { count: 'exact', head: true }).in('account_id', ids),
      sb.from('finance_entries').select('id', { count: 'exact', head: true }).in('account_id', ids).eq('needs_review', true),
    ]);
    return [all.count ?? 0, review.count ?? 0];
  }));
  return Object.fromEntries(connections.map((c, i) => {
    const mine = (positions ?? []).filter((p: { connection_id: string }) => p.connection_id === c.id) as { status: string | null }[];
    return [c.id, { entries: entries[i][0], review: entries[i][1], investments: mine.filter((p) => p.status !== 'TOTAL_WITHDRAWAL').length, withdrawn: mine.filter((p) => p.status === 'TOTAL_WITHDRAWAL').length }];
  }));
}

/** Ambiente do Open Finance: em "sandbox" só o Pluggy Bank, com dados fictícios, pode ser conectado. */
export const OPEN_FINANCE_ENV: 'sandbox' | 'production' = import.meta.env.VITE_OPEN_FINANCE_ENV === 'production' ? 'production' : 'sandbox';
export const isSandboxConnection = (name: string) => /pluggy bank|sandbox|mockbank/i.test(name);

export const INVESTMENT_TYPE_LABELS: Record<string, string> = {
  FIXED_INCOME: 'Renda fixa',
  SECURITY: 'Previdência',
  MUTUAL_FUND: 'Fundo',
  EQUITY: 'Renda variável',
  ETF: 'ETF',
  COE: 'COE',
};

export const CONNECTION_STATUS: Record<string, { label: string; className: string }> = {
  UPDATED: { label: 'Atualizada', className: 'chip-live' },
  UPDATING: { label: 'Atualizando', className: 'chip-building' },
  LOGIN_ERROR: { label: 'Reautorização necessária', className: 'chip border-red-500/30 bg-red-500/10 text-red-700' },
  OUTDATED: { label: 'Desatualizada', className: 'chip border-yellow-500/30 bg-yellow-500/10 text-yellow-700' },
  WAITING_USER_INPUT: { label: 'Aguardando confirmação', className: 'chip border-yellow-500/30 bg-yellow-500/10 text-yellow-700' },
  WAITING_USER_ACTION: { label: 'Aguardando ação', className: 'chip border-yellow-500/30 bg-yellow-500/10 text-yellow-700' },
};
