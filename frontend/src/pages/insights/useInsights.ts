import { useCallback, useEffect, useState } from 'react';
import { financeService, categoryMeta } from '../../services/finance';
import { planningService, useCustomCategories } from '../../services/planning';
import { portfolioService } from '../../services';
import { openFinance } from '../../services/openFinance';
import { isSupabaseMode } from '../../config/appMode';
import { summarizeMonth, shiftMonth } from '../../domain/finance';
import { budgetUsage, goalProgress } from '../../domain/planning';
import { computeInsights, type Insight } from '../../domain/insights';
import type { Portfolio } from '../../types';

const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const monthLabel = (m: string) => new Date(`${m}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

/** Insights e alertas por regras, a partir dos mesmos serviços das telas. */
export function useInsights() {
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [error, setError] = useState('');
  const loadCategories = useCustomCategories((s) => s.load);

  const load = useCallback(async () => {
    try {
      await loadCategories();
      const today = localToday();
      const month = today.slice(0, 7);
      const previous = shiftMonth(month, -1);
      const [cur, prev, goals, budgets, portfolios, connections] = await Promise.all([
        financeService.list(month),
        financeService.list(previous),
        planningService.goals(),
        planningService.budgets(),
        portfolioService.list().then((r) => ((r as { data?: Portfolio[] }).data ?? (r as unknown as Portfolio[]))).catch(() => [] as Portfolio[]),
        isSupabaseMode ? openFinance.connections().catch(() => []) : Promise.resolve([]),
      ]);
      const sc = summarizeMonth(cur, month);
      const sp = summarizeMonth(prev, previous);
      const holdings = new Map<string, number>();
      let pendingQuotes = 0;
      for (const p of portfolios) for (const pos of p.positions ?? []) {
        holdings.set(pos.asset?.symbol ?? pos.assetId, (holdings.get(pos.asset?.symbol ?? pos.assetId) ?? 0) + pos.investedValue);
        if (pos.currentValue === null) pendingQuotes++;
      }
      const capital = [...holdings.values()].reduce((s, v) => s + v, 0);
      setInsights(computeInsights({
        month,
        monthLabel: monthLabel(month),
        previousLabel: monthLabel(previous),
        current: { expenses: sc.expenses, income: sc.income, byCategory: sc.expensesByCategory.map((c) => ({ ...c, label: categoryMeta(c.category).label })) },
        previous: prev.length ? { expenses: sp.expenses, byCategory: sp.expensesByCategory } : null,
        budgets: budgetUsage(budgets, sc.expensesByCategory).map((u) => ({ ...u, label: categoryMeta(u.category).label })),
        goals: goals.map((g) => ({ id: g.id, name: g.name, targetDate: g.targetDate, progress: goalProgress(g.targetAmount, g.movements, today, g.targetDate) })),
        holdings: [...holdings.entries()].map(([symbol, v]) => ({ symbol, share: capital > 0 ? (v / capital) * 100 : 0 })).sort((a, b) => b.share - a.share),
        pendingQuotes,
        connections: connections.map((c) => ({ id: c.id, institution: c.institutionName, status: c.status, lastSyncedAt: c.lastSyncedAt, lastSyncError: c.lastSyncError })),
        today,
      }));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível calcular os indicadores.');
      setInsights([]);
    }
  }, [loadCategories]);

  useEffect(() => { load(); }, [load]);
  return { insights, error, reload: load };
}
