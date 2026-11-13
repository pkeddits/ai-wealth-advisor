import { monthsToTarget } from './simulation.js';

export interface GoalMovementInput {
  kind: 'inicial' | 'aporte' | 'retirada';
  amount: number;
  occurredOn: string;
}

export interface GoalProgress {
  saved: number;
  remaining: number;
  pct: number;
  reached: boolean;
  /**
   * Média mensal líquida dos últimos 3 meses com aportes. Exige aportes em pelo menos dois meses
   * diferentes: um aporte isolado não indica contribuição recorrente. null sem histórico suficiente.
   */
  monthlyPace: number | null;
  /** Meses até o alvo no ritmo atual (sem rendimento); null se não há ritmo positivo. */
  etaMonths: number | null;
  /** Aporte mensal necessário para cumprir a data desejada; null sem data. */
  neededPerMonth: number | null;
  monthsLeft: number | null;
}

const cents = (v: number) => Math.round(v * 100);
const monthsBetween = (from: string, to: string) => {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
};

/** O acumulado vem apenas dos aportes registrados: sobra no mês não é dinheiro guardado. */
export function goalProgress(target: number, movements: GoalMovementInput[], today: string, targetDate?: string | null): GoalProgress {
  const savedCents = movements.reduce((s, m) => s + (m.kind === 'retirada' ? -cents(m.amount) : cents(m.amount)), 0);
  const saved = savedCents / 100;
  const remaining = Math.max((cents(target) - savedCents) / 100, 0);
  const byMonth = new Map<string, number>();
  for (const m of movements) {
    if (m.kind === 'inicial') continue;
    const key = m.occurredOn.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + (m.kind === 'retirada' ? -cents(m.amount) : cents(m.amount)));
  }
  const recent = [...byMonth.entries()].sort(([a], [b]) => b.localeCompare(a)).slice(0, 3);
  const monthlyPace = recent.length >= 2 ? recent.reduce((s, [, v]) => s + v, 0) / recent.length / 100 : null;
  const monthsLeft = targetDate ? Math.max(monthsBetween(today.slice(0, 7), targetDate.slice(0, 7)), 0) : null;
  return {
    saved,
    remaining,
    pct: target > 0 ? Math.min((saved / target) * 100, 100) : 0,
    reached: remaining === 0,
    monthlyPace,
    etaMonths: remaining === 0 ? 0 : monthlyPace && monthlyPace > 0 ? monthsToTarget(saved, monthlyPace, target, 0) : null,
    neededPerMonth: monthsLeft === null ? null : remaining === 0 ? 0 : Math.round((remaining / Math.max(monthsLeft, 1)) * 100) / 100,
    monthsLeft,
  };
}

export interface BudgetUsage {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  pct: number;
  threshold: number;
  status: 'ok' | 'warning' | 'over';
}

/** Compara limites com as despesas do mês já resumidas (sem transferências, faturas, pendentes ou a revisar). */
export function budgetUsage(budgets: { category: string; monthlyLimit: number; alertThreshold: number }[], expensesByCategory: { category: string; amount: number }[]): BudgetUsage[] {
  const spentBy = new Map(expensesByCategory.map((e) => [e.category, e.amount]));
  return budgets.map((b) => {
    const spent = spentBy.get(b.category) ?? 0;
    const pct = (spent / b.monthlyLimit) * 100;
    return {
      category: b.category,
      limit: b.monthlyLimit,
      spent,
      remaining: Math.round((b.monthlyLimit - spent) * 100) / 100,
      pct,
      threshold: b.alertThreshold,
      status: pct > 100 ? 'over' : pct >= b.alertThreshold ? 'warning' : 'ok',
    };
  });
}
