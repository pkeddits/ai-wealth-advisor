import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, PiggyBank, Target } from 'lucide-react';
import clsx from 'clsx';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { financeService, categoryMeta } from '../../services/finance';
import { planningService, useCustomCategories, type Budget, type Goal } from '../../services/planning';
import { summarizeMonth, shiftMonth, type MonthSummary } from '../../domain/finance';
import { budgetUsage, goalProgress } from '../../domain/planning';
import { useDisplayFormat } from '../../lib/displayFormat';
import { AllocationDonut, SERIES_COLORS, INCOME_COLOR, EXPENSE_COLOR } from '../../components/charts';
import { AnimatedNumber, FloatingNote, useRichMotion } from '../../components/motion';
import { tilt } from '../../lib/tilt';

const EASE = [0.22, 1, 0.36, 1] as const;
const nowMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const today = () => new Date().toISOString().slice(0, 10);
const short = (m: string) => new Date(`${m}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
const monthName = (m: string) => new Date(`${m}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

export function FinanceOverview() {
  const fmt = useDisplayFormat();
  const rich = useRichMotion();
  const loadCategories = useCustomCategories((s) => s.load);
  const [data, setData] = useState<{ months: { month: string; s: MonthSummary; count: number }[]; goals: Goal[]; budgets: Budget[] } | null>(null);

  useEffect(() => {
    (async () => {
      await loadCategories();
      const months = Array.from({ length: 6 }, (_, i) => shiftMonth(nowMonth(), i - 5));
      const lists = await Promise.all(months.map((m) => financeService.list(m).catch(() => [])));
      const [goals, budgets] = await Promise.all([planningService.goals().catch(() => []), planningService.budgets().catch(() => [])]);
      setData({ months: months.map((m, i) => ({ month: m, s: summarizeMonth(lists[i], m), count: lists[i].length })), goals, budgets });
    })();
  }, [loadCategories]);

  if (!data) return <div className="grid gap-4 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-40 !rounded-panel" />)}</div>;
  const cur = data.months[data.months.length - 1];
  const usage = budgetUsage(data.budgets, cur.s.expensesByCategory).sort((a, b) => b.pct - a.pct).slice(0, 3);
  const slices = cur.s.expensesByCategory.map((c, i) => ({ key: c.category, label: categoryMeta(c.category).label, value: c.amount, color: SERIES_COLORS[i % SERIES_COLORS.length] }));
  const trend = data.months.map((m) => ({ mes: short(m.month), receitas: m.s.income, despesas: m.s.expenses }));
  const stats = [
    { label: 'Receitas', value: cur.s.income, icon: ArrowDownLeft, tone: 'text-green-600' },
    { label: 'Despesas', value: cur.s.expenses, icon: ArrowUpRight, tone: 'text-red-600' },
    { label: 'Saldo do período', value: cur.s.net, icon: PiggyBank, tone: cur.s.net >= 0 ? 'text-dark-900' : 'text-red-600' },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-dark-500">Resumo de {monthName(cur.month)}. O saldo do período é receitas menos despesas, não o saldo bancário.</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s, i) => (
          <motion.div key={s.label} {...tilt} data-tilt="6" className={clsx('panel spotlight tilt relative p-5', i === 2 && 'panel-feature')} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, ease: EASE }}>
            <p className="flex items-center gap-2 text-sm text-dark-500"><s.icon className={clsx('h-4 w-4', s.tone)} />{s.label}</p>
            <AnimatedNumber value={s.value} format={fmt.money} className={clsx('sensitive mt-2 block text-2xl font-semibold tracking-tight', s.tone)} />
            {i === 2 && cur.s.income > 0 && (cur.s.net >= 0
              ? <FloatingNote className="-top-3 right-5" tone="ok" delay={0.9}>Sobrou {Math.round((cur.s.net / cur.s.income) * 100)}% da receita</FloatingNote>
              : <FloatingNote className="-top-3 right-5" tone="warn" delay={0.9}>Despesas acima das receitas</FloatingNote>)}
          </motion.div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <motion.section className="panel lift p-5" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, ease: EASE }}>
          <h2 className="mb-3 text-[15px] font-semibold">Tendência dos últimos 6 meses</h2>
          {data.months.some((m) => m.count) ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend}>
                  <XAxis dataKey="mes" tick={{ fill: 'rgb(var(--dark-500))', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => fmt.money(v)} contentStyle={{ background: 'rgb(var(--surface-raised))', border: '1px solid rgb(var(--dark-200))', borderRadius: 12 }} cursor={{ fill: 'rgb(var(--dark-100) / 0.5)' }} />
                  <Bar dataKey="receitas" name="Receitas" fill={INCOME_COLOR} radius={[6, 6, 2, 2]} maxBarSize={18} isAnimationActive={rich} animationDuration={900} animationEasing="ease-out" />
                  <Bar dataKey="despesas" name="Despesas" fill={EXPENSE_COLOR} radius={[6, 6, 2, 2]} maxBarSize={18} isAnimationActive={rich} animationBegin={180} animationDuration={900} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="py-12 text-center text-sm text-dark-500">Sem movimentações nos últimos 6 meses.</p>}
        </motion.section>
        <motion.section className="panel lift relative p-5" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, ease: EASE }}>
          <h2 className="mb-3 text-[15px] font-semibold">Distribuição dos gastos</h2>
          {slices[0] && cur.s.expenses > 0 && <FloatingNote className="-top-3 right-5" delay={1.1}>Maior gasto: {slices[0].label} ({Math.round((slices[0].value / cur.s.expenses) * 100)}%)</FloatingNote>}
          {slices.length ? <AllocationDonut slices={slices} formatValue={fmt.money} size={150} stacked /> : <p className="py-12 text-center text-sm text-dark-500">Sem despesas neste mês.</p>}
        </motion.section>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <motion.section className="panel lift p-5" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, ease: EASE }}>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-[15px] font-semibold">Orçamentos</h2><Link to="/financas#orcamentos" className="inline-flex items-center gap-1 text-sm text-primary-700 hover:underline">Ver <ArrowRight className="h-3.5 w-3.5" /></Link></div>
          {usage.length ? (
            <ul className="space-y-3">{usage.map((u) => (
              <li key={u.category}>
                <div className="flex justify-between text-sm"><span className="text-dark-800">{categoryMeta(u.category).label}</span><span className="sensitive text-dark-500">{Math.round(u.pct)}%</span></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-dark-100"><motion.div className={clsx('h-full rounded-full', u.status === 'over' ? 'bg-red-500' : u.status === 'warning' ? 'bg-yellow-500' : 'bg-brand')} initial={{ width: 0 }} animate={{ width: `${Math.min(u.pct, 100)}%` }} transition={{ duration: 0.9, ease: EASE }} /></div>
              </li>
            ))}</ul>
          ) : <p className="py-6 text-sm text-dark-500">Nenhum orçamento definido.</p>}
        </motion.section>
        <motion.section className="panel lift p-5" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, ease: EASE }}>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-[15px] font-semibold">Metas</h2><Link to="/financas#metas" className="inline-flex items-center gap-1 text-sm text-primary-700 hover:underline">Ver <ArrowRight className="h-3.5 w-3.5" /></Link></div>
          {data.goals.length ? (
            <ul className="space-y-3">{data.goals.slice(0, 3).map((g) => {
              const p = goalProgress(g.targetAmount, g.movements, today(), g.targetDate);
              return (
                <li key={g.id} className="flex items-center gap-3">
                  <Target className="h-4 w-4 text-primary-700" />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-sm"><span className="truncate text-dark-800">{g.name}</span><span className="sensitive text-dark-500">{fmt.money(p.saved)} de {fmt.money(g.targetAmount)}</span></div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-dark-100"><motion.div className="h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${p.pct}%` }} transition={{ duration: 0.9, ease: EASE }} /></div>
                  </div>
                </li>
              );
            })}</ul>
          ) : <p className="py-6 text-sm text-dark-500">Nenhuma meta cadastrada.</p>}
        </motion.section>
      </div>
      <Link to="/financas" className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline">Abrir Finanças pessoais <ArrowRight className="h-4 w-4" /></Link>
    </div>
  );
}
