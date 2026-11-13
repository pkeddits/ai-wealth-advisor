import { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { PiggyBank, Plus, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { planningService, type Budget } from '../../services/planning';
import { financeService, categoriesFor, categoryMeta } from '../../services/finance';
import { budgetUsage, type BudgetUsage } from '../../domain/planning';
import { summarizeMonth } from '../../domain/finance';
import { useDisplayFormat } from '../../lib/displayFormat';
import { errorMessage } from '../../lib/errorMessage';
import { Button, Input, Modal, Select } from '../../components/common';
import { tilt } from '../../lib/tilt';

const label = (m: string) => { const l = new Date(`${m}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); return l[0].toUpperCase() + l.slice(1); };

/** O mês vem do seletor único da página de Finanças pessoais. */
export function BudgetsTab({ month }: { month: string }) {
  const fmt = useDisplayFormat();
  const [budgets, setBudgets] = useState<Budget[] | null>(null);
  const [usage, setUsage] = useState<BudgetUsage[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: 'alimentacao', limit: '', threshold: '80' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, entries] = await Promise.all([planningService.budgets(), financeService.list(month)]);
      setBudgets(list);
      setUsage(budgetUsage(list, summarizeMonth(entries, month).expensesByCategory));
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível carregar os orçamentos.'));
      setBudgets([]);
    }
  }, [month]);
  useEffect(() => { load(); }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await planningService.saveBudget(form.category, Number(form.limit.replace(/\./g, '').replace(',', '.')), Number(form.threshold));
      setOpen(false);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível salvar.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-dark-900">Gastos de {label(month).toLowerCase()} comparados aos limites</p>
        <Button onClick={() => { setError(''); setForm({ category: 'alimentacao', limit: '', threshold: '80' }); setOpen(true); }} icon={<Plus className="h-4 w-4" />}>Definir orçamento</Button>
      </div>
      <p className="text-sm text-dark-500">Os limites valem para todos os meses. O gasto considera lançamentos manuais e importados válidos; transferências, aplicações, faturas, pendentes e itens a revisar ficam fora.</p>
      {error && !open && <p className="text-sm text-red-600" role="alert">{error}</p>}
      {budgets === null ? <div className="skeleton h-40 !rounded-panel" /> : !budgets.length ? (
        <div className="panel-feature px-6 py-14 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary-500/40 bg-primary-500/10 text-primary-700"><PiggyBank className="h-6 w-6" /></span>
          <h2 className="text-display mt-5 text-2xl">Nenhum orçamento definido</h2>
          <p className="mx-auto mt-2 max-w-md text-dark-600">Defina um limite mensal para uma categoria, como alimentação ou lazer.</p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {usage.map((u, i) => {
            const budget = budgets.find((b) => b.category === u.category)!;
            return (
              <motion.li key={u.category} {...tilt} data-tilt="3" className="panel spotlight tilt p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-dark-900">{categoryMeta(u.category).label}</p>
                  <span className={clsx('chip', u.status === 'over' ? 'border-red-500/30 bg-red-500/10 text-red-700' : u.status === 'warning' ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-700' : 'border-green-500/30 bg-green-500/10 text-green-700')}>
                    {u.status === 'over' ? 'Ultrapassado' : u.status === 'warning' ? 'Perto do limite' : 'Dentro do limite'}
                  </span>
                </div>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-dark-100">
                  <motion.div className={clsx('h-full rounded-full', u.status === 'over' ? 'bg-red-500' : u.status === 'warning' ? 'bg-yellow-500' : 'bg-brand')} initial={{ width: 0 }} animate={{ width: `${Math.min(u.pct, 100)}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
                </div>
                <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="sensitive text-dark-700">{fmt.money(u.spent)} de {fmt.money(u.limit)} ({Math.round(u.pct)}%)</span>
                  <span className={clsx('sensitive', u.remaining < 0 ? 'text-red-600' : 'text-dark-500')}>{u.remaining < 0 ? `${fmt.money(-u.remaining)} acima` : `Restam ${fmt.money(u.remaining)}`}</span>
                </div>
                <div className="mt-3 flex gap-2 text-xs">
                  <button type="button" onClick={() => { setError(''); setForm({ category: u.category, limit: String(u.limit), threshold: String(u.threshold) }); setOpen(true); }} className="text-primary-700 hover:underline">Editar</button>
                  <button type="button" onClick={async () => { if (window.confirm('Excluir este orçamento?')) { await planningService.deleteBudget(budget.id); await load(); } }} className="inline-flex items-center gap-1 text-dark-500 hover:text-red-600"><Trash2 className="h-3 w-3" />Excluir</button>
                  <span className="ml-auto text-dark-500">Alerta em {u.threshold}%</span>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Orçamento mensal">
        <form onSubmit={save} className="space-y-4" noValidate>
          <Select id="budget-category" label="Categoria" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={categoriesFor('despesa').map((c) => ({ value: c, label: categoryMeta(c).label }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="budget-limit" label="Limite mensal (R$)" inputMode="decimal" value={form.limit} onChange={(e) => setForm({ ...form, limit: e.target.value })} />
            <Input id="budget-threshold" label="Alertar a partir de (%)" type="number" min={10} max={100} value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} />
          </div>
          {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700" role="alert">{error}</div>}
          <div className="flex gap-3 pt-2"><Button type="button" variant="secondary" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" className="flex-1" loading={busy}>Salvar</Button></div>
        </form>
      </Modal>
    </div>
  );
}
