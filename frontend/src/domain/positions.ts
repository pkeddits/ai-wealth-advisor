/**
 * Cálculos determinísticos de carteira (sem acesso a dados, sem efeitos colaterais).
 *
 * Método: custo médio ponderado.
 * - Compra: custo += quantidade * preço + taxas; preço médio = custo / quantidade.
 * - Venda: reduz a quantidade e o custo pelo preço médio atual (preço médio não muda).
 *   Taxas da venda e o lucro realizado ainda não são contabilizados.
 *
 * Estas funções serão reutilizadas quando os dados vierem do banco real.
 */

export type TradeType = 'compra' | 'venda';

export interface TradeInput {
  assetId: string;
  type: TradeType;
  quantity: number;
  price: number;
  fees: number;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO, usado como desempate na mesma data
}

export interface Holding {
  assetId: string;
  quantity: number;
  averagePrice: number;
  investedValue: number;
}

export interface ValuedHolding extends Holding {
  currentPrice: number;
  currentValue: number;
  unrealizedGain: number;
  unrealizedGainPct: number; // em %, ex.: 12.5
  allocation: number; // em %, ex.: 30
}

export class OversellError extends Error {
  constructor(public assetId: string, public available: number, public requested: number, public date: string) {
    super(`Venda de ${requested} maior que a quantidade em carteira (${available} disponível em ${date}).`);
    this.name = 'OversellError';
  }
}

const EPSILON = 1e-9;

function byChronology(a: TradeInput, b: TradeInput) {
  return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
}

/** Consolida transações em posições abertas. Lança OversellError se alguma venda exceder o saldo. */
export function computeHoldings(trades: TradeInput[]): Holding[] {
  const state = new Map<string, { quantity: number; cost: number }>();

  for (const t of [...trades].sort(byChronology)) {
    const s = state.get(t.assetId) ?? { quantity: 0, cost: 0 };
    if (t.type === 'compra') {
      s.quantity += t.quantity;
      s.cost += t.quantity * t.price + t.fees;
    } else {
      if (t.quantity > s.quantity + EPSILON) {
        throw new OversellError(t.assetId, s.quantity, t.quantity, t.date);
      }
      const avg = s.quantity > 0 ? s.cost / s.quantity : 0;
      s.quantity -= t.quantity;
      s.cost -= avg * t.quantity;
      if (s.quantity < EPSILON) { s.quantity = 0; s.cost = 0; }
    }
    state.set(t.assetId, s);
  }

  return [...state.entries()]
    .filter(([, s]) => s.quantity > EPSILON)
    .map(([assetId, s]) => ({
      assetId,
      quantity: s.quantity,
      averagePrice: s.cost / s.quantity,
      investedValue: s.cost,
    }));
}

/** Aplica preços atuais e calcula valor, ganho não realizado e alocação. */
export function valueHoldings(holdings: Holding[], priceOf: (assetId: string) => number): ValuedHolding[] {
  const valued = holdings.map((h) => {
    const currentPrice = priceOf(h.assetId);
    const currentValue = h.quantity * currentPrice;
    const unrealizedGain = currentValue - h.investedValue;
    return {
      ...h,
      currentPrice,
      currentValue,
      unrealizedGain,
      unrealizedGainPct: h.investedValue > 0 ? (unrealizedGain / h.investedValue) * 100 : 0,
      allocation: 0,
    };
  });
  const total = valued.reduce((sum, v) => sum + v.currentValue, 0);
  return valued.map((v) => ({ ...v, allocation: total > 0 ? (v.currentValue / total) * 100 : 0 }));
}

export interface PortfolioTotals {
  totalValue: number;
  totalInvested: number;
  totalReturn: number;
  totalReturnPct: number; // em %
}

export function summarize(valued: ValuedHolding[]): PortfolioTotals {
  const totalValue = valued.reduce((s, v) => s + v.currentValue, 0);
  const totalInvested = valued.reduce((s, v) => s + v.investedValue, 0);
  const totalReturn = totalValue - totalInvested;
  return {
    totalValue,
    totalInvested,
    totalReturn,
    totalReturnPct: totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0,
  };
}
