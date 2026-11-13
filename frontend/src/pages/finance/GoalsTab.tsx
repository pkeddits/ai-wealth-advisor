import { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowDownLeft, ArrowUpRight, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { planningService, GOAL_KINDS, type Goal, type GoalKind } from '../../services/planning';
import { goalProgress } from '../../domain/planning';
import { monthsToTarget } from '../../domain/simulation';
import { useDisplayFormat } from '../../lib/displayFormat';
import { errorMessage } from '../../lib/errorMessage';
import { Button, Input, Modal, Select } from '../../components/common';
import { Segmented } from '../../components/settings';
import { tilt } from '../../lib/tilt';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const num = (v: string) => Number(v.replace(/\./g, '').replace(',', '.'));

function Ring({ pct }: { pct: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" aria-hidden="true">
      <circle cx="32" cy="32" r={r} fill="none" stroke="rgb(var(--dark-100))" strokeWidth="7" />
      <motion.circle cx="32" cy="32" r={r} fill="none" stroke="url(#goal-grad)" strokeWidth="7" strokeLinecap="round" initial={{ strokeDasharray: `0 ${c}` }} animate={{ strokeDasharray: `${(pct / 100) * c} ${c}` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
      <defs><linearGradient id="goal-grad"><stop offset="0%" stopColor="rgb(var(--indigo))" /><stop offset="100%" stopColor="rgb(var(--violet))" /></linearGradient></defs>
    </svg>
  );
}

export function GoalsTab() {
  const fmt = useDisplayFormat();
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Goal | 'new' | null>(null);
  const [form, setForm] = useState({ name: '', kind: 'reserva' as GoalKind, target: '', initial: '', date: '', planned: '' });
  const [moving, setMoving] = useState<Goal | null>(null);
  const [move, setMove] = useState({ kind: 'aporte' as 'aporte' | 'retirada', amount: '', date: today(), note: '' });
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setGoals(await planningService.goals());
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível carregar as metas.'));
      setGoals([]);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openGoal = (g: Goal | 'new') => {
    setFormError('');
    setForm(g === 'new' ? { name: '', kind: 'reserva', target: '', initial: '', date: '', planned: '' } : { name: g.name, kind: g.kind, target: String(g.targetAmount), initial: '', date: g.targetDate ?? '', planned: g.plannedMonthly ? String(g.plannedMonthly) : '' });
    setEditing(g);
  };

  const saveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      const input = { name: form.name, kind: form.kind, targetAmount: num(form.target), targetDate: form.date || null, plannedMonthly: form.planned ? num(form.planned) : null };
      if (editing === 'new') await planningService.createGoal({ ...input, initialAmount: form.initial ? num(form.initial) : 0 });
      else if (editing) await planningService.updateGoal(editing.id, input);
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(errorMessage(err, 'Não foi possível salvar a meta.'));
    } finally {
      setBusy(false);
    }
  };

  const saveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moving) return;
    setBusy(true);
    setFormError('');
    try {
      await planningService.addMovement(moving.id, move.kind, num(move.amount), move.date, move.note);
      await load();
      setMove({ kind: 'aporte', amount: '', date: today(), note: '' });
      setMoving((await planningService.goals()).find((g) => g.id === moving.id) ?? null);
    } catch (err) {
      setFormError(errorMessage(err, 'Não foi possível registrar.'));
    } finally {
      setBusy(false);
    }
  };

  if (goals === null) return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-56 !rounded-panel" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm text-dark-500">O valor guardado vem só dos aportes que você registra. Uma sobra no mês não é considerada dinheiro guardado, e aportes não entram nas despesas.</p>
        <Button onClick={() => openGoal('new')} icon={<Plus className="h-4 w-4" />}>Nova meta</Button>
      </div>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      {!goals.length ? (
        <div className="panel-feature px-6 py-14 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary-500/40 bg-primary-500/10 text-primary-700"><Target className="h-6 w-6" /></span>
          <h2 className="text-display mt-5 text-2xl">Nenhuma meta ainda</h2>
          <p className="mx-auto mt-2 max-w-md text-dark-600">Crie uma meta, como reserva de emergência ou viagem, e acompanhe quanto falta.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((g, i) => {
            const p = goalProgress(g.targetAmount, g.movements, today(), g.targetDate);
            return (
              <motion.article key={g.id} {...tilt} data-tilt="4" className="panel spotlight tilt flex flex-col p-5" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <Ring pct={p.pct} />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-dark-900">{Math.round(p.pct)}%</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-dark-500">{GOAL_KINDS[g.kind]}</p>
                    <h3 className="truncate font-display text-lg font-semibold tracking-tight">{g.name}</h3>
                    <p className="sensitive mt-1 text-sm text-dark-700">{fmt.money(p.saved)} de {fmt.money(g.targetAmount)}</p>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-dark-500">Falta</dt><dd className="sensitive font-medium text-dark-900">{p.reached ? 'Meta alcançada' : fmt.money(p.remaining)}</dd></div>
                  <div>
                    <dt className="text-dark-500">{g.targetDate ? 'Por mês até a data' : 'No ritmo atual'}</dt>
                    <dd className="font-medium text-dark-900">
                      {p.reached ? '—' : g.targetDate ? <span className="sensitive">{fmt.money(p.neededPerMonth ?? 0)}</span> : p.etaMonths !== null ? `${p.etaMonths} ${p.etaMonths === 1 ? 'mês' : 'meses'}` : <span className="text-xs font-normal text-dark-500">Histórico insuficiente para estimar seu ritmo mensal.</span>}
                    </dd>
                  </div>
                </dl>
                {g.targetDate && <p className="mt-2 text-xs text-dark-500">Data desejada: {fmt.date(g.targetDate)}</p>}
                {!p.reached && g.plannedMonthly && (() => {
                  const m = monthsToTarget(p.saved, g.plannedMonthly, g.targetAmount, 0);
                  return <p className="mt-2 rounded-xl border border-dashed border-primary-500/40 bg-primary-500/[0.06] px-3 py-2 text-xs text-dark-600">Projeção hipotética: guardando <span className="sensitive font-medium text-dark-900">{fmt.money(g.plannedMonthly)}</span> por mês, você alcança a meta em {m === null ? 'mais de 100 anos' : `${m} ${m === 1 ? 'mês' : 'meses'}`} (sem rendimento).</p>;
                })()}
                <div className="mt-4 flex flex-wrap gap-2 pt-1">
                  <Button size="sm" onClick={() => { setFormError(''); setMoving(g); }} icon={<Plus className="h-4 w-4" />}>Aportar ou retirar</Button>
                  <Button size="sm" variant="ghost" onClick={() => openGoal(g)} icon={<Pencil className="h-4 w-4" />} aria-label={`Editar ${g.name}`}>Editar</Button>
                  <Button size="sm" variant="ghost" onClick={async () => { if (window.confirm(`Excluir a meta "${g.name}" e o histórico dela?`)) { await planningService.deleteGoal(g.id); await load(); } }} icon={<Trash2 className="h-4 w-4" />} aria-label={`Excluir ${g.name}`} />
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nova meta' : 'Editar meta'}>
        <form onSubmit={saveGoal} className="space-y-4" noValidate>
          <Input id="goal-name" label="Nome" value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Reserva de emergência" />
          <Select id="goal-kind" label="Tipo" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as GoalKind })} options={Object.entries(GOAL_KINDS).map(([value, label]) => ({ value, label }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="goal-target" label="Valor-alvo (R$)" inputMode="decimal" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
            <Input id="goal-date" label="Data desejada (opcional)" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {editing === 'new' && <Input id="goal-initial" label="Valor já guardado (opcional)" inputMode="decimal" value={form.initial} onChange={(e) => setForm({ ...form, initial: e.target.value })} />}
            <Input id="goal-planned" label="Aporte mensal planejado (opcional)" inputMode="decimal" value={form.planned} onChange={(e) => setForm({ ...form, planned: e.target.value })} helperText="Usado só para projetar o prazo." />
          </div>
          {formError && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700" role="alert">{formError}</div>}
          <div className="flex gap-3 pt-2"><Button type="button" variant="secondary" className="flex-1" onClick={() => setEditing(null)}>Cancelar</Button><Button type="submit" className="flex-1" loading={busy}>Salvar meta</Button></div>
        </form>
      </Modal>

      <Modal isOpen={moving !== null} onClose={() => setMoving(null)} title={moving ? moving.name : ''}>
        {moving && (
          <div className="space-y-5">
            <form onSubmit={saveMovement} className="space-y-4" noValidate>
              <Segmented label="Tipo" value={move.kind} onChange={(v) => setMove({ ...move, kind: v })} options={[{ value: 'aporte', label: 'Aporte' }, { value: 'retirada', label: 'Retirada' }]} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input id="move-amount" label="Valor (R$)" inputMode="decimal" value={move.amount} onChange={(e) => setMove({ ...move, amount: e.target.value })} />
                <Input id="move-date" label="Data" type="date" value={move.date} max={today()} onChange={(e) => setMove({ ...move, date: e.target.value })} />
              </div>
              <Input id="move-note" label="Observação (opcional)" value={move.note} maxLength={200} onChange={(e) => setMove({ ...move, note: e.target.value })} />
              <p className="text-xs text-dark-500">Registre aqui o dinheiro que você separou para a meta. Isso não altera saldos bancários nem cria despesas.</p>
              {formError && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700" role="alert">{formError}</div>}
              <Button type="submit" loading={busy} className="w-full">Registrar {move.kind}</Button>
            </form>
            <div>
              <p className="mb-2 text-sm font-medium text-dark-900">Histórico</p>
              {moving.movements.length ? (
                <ul className="max-h-56 divide-y divide-dark-200/60 overflow-y-auto rounded-2xl border border-dark-200/60">
                  {moving.movements.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                      {m.kind === 'retirada' ? <ArrowUpRight className="h-4 w-4 text-red-600" /> : <ArrowDownLeft className="h-4 w-4 text-green-600" />}
                      <span className="flex-1">{m.kind === 'inicial' ? 'Valor inicial' : m.kind === 'aporte' ? 'Aporte' : 'Retirada'}{m.note ? <span className="block text-xs text-dark-500">{m.note}</span> : null}</span>
                      <span className="text-xs text-dark-500">{fmt.date(m.occurredOn)}</span>
                      <span className={clsx('sensitive font-medium', m.kind === 'retirada' ? 'text-red-600' : 'text-dark-900')}>{m.kind === 'retirada' ? '-' : '+'}{fmt.money(m.amount)}</span>
                      <button type="button" onClick={async () => { try { await planningService.deleteMovement(m.id); await load(); setMoving((await planningService.goals()).find((g) => g.id === moving.id) ?? null); } catch (err) { setFormError(errorMessage(err, 'Não foi possível excluir.')); } }} className="rounded p-1 text-dark-500 hover:text-red-600" aria-label="Excluir movimentação"><Trash2 className="h-3.5 w-3.5" /></button>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-dark-500">Nenhuma movimentação registrada.</p>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
