import type { transactionService as apiTransactionService } from '../transaction';
import { getSupabase } from '../../lib/supabase';
import { FeatureUnavailableError } from '../unavailable';
import { dbError } from './errors';
import { TRANSACTION_COLUMNS, toTransaction, type TransactionRow } from './mappers';
import { supabasePortfolioService } from './portfolio';
import { assertHoldings } from './trades';

export const supabaseTransactionService: typeof apiTransactionService = {
  list: async (params) => {
    let query = getSupabase().from('transactions').select(TRANSACTION_COLUMNS).order('traded_on', { ascending: false });
    if (params?.portfolioId) query = query.eq('portfolio_id', params.portfolioId);
    const { data, error } = await query;
    if (error) throw dbError(error, 'Não foi possível carregar as transações.');
    const items = ((data ?? []) as unknown as TransactionRow[]).map(toTransaction);
    return { data: items, total: items.length, page: 1, limit: items.length, totalPages: 1 };
  },

  get: async (id) => {
    const { data, error } = await getSupabase().from('transactions').select(TRANSACTION_COLUMNS).eq('id', id).maybeSingle();
    if (error) throw dbError(error, 'Não foi possível carregar a transação.');
    if (!data) throw new Error('Transação não encontrada.');
    return toTransaction(data as unknown as TransactionRow);
  },

  create: async (data) => supabasePortfolioService.createTransaction(data),

  update: async () => {
    throw new FeatureUnavailableError('Edição de transações');
  },

  delete: async (id) => {
    const target = await supabaseTransactionService.get(id);
    const { data: siblings } = await supabasePortfolioService.getByPortfolio(target.portfolioId);
    const symbols = new Map(siblings.filter((t) => t.asset).map((t) => [t.assetId, t.asset!.symbol]));
    assertHoldings(siblings.filter((t) => t.id !== id), (assetId) => symbols.get(assetId) ?? 'ativo');
    const { data, error } = await getSupabase().from('transactions').delete().eq('id', id).select('id');
    if (error) throw dbError(error, 'Não foi possível excluir a operação.');
    if (!data?.length) throw new Error('Transação não encontrada.');
  },

  bulkImport: async () => {
    throw new FeatureUnavailableError('Importação em lote');
  },

  exportCSV: async () => {
    throw new FeatureUnavailableError('Exportação CSV');
  },
};
