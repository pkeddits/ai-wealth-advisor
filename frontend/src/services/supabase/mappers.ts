import type { Asset, AssetClass, Portfolio, Position, Transaction, TransactionType } from '../../types';
import { computeHoldings, computeRealized, type TradeInput } from '../../domain/positions';
import type { QuoteResult } from '../quotes';

export interface PortfolioRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  risk_profile: Portfolio['riskProfile'];
  created_at: string;
  updated_at: string;
}

export interface AssetRow {
  id: string;
  symbol: string;
  name: string;
  asset_class: AssetClass;
  sector: string | null;
  exchange: string | null;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransactionRow {
  id: string;
  portfolio_id: string;
  asset_id: string;
  type: TransactionType;
  quantity: number | string;
  price: number | string;
  fees: number | string;
  traded_on: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  asset?: AssetRow | null;
}

export const ASSET_COLUMNS = 'id, symbol, name, asset_class, sector, exchange, currency, is_active, created_at, updated_at';
export const TRANSACTION_COLUMNS = `id, portfolio_id, asset_id, type, quantity, price, fees, traded_on, notes, created_at, updated_at, asset:assets(${ASSET_COLUMNS})`;

export function toAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    class: row.asset_class,
    sector: row.sector ?? undefined,
    country: 'BR',
    exchange: row.exchange ?? '',
    currency: row.currency,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toTransaction(row: TransactionRow): Transaction {
  const quantity = Number(row.quantity);
  const price = Number(row.price);
  const fees = Number(row.fees);
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    assetId: row.asset_id,
    asset: row.asset ? toAsset(row.asset) : undefined,
    type: row.type,
    quantity,
    price,
    fees,
    total: quantity * price + (row.type === 'compra' ? fees : -fees),
    date: row.traded_on,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toTrade(t: Transaction): TradeInput {
  return { assetId: t.assetId, type: t.type as TradeInput['type'], quantity: t.quantity, price: t.price, fees: t.fees, date: t.date, createdAt: t.createdAt };
}

export type PriceBook = Map<string, QuoteResult>;

export function symbolsOf(transactions: Transaction[]): string[] {
  return [...new Set(transactions.map((t) => t.asset?.symbol).filter((s): s is string => Boolean(s)))];
}

/**
 * Posições abertas pelo custo médio, com valores de mercado quando há cotação válida.
 * Sem cotação, os campos de mercado ficam null. A participação usa o valor de mercado só
 * quando todas as posições têm preço; caso contrário, usa o custo investido.
 */
export function positionsFrom(portfolioId: string, transactions: Transaction[], prices: PriceBook = new Map()): Position[] {
  const assets = new Map(transactions.filter((t) => t.asset).map((t) => [t.assetId, t.asset!]));
  const holdings = computeHoldings(transactions.map(toTrade));
  const updatedAt = transactions.reduce((latest, t) => (t.updatedAt > latest ? t.updatedAt : latest), '');
  const positions: Position[] = holdings.map((h) => {
    const asset = assets.get(h.assetId);
    const quote = asset ? prices.get(asset.symbol) : undefined;
    const price = quote?.status === 'ok' ? quote.price : null;
    const currentValue = price === null ? null : h.quantity * price;
    return {
      id: `${portfolioId}:${h.assetId}`,
      portfolioId,
      assetId: h.assetId,
      asset,
      quantity: h.quantity,
      averagePrice: h.averagePrice,
      currentPrice: price,
      currentValue,
      investedValue: h.investedValue,
      unrealizedGain: currentValue === null ? null : currentValue - h.investedValue,
      unrealizedGainPct: currentValue === null || h.investedValue <= 0 ? null : ((currentValue - h.investedValue) / h.investedValue) * 100,
      quotedAt: quote?.status === 'ok' ? quote.quotedAt : null,
      allocation: 0,
      updatedAt,
    };
  });
  const allPriced = positions.every((p) => p.currentValue !== null);
  const base = positions.reduce((sum, p) => sum + (allPriced ? p.currentValue ?? 0 : p.investedValue), 0);
  for (const p of positions) p.allocation = base > 0 ? ((allPriced ? p.currentValue ?? 0 : p.investedValue) / base) * 100 : 0;
  return positions.sort((a, b) => (b.currentValue ?? b.investedValue) - (a.currentValue ?? a.investedValue));
}

export function toPortfolio(row: PortfolioRow, transactions: Transaction[], prices?: PriceBook): Portfolio {
  const positions = positionsFrom(row.id, transactions, prices);
  const totalInvested = positions.reduce((sum, p) => sum + p.investedValue, 0);
  const pendingQuotes = positions.filter((p) => p.currentValue === null).length;
  const totalValue = pendingQuotes ? null : positions.reduce((sum, p) => sum + (p.currentValue ?? 0), 0);
  const totalReturn = totalValue === null ? null : totalValue - totalInvested;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description ?? undefined,
    riskProfile: row.risk_profile,
    totalValue,
    totalInvested,
    totalReturn,
    totalReturnPct: totalReturn === null || totalInvested <= 0 ? null : (totalReturn / totalInvested) * 100,
    realizedGain: computeRealized(transactions.map(toTrade)),
    pendingQuotes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    positions,
  };
}
