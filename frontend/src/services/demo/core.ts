/**
 * Regras da demonstração sobre o estado local: monta carteiras, posições e
 * valida transações usando os cálculos puros de ../../domain/positions.
 */
import type { Portfolio, Position, Transaction, PaginatedResponse } from '../../types';
import { computeHoldings, computeRealized, valueHoldings, summarize, OversellError, type TradeInput } from '../../domain/positions';
import { findDemoAsset, demoPriceOf } from './catalog';
import { loadState, saveState, newId, type DemoState } from './storage';

export function paginate<T>(items: T[]): PaginatedResponse<T> {
  return { data: items, total: items.length, page: 1, limit: items.length, totalPages: 1 };
}

function tradesOf(state: DemoState, portfolioId: string): TradeInput[] {
  return state.transactions.filter((t) => t.portfolioId === portfolioId);
}

export function positionsOf(state: DemoState, portfolioId: string): Position[] {
  const now = new Date().toISOString();
  return valueHoldings(computeHoldings(tradesOf(state, portfolioId)), demoPriceOf)
    .map((v) => ({
      id: `${portfolioId}:${v.assetId}`,
      portfolioId,
      assetId: v.assetId,
      asset: findDemoAsset(v.assetId),
      quantity: v.quantity,
      averagePrice: v.averagePrice,
      currentPrice: v.currentPrice,
      currentValue: v.currentValue,
      investedValue: v.investedValue,
      unrealizedGain: v.unrealizedGain,
      unrealizedGainPct: v.unrealizedGainPct,
      allocation: v.allocation,
      updatedAt: now,
    }))
    .sort((a, b) => b.currentValue - a.currentValue);
}

export function buildPortfolio(state: DemoState, id: string): Portfolio {
  const record = state.portfolios.find((p) => p.id === id);
  if (!record) throw new Error('Carteira não encontrada.');
  const positions = positionsOf(state, id);
  // No modo demonstração todos os ativos têm preço fictício, então os campos de mercado estão sempre preenchidos.
  const totals = summarize(positions.map((p) => ({ ...p, currentPrice: p.currentPrice!, currentValue: p.currentValue!, unrealizedGain: p.unrealizedGain!, unrealizedGainPct: p.unrealizedGainPct! })));
  return { ...record, userId: 'demo-user', ...totals, realizedGain: computeRealized(tradesOf(state, id)), pendingQuotes: 0, positions };
}

export function transactionsOf(state: DemoState, portfolioId: string): Transaction[] {
  return state.transactions
    .filter((t) => t.portfolioId === portfolioId)
    .map((t) => ({ ...t, asset: findDemoAsset(t.assetId) }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export interface NewTradeData {
  portfolioId?: string;
  assetId?: string;
  type?: string;
  quantity?: number;
  price?: number;
  fees?: number;
  date?: string;
  notes?: string;
}

/** Valida e grava uma transação. Mensagens de erro são exibidas diretamente ao usuário. */
export function recordTrade(data: NewTradeData): Transaction {
  const state = loadState();
  if (!data.portfolioId || !state.portfolios.some((p) => p.id === data.portfolioId)) throw new Error('Carteira não encontrada.');
  if (!data.assetId || !findDemoAsset(data.assetId)) throw new Error('Selecione um ativo.');
  if (data.type !== 'compra' && data.type !== 'venda') throw new Error('Tipo deve ser compra ou venda.');
  const quantity = Number(data.quantity);
  const price = Number(data.price);
  const fees = Number(data.fees ?? 0);
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Informe uma quantidade maior que zero.');
  if (!Number.isFinite(price) || price <= 0) throw new Error('Informe um preço maior que zero.');
  if (!Number.isFinite(fees) || fees < 0) throw new Error('Taxas não podem ser negativas.');
  if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) throw new Error('Informe uma data válida.');
  if (data.date > new Date().toISOString().slice(0, 10)) throw new Error('A data não pode estar no futuro.');

  const now = new Date().toISOString();
  const tx: Omit<Transaction, 'asset'> = {
    id: newId(),
    portfolioId: data.portfolioId,
    assetId: data.assetId,
    type: data.type,
    quantity,
    price,
    fees,
    total: quantity * price + (data.type === 'compra' ? fees : -fees),
    date: data.date,
    notes: data.notes,
    createdAt: now,
    updatedAt: now,
  };

  // Garante que nenhuma venda (inclusive a nova) exceda o saldo na sua data.
  try {
    computeHoldings([...tradesOf(state, data.portfolioId), tx]);
  } catch (e) {
    if (e instanceof OversellError) {
      const symbol = findDemoAsset(e.assetId)?.symbol ?? 'ativo';
      throw new Error(`Venda maior que a quantidade de ${symbol} em carteira (${e.available} disponível em ${e.date.split('-').reverse().join('/')}).`);
    }
    throw e;
  }

  state.transactions.push(tx);
  const portfolio = state.portfolios.find((p) => p.id === data.portfolioId)!;
  portfolio.updatedAt = now;
  saveState(state);
  return { ...tx, asset: findDemoAsset(tx.assetId) };
}
