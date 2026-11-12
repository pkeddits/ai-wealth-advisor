import type { portfolioService as apiPortfolioService } from '../portfolio';
import type { CreatePortfolioRequest, PaginatedResponse, Transaction } from '../../types';
import { getSupabase } from '../../lib/supabase';
import { FeatureUnavailableError } from '../unavailable';
import { dbError } from './errors';
import { TRANSACTION_COLUMNS, toPortfolio, toTransaction, positionsFrom, symbolsOf, type PortfolioRow, type TransactionRow } from './mappers';
import { getQuotes } from '../quotes';
import { assertHoldings, validateTrade } from './trades';

const PORTFOLIO_COLUMNS = 'id, user_id, name, description, risk_profile, created_at, updated_at';

function paginate<T>(items: T[]): PaginatedResponse<T> {
  return { data: items, total: items.length, page: 1, limit: items.length, totalPages: 1 };
}

async function transactionsOf(portfolioIds: string[]): Promise<Transaction[]> {
  if (!portfolioIds.length) return [];
  const { data, error } = await getSupabase()
    .from('transactions')
    .select(TRANSACTION_COLUMNS)
    .in('portfolio_id', portfolioIds)
    .order('traded_on', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw dbError(error, 'Não foi possível carregar as transações.');
  return ((data ?? []) as unknown as TransactionRow[]).map(toTransaction);
}

async function portfolioRow(id: string): Promise<PortfolioRow> {
  const { data, error } = await getSupabase().from('portfolios').select(PORTFOLIO_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw dbError(error, 'Não foi possível carregar a carteira.');
  if (!data) throw new Error('Carteira não encontrada.');
  return data as PortfolioRow;
}

function cleanPortfolioInput(data: Partial<CreatePortfolioRequest>) {
  const patch: Record<string, string | null> = {};
  if (data.name !== undefined) {
    const name = data.name.trim();
    if (!name) throw new Error('Nome é obrigatório.');
    if (name.length > 100) throw new Error('Nome deve ter no máximo 100 caracteres.');
    patch.name = name;
  }
  if (data.description !== undefined) {
    const description = data.description.trim();
    if (description.length > 500) throw new Error('Descrição deve ter no máximo 500 caracteres.');
    patch.description = description || null;
  }
  if (data.riskProfile !== undefined) patch.risk_profile = data.riskProfile;
  return patch;
}

export const supabasePortfolioService: typeof apiPortfolioService = {
  list: async () => {
    const { data, error } = await getSupabase().from('portfolios').select(PORTFOLIO_COLUMNS).order('created_at');
    if (error) throw dbError(error, 'Não foi possível carregar as carteiras.');
    const rows = (data ?? []) as PortfolioRow[];
    const transactions = await transactionsOf(rows.map((r) => r.id));
    const prices = await getQuotes(symbolsOf(transactions));
    return paginate(rows.map((row) => toPortfolio(row, transactions.filter((t) => t.portfolioId === row.id), prices)));
  },

  get: async (id) => {
    const row = await portfolioRow(id);
    const transactions = await transactionsOf([id]);
    return toPortfolio(row, transactions, await getQuotes(symbolsOf(transactions)));
  },

  create: async (data) => {
    const patch = cleanPortfolioInput({ ...data, riskProfile: data.riskProfile ?? 'moderado' });
    if (!patch.name) throw new Error('Nome é obrigatório.');
    const { data: row, error } = await getSupabase().from('portfolios').insert(patch).select(PORTFOLIO_COLUMNS).single();
    if (error || !row) throw dbError(error, 'Não foi possível criar a carteira.');
    return toPortfolio(row as PortfolioRow, []);
  },

  update: async (id, data) => {
    const { data: row, error } = await getSupabase().from('portfolios').update(cleanPortfolioInput(data)).eq('id', id).select(PORTFOLIO_COLUMNS).maybeSingle();
    if (error) throw dbError(error, 'Não foi possível salvar a carteira.');
    if (!row) throw new Error('Carteira não encontrada.');
    const transactions = await transactionsOf([id]);
    return toPortfolio(row as PortfolioRow, transactions, await getQuotes(symbolsOf(transactions)));
  },

  delete: async (id) => {
    const { data, error } = await getSupabase().from('portfolios').delete().eq('id', id).select('id');
    if (error) throw dbError(error, 'Não foi possível excluir a carteira.');
    if (!data?.length) throw new Error('Carteira não encontrada.');
  },

  getSummary: async (id) => {
    const { positions, ...summary } = toPortfolio(await portfolioRow(id), await transactionsOf([id]));
    return summary;
  },

  getPositions: async (id) => {
    const transactions = await transactionsOf([id]);
    return positionsFrom(id, transactions, await getQuotes(symbolsOf(transactions)));
  },

  getTransactions: async (id) => paginate(await transactionsOf([id])),

  getPerformance: async () => {
    throw new FeatureUnavailableError('Histórico de rentabilidade');
  },

  getAllocation: async (id) => {
    const allocation: Record<string, number> = {};
    for (const p of positionsFrom(id, await transactionsOf([id]))) {
      const cls = p.asset?.class ?? 'outros';
      allocation[cls] = (allocation[cls] ?? 0) + p.allocation;
    }
    return allocation;
  },

  getRebalanceSuggestions: async () => {
    throw new FeatureUnavailableError('Rebalanceamento');
  },

  createTransaction: async (input) => {
    const trade = validateTrade(input);
    const existing = await transactionsOf([trade.portfolioId]);
    const now = new Date().toISOString();
    const draft = { ...trade, id: 'novo', total: 0, createdAt: now, updatedAt: now } as Transaction;
    const symbols = new Map(existing.filter((t) => t.asset).map((t) => [t.assetId, t.asset!.symbol]));
    assertHoldings([...existing, draft], (assetId) => symbols.get(assetId) ?? 'ativo');

    const { data, error } = await getSupabase()
      .from('transactions')
      .insert({
        portfolio_id: trade.portfolioId,
        asset_id: trade.assetId,
        type: trade.type,
        quantity: trade.quantity,
        price: trade.price,
        fees: trade.fees,
        traded_on: trade.date,
        notes: trade.notes ?? null,
      })
      .select(TRANSACTION_COLUMNS)
      .single();
    if (error || !data) throw dbError(error, 'Não foi possível registrar a operação.');
    return toTransaction(data as unknown as TransactionRow);
  },

  getByPortfolio: async (portfolioId) => paginate(await transactionsOf([portfolioId])),
};
