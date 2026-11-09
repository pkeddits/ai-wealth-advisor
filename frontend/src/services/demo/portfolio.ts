import type { portfolioService as apiPortfolioService } from '../portfolio';
import { loadState, saveState, newId, DemoUnavailableError } from './storage';
import { buildPortfolio, paginate, positionsOf, transactionsOf, recordTrade } from './core';

/** Mesmo formato de services/portfolio.ts, com dados locais. */
export const demoPortfolioService: typeof apiPortfolioService = {
  list: async () => {
    const state = loadState();
    const portfolios = [...state.portfolios]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((p) => buildPortfolio(state, p.id));
    return paginate(portfolios);
  },

  get: async (id) => buildPortfolio(loadState(), id),

  create: async (data) => {
    const name = data.name?.trim();
    if (!name) throw new Error('Nome é obrigatório.');
    if (name.length > 100) throw new Error('Nome deve ter no máximo 100 caracteres.');
    const state = loadState();
    const now = new Date().toISOString();
    const record = {
      id: newId(),
      name,
      description: data.description?.trim() || undefined,
      riskProfile: data.riskProfile ?? 'moderado',
      createdAt: now,
      updatedAt: now,
    };
    state.portfolios.push(record);
    saveState(state);
    return buildPortfolio(state, record.id);
  },

  update: async (id, data) => {
    const state = loadState();
    const record = state.portfolios.find((p) => p.id === id);
    if (!record) throw new Error('Carteira não encontrada.');
    if (data.name !== undefined) {
      if (!data.name.trim()) throw new Error('Nome é obrigatório.');
      record.name = data.name.trim();
    }
    if (data.description !== undefined) record.description = data.description.trim() || undefined;
    if (data.riskProfile !== undefined) record.riskProfile = data.riskProfile;
    record.updatedAt = new Date().toISOString();
    saveState(state);
    return buildPortfolio(state, id);
  },

  delete: async (id) => {
    const state = loadState();
    state.portfolios = state.portfolios.filter((p) => p.id !== id);
    state.transactions = state.transactions.filter((t) => t.portfolioId !== id);
    saveState(state);
  },

  getSummary: async (id) => {
    const { positions, ...summary } = buildPortfolio(loadState(), id);
    return summary;
  },

  getPositions: async (id) => positionsOf(loadState(), id),

  getTransactions: async (id) => paginate(transactionsOf(loadState(), id)),

  getPerformance: async () => {
    throw new DemoUnavailableError('Histórico de performance');
  },

  getAllocation: async (id) => {
    const allocation: Record<string, number> = {};
    for (const p of positionsOf(loadState(), id)) {
      const cls = p.asset?.class ?? 'outros';
      allocation[cls] = (allocation[cls] ?? 0) + p.allocation;
    }
    return allocation;
  },

  getRebalanceSuggestions: async () => {
    throw new DemoUnavailableError('Rebalanceamento');
  },

  createTransaction: async (data) => recordTrade(data),

  getByPortfolio: async (portfolioId) => paginate(transactionsOf(loadState(), portfolioId)),
};
