import { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { simulate, validateSimulation, monthlyNeeded, monthsToTarget, monthlyRateFrom, type RatePeriod, type SimulationInput } from '../domain/simulation';
import { goalProgress } from '../domain/planning';
import { planningService, type Goal } from '../services/planning';
import { useDisplayFormat } from '../lib/displayFormat';
import { Input, Select } from '../components/common';
import { Segmented } from '../components/settings';

const parse = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(/\./g, '').replace(',', '.')));
const today = () => new Date().toISOString().slice(0, 10);

function ScenarioForm({ title, value, onChange }: { title: string; value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  return (
    <div className="panel lift space-y-3 p-5">
      <p className="font-medium text-dark-900">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Valor inicial (R$)" inputMode="decimal" value={value.initial} onChange={(e) => onChange({ ...value, initial: e.target.value })} />
        <Input label="Aporte mensal (R$)" inputMode="decimal" value={value.monthly} onChange={(e) => onChange({ ...value, monthly: e.target.value })} />
        <Input label="Prazo (meses)" type="number" min={1} max={600} value={value.months} onChange={(e) => onChange({ ...value, months: e.target.value })} />
        <Input label="Taxa hipotética (%)" inputMode="decimal" value={value.rate} onChange={(e) => onChange({ ...value, rate: e.target.value })} />
      </div>
      <Segmented label="Periodicidade da taxa" value={value.period as RatePeriod} onChange={(v) => onChange({ ...value, period: v })} options={[{ value: 'anual', label: 'Ao ano' }, { value: 'mensal', label: 'Ao mês' }]} />
    </div>
  );
}

const toInput = (v: Record<string, string>): SimulationInput => ({ initial: parse(v.initial), monthly: parse(v.monthly), months: parse(v.months), ratePct: parse(v.rate), ratePeriod: v.period as RatePeriod });

export function SimulationsPage() {
  const fmt = useDisplayFormat();
  const [a, setA] = useState<Record<string, string>>({ initial: '1000', monthly: '300', months: '60', rate: '10', period: 'anual' });
  const [b, setB] = useState<Record<string, string>>({ initial: '1000', monthly: '500', months: '60', rate: '10', period: 'anual' });
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalId, setGoalId] = useState('');
  const [extra, setExtra] = useState('100');
  useEffect(() => { planningService.goals().then((g) => { setGoals(g); setGoalId(g[0]?.id ?? ''); }).catch(() => undefined); }, []);

  const errA = validateSimulation(toInput(a));
  const errB = validateSimulation(toInput(b));
  const ra = useMemo(() => (errA ? null : simulate(toInput(a))), [a, errA]);
  const rb = useMemo(() => (errB ? null : simulate(toInput(b))), [b, errB]);
  const chart = useMemo(() => {
    const max = Math.max(ra?.points.length ?? 0, rb?.points.length ?? 0);
    return Array.from({ length: max }, (_, i) => ({ month: i, a: ra?.points[i]?.value, b: rb?.points[i]?.value, aportado: ra?.points[i]?.invested }));
  }, [ra, rb]);

  const goal = goals.find((g) => g.id === goalId);
  const gp = goal ? goalProgress(goal.targetAmount, goal.movements, today(), goal.targetDate) : null;
  const rate = monthlyRateFrom(Number.isFinite(parse(a.rate)) ? parse(a.rate) : 0, a.period as RatePeriod);
  const pace = gp?.monthlyPace && gp.monthlyPace > 0 ? gp.monthlyPace : 0;
  const extraValue = Number.isFinite(parse(extra)) ? Math.max(parse(extra), 0) : 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-dark-500">Inteligência</p>
        <h1 className="text-display mt-1 text-[2rem] leading-tight sm:text-[2.4rem]">Simulações</h1>
        <p className="mt-1 max-w-3xl text-dark-600">Projeções hipotéticas com juros compostos. A taxa anual é tratada como efetiva e convertida para a mensal equivalente; aportes ao fim de cada mês. Impostos, taxas e inflação não são considerados, e nenhum rendimento é garantido.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ScenarioForm title="Cenário A" value={a} onChange={setA} />
        <ScenarioForm title="Cenário B" value={b} onChange={setB} />
      </div>
      <section className="panel p-5 sm:p-6" aria-label="Resultado das simulações">
        <div className="grid gap-4 sm:grid-cols-2">
          {[{ name: 'Cenário A', r: ra, err: errA }, { name: 'Cenário B', r: rb, err: errB }].map(({ name, r, err }) => (
            <div key={name} className="rounded-2xl border border-dark-200/70 bg-dark-50/40 p-4">
              <p className="text-sm text-dark-500">{name}</p>
              {err || !r ? <p className="mt-2 text-sm text-red-600" role="alert">{err}</p> : (
                <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                  <div><dt className="text-dark-500">Aportado</dt><dd className="font-medium text-dark-900">{fmt.money(r.totalInvested)}</dd></div>
                  <div><dt className="text-dark-500">Projetado</dt><dd className="font-semibold text-dark-900">{fmt.money(r.finalValue)}</dd></div>
                  <div><dt className="text-dark-500">Rendimentos</dt><dd className="font-medium text-green-600">{fmt.money(r.earnings)}</dd></div>
                </dl>
              )}
              {r && <p className="mt-2 text-xs text-dark-500">Taxa mensal equivalente: {(r.monthlyRate * 100).toFixed(4).replace('.', ',')}%</p>}
            </div>
          ))}
        </div>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="rgb(var(--dark-200))" strokeDasharray="3 6" />
              <XAxis dataKey="month" tick={{ fill: 'rgb(var(--dark-500))', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(m: number) => (m % 12 === 0 ? `${m / 12}a` : '')} interval={0} />
              <YAxis hide />
              <Tooltip formatter={(v: number) => fmt.money(v)} labelFormatter={(m: number) => `Mês ${m}`} contentStyle={{ background: 'rgb(var(--surface-raised))', border: '1px solid rgb(var(--dark-200))', borderRadius: 12 }} />
              <Legend />
              <Line type="monotone" dataKey="a" name="Cenário A" stroke="rgb(var(--violet))" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="b" name="Cenário B" stroke="rgb(var(--azure))" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="aportado" name="Aportado (A)" stroke="rgb(var(--dark-400))" strokeDasharray="4 4" dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel p-5 sm:p-6" aria-labelledby="sim-meta">
        <h2 id="sim-meta" className="font-display text-lg font-semibold tracking-tight">Simulação de meta</h2>
        {!goals.length ? <p className="mt-2 text-sm text-dark-500">Crie uma meta em Finanças pessoais → Metas para simular prazos e aportes.</p> : goal && gp && (
          <div className="mt-4 grid gap-5 md:grid-cols-[280px_1fr]">
            <div className="space-y-3">
              <Select label="Meta" value={goalId} onChange={(e) => setGoalId(e.target.value)} options={goals.map((g) => ({ value: g.id, label: g.name }))} />
              <Input label="Aporte extra por mês (R$)" inputMode="decimal" value={extra} onChange={(e) => setExtra(e.target.value)} />
              <p className="text-xs text-dark-500">Usa a taxa do cenário A ({a.rate || 0}% {a.period === 'anual' ? 'ao ano' : 'ao mês'}).</p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-dark-200/70 bg-dark-50/40 p-4"><dt className="text-sm text-dark-500">Guardado</dt><dd className="mt-1 text-lg font-semibold text-dark-900">{fmt.money(gp.saved)}</dd><dd className="text-xs text-dark-500">de {fmt.money(goal.targetAmount)}</dd></div>
              <div className="rounded-2xl border border-dark-200/70 bg-dark-50/40 p-4">
                <dt className="text-sm text-dark-500">{goal.targetDate ? 'Por mês até a data' : 'Por mês em 12 meses'}</dt>
                <dd className="mt-1 text-lg font-semibold text-dark-900">{fmt.money(monthlyNeeded(goal.targetAmount, gp.saved, gp.monthsLeft ?? 12, rate))}</dd>
                <dd className="text-xs text-dark-500">com a taxa hipotética</dd>
              </div>
              <div className="rounded-2xl border border-dark-200/70 bg-dark-50/40 p-4">
                <dt className="text-sm text-dark-500">Prazo no ritmo atual</dt>
                <dd className="mt-1 text-lg font-semibold text-dark-900">{pace ? (() => { const m = monthsToTarget(gp.saved, pace, goal.targetAmount, rate); return m === null ? 'mais de 100 anos' : `${m} meses`; })() : 'sem aportes recentes'}</dd>
                <dd className="text-xs text-dark-500">
                  {(() => { const m = monthsToTarget(gp.saved, pace + extraValue, goal.targetAmount, rate); return m === null ? 'Com o extra: não alcança' : `Com +${fmt.money(extraValue)}/mês: ${m} meses`; })()}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </section>
    </div>
  );
}
