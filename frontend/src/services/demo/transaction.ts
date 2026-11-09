import type { transactionService as apiTransactionService } from '../transaction';
import { loadState, saveState, DemoUnavailableError } from './storage';
import { paginate, recordTrade, transactionsOf } from './core';
import { findDemoAsset } from './catalog';
import { computeHoldings } from '../../domain/positions';

export const demoTransactionService: typeof apiTransactionService = {
  list: async (params) => {
    const state = loadState();
    const ids = params?.portfolioId ? [params.portfolioId] : state.portfolios.map((p) => p.id);
    return paginate(ids.flatMap((id) => transactionsOf(state, id)));
  },

  get: async (id) => {
    const tx = loadState().transactions.find((t) => t.id === id);
    if (!tx) throw new Error('Transação não encontrada.');
    return { ...tx, asset: findDemoAsset(tx.assetId) };
  },

  create: async (data) => recordTrade(data),

  update: async () => {
    throw new DemoUnavailableError('Edição de transações');
  },

  delete: async (id) => {
    const state = loadState();
    const tx = state.transactions.find((t) => t.id === id);
    if (!tx) return;
    const remaining = state.transactions.filter((t) => t.id !== id);
    // Impede remover uma compra que sustenta vendas posteriores.
    computeHoldings(remaining.filter((t) => t.portfolioId === tx.portfolioId));
    state.transactions = remaining;
    saveState(state);
  },

  bulkImport: async () => {
    throw new DemoUnavailableError('Importação em lote');
  },

  exportCSV: async () => {
    throw new DemoUnavailableError('Exportação CSV');
  },
};
