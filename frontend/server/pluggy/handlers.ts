import { bearer, failure, HttpError, json, readJson } from '../http';
import { requireUser, type SessionEnv } from '../auth';
import { adminDb, type AdminDb, type AdminEnv } from '../supabaseAdmin';
import { pluggyClient, type PluggyEnv } from './client';
import {
  classifyTransaction,
  normalizeAccount,
  normalizeInvestment,
  normalizeMovement,
  type PluggyAccount,
  type PluggyInvestment,
  type PluggyInvestmentTransaction,
  type PluggyTransaction,
} from './normalize';

export type OpenFinanceEnv = SessionEnv & AdminEnv & PluggyEnv;

interface PluggyItem {
  id: string;
  status: string;
  executionStatus?: string | null;
  clientUserId?: string | null;
  connector?: { name?: string | null; imageUrl?: string | null } | null;
  error?: { code?: string | null; message?: string | null } | null;
}

interface ConnectionRow {
  id: string;
  user_id: string;
  item_id: string;
  status: string;
  last_synced_at: string | null;
  sync_started_at: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SYNC_LOCK_MS = 3 * 60_000;
const MIN_SYNC_INTERVAL_MS = 30_000;
const MAX_TRANSACTION_PAGES = 40;
const MAX_INVESTMENT_PAGES = 10;

const ITEM_MESSAGES: Record<string, string> = {
  LOGIN_ERROR: 'A instituição recusou o acesso. Reconecte para autorizar novamente.',
  OUTDATED: 'A última atualização na instituição falhou. Tente sincronizar de novo ou reconecte.',
  WAITING_USER_INPUT: 'A instituição pede uma confirmação. Reconecte para concluir.',
  WAITING_USER_ACTION: 'A instituição pede uma ação sua. Reconecte para concluir.',
  UPDATING: 'A instituição ainda está enviando os dados. Sincronize de novo em alguns minutos.',
};

async function owned(db: AdminDb, userId: string, connectionId: unknown): Promise<ConnectionRow> {
  if (typeof connectionId !== 'string' || !UUID.test(connectionId)) throw new HttpError(400, 'Conexão inválida.');
  const rows = await db.select<ConnectionRow>(`bank_connections?select=id,user_id,item_id,status,last_synced_at,sync_started_at&id=eq.${connectionId}&user_id=eq.${userId}`);
  if (!rows.length) throw new HttpError(404, 'Conexão não encontrada.');
  return rows[0];
}

export async function handleConnectToken(request: Request, env: OpenFinanceEnv, fetcher: typeof fetch = fetch) {
  try {
    if (request.method !== 'POST') throw new HttpError(405, 'Método não permitido.');
    const userId = await requireUser(bearer(request), env, fetcher);
    const pluggy = pluggyClient(env, fetcher);
    const body = await readJson<{ connectionId?: string }>(request).catch(() => ({} as { connectionId?: string }));
    const payload: { itemId?: string; options: { clientUserId: string; avoidDuplicates: boolean } } = { options: { clientUserId: userId, avoidDuplicates: true } };
    if (body.connectionId) payload.itemId = (await owned(adminDb(env, fetcher), userId, body.connectionId)).item_id;
    const token = await pluggy.post<{ accessToken?: string }>('/connect_token', payload);
    if (!token?.accessToken) throw new HttpError(502, 'Resposta inesperada do provedor de Open Finance.');
    return json({ accessToken: token.accessToken, itemId: payload.itemId ?? null });
  } catch (error) {
    return failure(error);
  }
}

/** Vincula ao usuário o Item criado no widget, depois de conferir na Pluggy que ele pertence a esse usuário. */
export async function handleRegisterItem(request: Request, env: OpenFinanceEnv, fetcher: typeof fetch = fetch) {
  try {
    if (request.method !== 'POST') throw new HttpError(405, 'Método não permitido.');
    const userId = await requireUser(bearer(request), env, fetcher);
    const { itemId } = await readJson<{ itemId?: string }>(request);
    if (typeof itemId !== 'string' || !UUID.test(itemId)) throw new HttpError(400, 'Conexão inválida.');
    const db = adminDb(env, fetcher);
    const item = await pluggyClient(env, fetcher).get<PluggyItem>(`/items/${itemId}`);
    if (!item || item.clientUserId !== userId) throw new HttpError(403, 'Esta conexão não pertence à sua conta.');

    const existing = await db.select<ConnectionRow>(`bank_connections?select=id,user_id&provider=eq.pluggy&item_id=eq.${itemId}`);
    if (existing.length && existing[0].user_id !== userId) throw new HttpError(403, 'Esta conexão não pertence à sua conta.');

    const row = {
      user_id: userId,
      provider: 'pluggy',
      item_id: itemId,
      institution_name: (item.connector?.name ?? 'Instituição').slice(0, 120),
      institution_logo: item.connector?.imageUrl?.startsWith('https://') ? item.connector.imageUrl : null,
      status: item.status.slice(0, 40),
      status_message: ITEM_MESSAGES[item.status] ?? null,
    };
    const saved = existing.length
      ? await db.update<{ id: string }>(`bank_connections?id=eq.${existing[0].id}&user_id=eq.${userId}`, row)
      : await db.insert<{ id: string }>('bank_connections', row);
    return json({ connectionId: saved[0].id, status: item.status });
  } catch (error) {
    return failure(error);
  }
}

async function pagedTransactions(pluggy: ReturnType<typeof pluggyClient>, accountId: string, dateFrom: string | null) {
  const all: PluggyTransaction[] = [];
  let query: string | null = `?accountId=${accountId}${dateFrom ? `&dateFrom=${dateFrom}` : ''}`;
  for (let page = 0; query && page < MAX_TRANSACTION_PAGES; page++) {
    const res: { results?: PluggyTransaction[]; next?: string | null } = await pluggy.get(`/v2/transactions${query}`);
    all.push(...(res.results ?? []));
    query = res.next ?? null;
  }
  return all;
}

async function pagedList<T>(pluggy: ReturnType<typeof pluggyClient>, path: string, maxPages: number) {
  const all: T[] = [];
  const sep = path.includes('?') ? '&' : '?';
  for (let page = 1; page <= maxPages; page++) {
    const res: { results?: T[]; totalPages?: number } = await pluggy.get(`${path}${sep}page=${page}`);
    all.push(...(res.results ?? []));
    if (!res.totalPages || page >= res.totalPages) break;
  }
  return all;
}

interface ExistingEntry {
  id: string;
  external_id: string;
  user_classified: boolean;
}

export async function syncConnection(db: AdminDb, pluggy: ReturnType<typeof pluggyClient>, userId: string, connection: ConnectionRow) {
  const item = await pluggy.get<PluggyItem>(`/items/${connection.item_id}`);
  if (item.clientUserId !== userId) throw new HttpError(403, 'Esta conexão não pertence à sua conta.');

  const accounts = ((await pluggy.get<{ results?: PluggyAccount[] }>(`/accounts?itemId=${connection.item_id}`)).results ?? []).map(normalizeAccount);
  const savedAccounts = accounts.length
    ? await db.insert<{ id: string; external_id: string; kind: 'BANK' | 'CREDIT' }>(
        'bank_accounts',
        accounts.map((a) => ({ ...a, user_id: userId, connection_id: connection.id, balance_reported_at: new Date().toISOString() })),
        'connection_id,external_id',
      )
    : [];
  const hasCard = savedAccounts.some((a) => a.kind === 'CREDIT');
  const now = new Date().toISOString();
  const dateFrom = connection.last_synced_at ? new Date(Date.parse(connection.last_synced_at) - 60 * 86400_000).toISOString().slice(0, 10) : null;

  let created = 0;
  let updated = 0;
  let review = 0;
  for (const account of savedAccounts) {
    const entries = (await pagedTransactions(pluggy, account.external_id, dateFrom))
      .map((t) => classifyTransaction(t, account.kind, hasCard))
      .filter((e): e is NonNullable<typeof e> => e !== null);
    if (!entries.length) continue;
    const existing = new Map<string, ExistingEntry>();
    for (let i = 0; i < entries.length; i += 200) {
      const ids = entries.slice(i, i + 200).map((e) => `"${e.external_id.replace(/"/g, '')}"`).join(',');
      for (const row of await db.select<ExistingEntry>(`finance_entries?select=id,external_id,user_classified&user_id=eq.${userId}&account_id=eq.${account.id}&external_id=in.(${ids})`)) {
        existing.set(row.external_id, row);
      }
    }
    const fresh = [];
    for (const e of entries) {
      if (e.needs_review) review++;
      const current = existing.get(e.external_id);
      if (!current) {
        fresh.push({ ...e, user_id: userId, account_id: account.id, source: 'open_finance', synced_at: now });
        continue;
      }
      const patch = current.user_classified
        ? { amount: e.amount, kind: e.kind, occurred_on: e.occurred_on, status: e.status, description: e.description, synced_at: now }
        : { ...e, synced_at: now };
      await db.update(`finance_entries?id=eq.${current.id}&user_id=eq.${userId}`, patch);
      updated++;
    }
    for (let i = 0; i < fresh.length; i += 500) await db.insert('finance_entries', fresh.slice(i, i + 500));
    created += fresh.length;
  }

  const investments = (await pagedList<PluggyInvestment>(pluggy, `/investments?itemId=${connection.item_id}`, MAX_INVESTMENT_PAGES)).map(normalizeInvestment);
  let movements = 0;
  if (investments.length) {
    const saved = await db.insert<{ id: string; external_id: string; status: string | null }>(
      'investment_positions',
      investments.map((p) => ({ ...p, user_id: userId, connection_id: connection.id })),
      'connection_id,external_id',
    );
    for (const position of saved) {
      if (position.status === 'TOTAL_WITHDRAWAL') continue;
      const history = (await pagedList<PluggyInvestmentTransaction>(pluggy, `/investments/${position.external_id}/transactions`, MAX_INVESTMENT_PAGES)).map(normalizeMovement);
      if (!history.length) continue;
      await db.insert('investment_movements', history.map((m) => ({ ...m, user_id: userId, position_id: position.id })), 'position_id,external_id');
      movements += history.length;
    }
  }

  const products = [
    savedAccounts.length ? 'contas' : null,
    created + updated ? 'transacoes' : null,
    investments.length ? 'investimentos' : null,
  ].filter((p): p is string => p !== null);
  await db.update(`bank_connections?id=eq.${connection.id}&user_id=eq.${userId}`, {
    status: item.status.slice(0, 40),
    status_message: ITEM_MESSAGES[item.status] ?? null,
    institution_name: (item.connector?.name ?? 'Instituição').slice(0, 120),
    products,
    last_synced_at: now,
    last_sync_error: null,
    sync_started_at: null,
  });
  return { status: item.status, accounts: savedAccounts.length, created, updated, review, investments: investments.length, movements };
}

export async function handleSync(request: Request, env: OpenFinanceEnv, fetcher: typeof fetch = fetch) {
  let release: (() => Promise<unknown>) | null = null;
  try {
    if (request.method !== 'POST') throw new HttpError(405, 'Método não permitido.');
    const userId = await requireUser(bearer(request), env, fetcher);
    const db = adminDb(env, fetcher);
    const pluggy = pluggyClient(env, fetcher);
    const connection = await owned(db, userId, (await readJson<{ connectionId?: string }>(request)).connectionId);

    if (connection.last_synced_at && Date.now() - Date.parse(connection.last_synced_at) < MIN_SYNC_INTERVAL_MS) {
      throw new HttpError(429, 'Sincronização feita agora há pouco. Aguarde alguns segundos.');
    }
    const lock = { sync_started_at: new Date().toISOString() };
    const scope = `bank_connections?id=eq.${connection.id}&user_id=eq.${userId}`;
    let locked = await db.update<{ id: string }>(`${scope}&sync_started_at=is.null`, lock);
    if (!locked.length) {
      const staleLock = encodeURIComponent(new Date(Date.now() - SYNC_LOCK_MS).toISOString());
      locked = await db.update<{ id: string }>(`${scope}&sync_started_at=lt.${staleLock}`, lock);
    }
    if (!locked.length) throw new HttpError(409, 'Já existe uma sincronização em andamento.');
    release = () => db.update(`bank_connections?id=eq.${connection.id}&user_id=eq.${userId}`, { sync_started_at: null });

    try {
      const result = await syncConnection(db, pluggy, userId, connection);
      release = null;
      return json(result);
    } catch (error) {
      const message = error instanceof HttpError ? error.message : 'Falha inesperada durante a sincronização.';
      await db.update(`bank_connections?id=eq.${connection.id}&user_id=eq.${userId}`, { last_sync_error: message.slice(0, 300), sync_started_at: null });
      release = null;
      throw error;
    }
  } catch (error) {
    if (release) await release().catch(() => undefined);
    return failure(error);
  }
}

export async function handleDisconnect(request: Request, env: OpenFinanceEnv, fetcher: typeof fetch = fetch) {
  try {
    if (request.method !== 'POST') throw new HttpError(405, 'Método não permitido.');
    const userId = await requireUser(bearer(request), env, fetcher);
    const db = adminDb(env, fetcher);
    const connection = await owned(db, userId, (await readJson<{ connectionId?: string }>(request)).connectionId);
    try {
      await pluggyClient(env, fetcher).remove(`/items/${connection.item_id}`);
    } catch (error) {
      if (!(error instanceof HttpError && error.status === 404)) throw error;
    }
    await db.remove(`bank_connections?id=eq.${connection.id}&user_id=eq.${userId}`);
    return json({ disconnected: true });
  } catch (error) {
    return failure(error);
  }
}
