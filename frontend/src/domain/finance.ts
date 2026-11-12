export type EntryKind = 'receita' | 'despesa';

export interface EntryInput {
  kind: EntryKind;
  amount: number;
  category: string;
  occurredOn: string;
  status?: 'posted' | 'pending';
  /** regular: receita/despesa; refund: estorno (abate despesa); demais não entram nos totais. */
  flow?: 'regular' | 'transfer' | 'investment' | 'card_payment' | 'refund';
  needsReview?: boolean;
}

export interface MonthSummary {
  income: number;
  expenses: number;
  net: number;
  expensesByCategory: { category: string; amount: number }[];
  byDay: { day: string; income: number; expenses: number }[];
  /** Fora dos totais: pendentes, a revisar, transferências, investimentos e pagamentos de fatura. */
  pending: number;
  review: number;
  neutral: number;
}

/** Limites [início, fim) de um mês no formato YYYY-MM. */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  return { from: `${month}-01`, to: `${next}-01` };
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

/** Totais do período. O saldo líquido é receitas menos despesas, não o saldo bancário. */
export function summarizeMonth(entries: EntryInput[], month: string): MonthSummary {
  const { from, to } = monthRange(month);
  const inMonth = entries.filter((e) => e.occurredOn >= from && e.occurredOn < to);
  const cents = (v: number) => Math.round(v * 100);
  let income = 0;
  let expenses = 0;
  const categories = new Map<string, number>();
  const days = new Map<string, { income: number; expenses: number }>();
  let pending = 0;
  let review = 0;
  let neutral = 0;
  for (const e of inMonth) {
    const value = cents(e.amount);
    const flow = e.flow ?? 'regular';
    if (e.status === 'pending') { pending++; continue; }
    if (e.needsReview) { review++; continue; }
    if (flow !== 'regular' && flow !== 'refund') { neutral++; continue; }
    const day = days.get(e.occurredOn) ?? { income: 0, expenses: 0 };
    if (flow === 'refund') {
      expenses -= value;
      day.expenses -= value;
      categories.set(e.category, (categories.get(e.category) ?? 0) - value);
    } else if (e.kind === 'receita') {
      income += value;
      day.income += value;
    } else {
      expenses += value;
      day.expenses += value;
      categories.set(e.category, (categories.get(e.category) ?? 0) + value);
    }
    days.set(e.occurredOn, day);
  }
  return {
    income: income / 100,
    expenses: expenses / 100,
    net: (income - expenses) / 100,
    expensesByCategory: [...categories.entries()].filter(([, amount]) => amount > 0).map(([category, amount]) => ({ category, amount: amount / 100 })).sort((a, b) => b.amount - a.amount),
    byDay: [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ day, income: v.income / 100, expenses: Math.max(v.expenses, 0) / 100 })),
    pending,
    review,
    neutral,
  };
}
