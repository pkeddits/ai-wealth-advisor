import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import clsx from 'clsx';
import { financeService, categoryMeta } from '../services/finance';
import { planningService, useCustomCategories, type Budget, type Goal } from '../services/planning';
import { portfolioService } from '../services';
import { openFinance, INVESTMENT_TYPE_LABELS } from '../services/openFinance';
import { isSupabaseMode } from '../config/appMode';
import { summarizeMonth, shiftMonth, type MonthSummary } from '../domain/finance';
import { budgetUsage } from '../domain/planning';
import { useDisplayFormat } from '../lib/displayFormat';
import { AllocationDonut, SERIES_COLORS, INCOME_COLOR, EXPENSE_COLOR } from '../components/charts';
import type { FinanceEntry, ImportedInvestment, Portfolio } from '../types';

const currentMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const short = (m: string) => new Date(`${m}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

function Panel({ title, note, children, className }: { title: string; note?: string; children: React.ReactNode; className?: string }) {
  return (
    <motion.section className={clsx('panel p-5 sm:p-6', className)} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-[15px] font-semibold">{title}</h2>{note && <p className="text-xs text-dark-500">{note}</p>}</div>
      {children}
    </motion.section>
  );
}

const tooltipStyle = { background: 'rgb(var(--surface-raised))', border: '1px solid rgb(var(--dark-200))', borderRadius: 12 };

export function AnalyticsPage() {
  const fmt = useDisplayFormat();
  const loadCategories = useCustomCategories((s) => s.load);
  const [data, setData] = useState<{ months: { month: string; s: MonthSummary; entries: FinanceEntry[] }[]; goals: Goal[]; budgets: Budget[]; portfolios: Portfolio[]; imported: ImportedInvestment[] } | null>(null);

  useEffect(() => {
    (async () => {
      await loadCategories();
      const months = Array.from({ length: 6 }, (_, i) => shiftMonth(currentMonth(), i - 5));
      const lists = await Promise.all(months.map((m) => financeService.list(m).catch(() => [])));
      const [goals, budgets, portfolios, imported] = await Promise.all([
        planningService.goals().catch(() => []),
        planningService.budgets().catch(() => []),
        portfolioService.list().then((r) => ((r as { data?: Portfolio[] }).data ?? [])).catch(() => []),
        isSupabaseMode ? openFinance.investments().catch(() => []) : Promise.resolve([]),
      ]);
      setData({ months: months.map((m, i) => ({ month: m, entries: lists[i], s: summarizeMonth(lists[i], m) })), goals, budgets, portfolios, imported });
    })();
  }, [loadCategories]);

  if (!data) return <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-72 !rounded-panel" />)}</div>;

  const hasEntries = data.months.some((m) => m.entries.length);
  const monthly = data.months.map((m) => ({ mes: short(m.month), receitas: m.s.income, despesas: m.s.expenses, saldo: m.s.net }));
  const byCategory = new Map<string, number>();
  for (const m of data.months) for (const c of m.s.expensesByCategory) byCategory.set(c.category, (byCategory.get(c.category) ?? 0) + c.amount);
  const slices = [...byCategory.entries()].sort((x, y) => y[1] - x[1]).map(([cat, value], i) => ({ key: cat, label: categoryMeta(cat).label, value, color: SERIES_COLORS[i % SERIES_COLORS.length] }));
  const contributions = data.months.map((m) => ({
    mes: short(m.month),
    aportes: data.goals.flatMap((g) => g.movements).filter((mv) => mv.occurredOn.startsWith(m.month)).reduce((s, mv) => s + (mv.kind === 'retirada' ? -mv.amount : mv.kind === 'aporte' ? mv.amount : 0), 0),
  }));
  const cur = data.months[data.months.length - 1];
  const usage = budgetUsage(data.budgets, cur.s.expensesByCategory);

  const positions = data.portfolios.flatMap((p) => p.positions ?? []);
  const capital = positions.reduce((s, p) => s + p.investedValue, 0);
  const priced = positions.length > 0 && positions.every((p) => p.currentValue !== null);
  const market = priced ? positions.reduce((s, p) => s + (p.currentValue ?? 0), 0) : null;
  const realized = data.portfolios.reduce((s, p) => s + (p.realizedGain ?? 0), 0);
  const bySymbol = new Map<string, number>();
  for (const p of positions) bySymbol.set(p.asset?.symbol ?? p.assetId, (bySymbol.get(p.asset?.symbol ?? p.assetId) ?? 0) + (priced ? p.currentValue ?? 0 : p.investedValue));
  const assetSlices = [...bySymbol.entries()].sort((x, y) => y[1] - x[1]).map(([sym, value], i) => ({ key: sym, label: sym, value, color: SERIES_COLORS[i % SERIES_COLORS.length] }));
  const base = assetSlices.reduce((s, a) => s + a.value, 0);
  const importedTotal = data.imported.reduce((s, i) => s + (i.balance ?? 0), 0);
  const byType = new Map<string, number>();
  for (const i of data.imported) byType.set(i.type, (byType.get(i.type) ?? 0) + (i.balance ?? 0));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-dark-500">Inteligência</p>
        <h1 className="text-display mt-1 text-[2rem] leading-tight sm:text-[2.4rem]">Analytics</h1>
        <p className="mt-1 max-w-3xl text-dark-600">Análises dos últimos 6 meses com base nos lançamentos, metas, orçamentos e carteiras. Investimentos cadastrados e importados ficam separados porque podem representar os mesmos ativos.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Receitas e despesas por mês" note="Sem transferências, aplicações, faturas, pendentes e itens a revisar">
          {hasEntries ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="rgb(var(--dark-200))" strokeDasharray="3 6" />
                  <XAxis dataKey="mes" tick={{ fill: 'rgb(var(--dark-500))', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(v: number) => fmt.money(v)} contentStyle={tooltipStyle} cursor={{ fill: 'rgb(var(--dark-100) / 0.5)' }} />
                  <Legend />
                  <Bar dataKey="receitas" name="Receitas" fill={INCOME_COLOR} radius={[6, 6, 2, 2]} maxBarSize={22} />
                  <Bar dataKey="despesas" name="Despesas" fill={EXPENSE_COLOR} radius={[6, 6, 2, 2]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="py-16 text-center text-sm text-dark-500">Sem movimentações nos últimos 6 meses.</p>}
          {hasEntries && (
            <ul className="mt-3 grid grid-cols-3 gap-2 text-xs sm:grid-cols-6">
              {monthly.map((m) => <li key={m.mes} className="rounded-xl border border-dark-200/60 px-2 py-1.5 text-center"><span className="block text-dark-500">{m.mes}</span><span className={clsx('sensitive font-medium', m.saldo < 0 ? 'text-red-600' : 'text-dark-900')}>{fmt.money(m.saldo)}</span></li>)}
            </ul>
          )}
        </Panel>
        <Panel title="Gastos por categoria" note="Soma dos 6 meses">
          {slices.length ? <AllocationDonut slices={slices} formatValue={fmt.money} size={170} stacked /> : <p className="py-16 text-center text-sm text-dark-500">Sem despesas no período.</p>}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Orçamento planejado e realizado" note={`Mês atual`}>
          {usage.length ? (
            <ul className="space-y-3">
              {usage.map((u) => (
                <li key={u.category}>
                  <div className="flex justify-between text-sm"><span className="text-dark-800">{categoryMeta(u.category).label}</span><span className="sensitive text-dark-500">{fmt.money(u.spent)} / {fmt.money(u.limit)}</span></div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-dark-100"><div className={clsx('h-full rounded-full', u.status === 'over' ? 'bg-red-500' : u.status === 'warning' ? 'bg-yellow-500' : 'bg-brand')} style={{ width: `${Math.min(u.pct, 100)}%` }} /></div>
                </li>
              ))}
            </ul>
          ) : <p className="py-10 text-center text-sm text-dark-500">Nenhum orçamento definido.</p>}
        </Panel>
        <Panel title="Aportes líquidos em metas" note="Aportes menos retiradas registrados">
          {data.goals.length ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={contributions} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="rgb(var(--dark-200))" strokeDasharray="3 6" />
                  <XAxis dataKey="mes" tick={{ fill: 'rgb(var(--dark-500))', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(v: number) => fmt.money(v)} contentStyle={tooltipStyle} cursor={{ fill: 'rgb(var(--dark-100) / 0.5)' }} />
                  <Bar dataKey="aportes" name="Aportes" fill="rgb(var(--violet))" radius={[6, 6, 2, 2]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="py-10 text-center text-sm text-dark-500">Nenhuma meta cadastrada.</p>}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Carteiras cadastradas" note={priced ? 'Distribuição pelo valor de mercado' : 'Distribuição pelo custo (cotação pendente)'}>
          {positions.length ? (
            <>
              <dl className="mb-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div><dt className="text-dark-500">Capital aplicado</dt><dd className="sensitive font-medium text-dark-900">{fmt.money(capital)}</dd></div>
                <div><dt className="text-dark-500">Valor de mercado</dt><dd className="sensitive font-medium text-dark-900">{market === null ? <span className="text-dark-500">pendente</span> : fmt.money(market)}</dd></div>
                <div><dt className="text-dark-500">Não realizado</dt><dd className="sensitive font-medium">{market === null ? <span className="text-dark-500">—</span> : <span className={market - capital >= 0 ? 'text-green-600' : 'text-red-600'}>{fmt.signedMoney(market - capital)}</span>}</dd></div>
                <div><dt className="text-dark-500">Realizado</dt><dd className={clsx('sensitive font-medium', realized >= 0 ? 'text-green-600' : 'text-red-600')}>{fmt.signedMoney(realized)}</dd></div>
              </dl>
              <AllocationDonut slices={assetSlices} formatValue={fmt.money} size={160} />
              {assetSlices[0] && <p className="mt-3 text-xs text-dark-500">Maior posição: {assetSlices[0].label}, {Math.round((assetSlices[0].value / base) * 100)}% da carteira.</p>}
            </>
          ) : <p className="py-10 text-center text-sm text-dark-500">Nenhuma posição cadastrada.</p>}
        </Panel>
        <Panel title="Investimentos importados" note="Informado pelas instituições; não somado às carteiras">
          {data.imported.length ? (
            <>
              <p className="text-sm text-dark-500">Valor informado</p>
              <p className="sensitive text-2xl font-semibold tracking-tight text-dark-900">{fmt.money(importedTotal)}</p>
              <ul className="mt-4 space-y-2">
                {[...byType.entries()].map(([t, v]) => <li key={t} className="flex justify-between text-sm"><span className="text-dark-700">{INVESTMENT_TYPE_LABELS[t] ?? t}</span><span className="sensitive text-dark-900">{fmt.money(v)}</span></li>)}
              </ul>
              {data.imported.some((i) => i.balance === null) && <p className="mt-3 text-xs text-dark-500">Algumas posições não têm valor informado e não entram no total.</p>}
            </>
          ) : <p className="py-10 text-center text-sm text-dark-500">{isSupabaseMode ? 'Nenhum investimento importado.' : 'Disponível com conta real conectada.'}</p>}
        </Panel>
      </div>
      <p className="text-xs text-dark-500">A evolução diária do patrimônio a mercado não é exibida porque não há histórico de cotações suficiente para calculá-la corretamente.</p>
    </div>
  );
}
