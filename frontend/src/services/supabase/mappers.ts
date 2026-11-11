import type { Asset, AssetClass, Portfolio, Position, Transaction, TransactionType } from '../../types';
import { computeHoldings, type TradeInput } from '../../domain/positions';

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

/**
 * Posições abertas pelo custo médio. Sem fonte de cotações, os campos de mercado
 * ficam null e a participação é calculada sobre o custo investido.
 */
export function positionsFrom(portfolioId: string, transactions: Transaction[]): Position[] {
  const assets = new Map(transactions.filter((t) => t.asset).map((t) => [t.assetId, t.asset!]));
  const holdings = computeHoldings(transactions.map(toTrade));
  const invested = holdings.reduce((sum, h) => sum + h.investedValue, 0);
  const updatedAt = transactions.reduce((latest, t) => (t.updatedAt > latest ? t.updatedAt : latest), '');
  return holdings
    .map((h) => ({
      id: `${portfolioId}:${h.assetId}`,
      portfolioId,
      assetId: h.assetId,
      asset: assets.get(h.assetId),
      quantity: h.quantity,
      averagePrice: h.averagePrice,
      currentPrice: null,
      currentValue: null,
      investedValue: h.investedValue,
      unrealizedGain: null,
      unrealizedGainPct: null,
      allocation: invested > 0 ? (h.investedValue / invested) * 100 : 0,
      updatedAt,
    }))
    .sort((a, b) => b.investedValue - a.investedValue);
}

export function toPortfolio(row: PortfolioRow, transactions: Transaction[]): Portfolio {
  const positions = positionsFrom(row.id, transactions);
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description ?? undefined,
    riskProfile: row.risk_profile,
    totalValue: null,
    totalInvested: positions.reduce((sum, p) => sum + p.investedValue, 0),
    totalReturn: null,
    totalReturnPct: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    positions,
  };
}
