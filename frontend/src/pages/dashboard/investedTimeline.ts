import { computeHoldings, type TradeInput } from '../../domain/positions';
import type { Transaction } from '../../types';
import type { TimelinePoint } from '../../components/charts';

/**
 * Custo das posições abertas ao final de cada data com operações, somando todas
 * as carteiras. Usa a mesma regra de custo médio de domain/positions.
 */
export function buildInvestedTimeline(transactions: Transaction[]): TimelinePoint[] {
  const byPortfolio = new Map<string, TradeInput[]>();
  for (const t of transactions) {
    if (t.type !== 'compra' && t.type !== 'venda') continue;
    const trade: TradeInput = {
      assetId: t.assetId,
      type: t.type,
      quantity: Number(t.quantity),
      price: Number(t.price),
      fees: Number(t.fees ?? 0),
      date: t.date.slice(0, 10),
      createdAt: t.createdAt ?? t.date,
    };
    byPortfolio.set(t.portfolioId, [...(byPortfolio.get(t.portfolioId) ?? []), trade]);
  }

  const dates = [...new Set(transactions.map((t) => t.date.slice(0, 10)))].sort();
  return dates.map((date) => {
    let invested = 0;
    for (const trades of byPortfolio.values()) {
      const upToDate = trades.filter((t) => t.date <= date);
      invested += computeHoldings(upToDate).reduce((sum, h) => sum + h.investedValue, 0);
    }
    return { date, value: invested };
  });
}
