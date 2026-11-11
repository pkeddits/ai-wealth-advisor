import type { ReactNode } from 'react';
import { Building2, Landmark, Sparkles, Target, Wallet, Receipt } from 'lucide-react';
import clsx from 'clsx';
import { DonutRing, SERIES_COLORS, EXPENSE_COLOR } from '../charts';

type Status = 'live' | 'building' | 'planned';

const STATUS: Record<Status, { label: string; className: string }> = {
  live: { label: 'Disponível na demonstração', className: 'chip-live' },
  building: { label: 'Em desenvolvimento', className: 'chip-building' },
  planned: { label: 'Planejado', className: 'chip-planned' },
};

function Tile({ status, icon, title, children, className, visual }: {
  status: Status;
  icon: ReactNode;
  title: string;
  children: ReactNode;
  className?: string;
  visual?: ReactNode;
}) {
  return (
    <article className={clsx('panel group relative flex flex-col overflow-hidden p-6 transition-colors hover:border-dark-300 sm:p-7', className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-control border border-dark-200 bg-dark-100 text-primary-500">
          {icon}
        </span>
        <span className={STATUS[status].className}>{STATUS[status].label}</span>
      </div>
      <h3 className="mt-5 font-display text-lg font-semibold tracking-tight">{title}</h3>
      <div className="mt-2 text-sm leading-relaxed text-dark-600">{children}</div>
      {visual && <div className="mt-6 flex-1">{visual}</div>}
    </article>
  );
}

const HOLDINGS = [
  { symbol: 'ITUB4', name: 'Itaú Unibanco PN', share: 34 },
  { symbol: 'SELIC29', name: 'Tesouro Selic 2029', share: 28 },
  { symbol: 'MXRF11', name: 'Maxi Renda FII', share: 21 },
  { symbol: 'BOVA11', name: 'iShares Ibovespa', share: 17 },
];

const MONTHS = [
  { m: 'jul', income: 62, expense: 48 },
  { m: 'ago', income: 62, expense: 55 },
  { m: 'set', income: 66, expense: 44 },
  { m: 'out', income: 66, expense: 51 },
  { m: 'nov', income: 70, expense: 39 },
];

export function FeatureBento() {
  return (
    <section id="recursos" className="relative mx-auto max-w-7xl scroll-mt-24 px-5 py-24 sm:px-8">
      <div className="max-w-2xl">
        <h2 className="text-display text-3xl sm:text-4xl">Investimentos primeiro. O restante do seu dinheiro, logo depois.</h2>
        <p className="mt-4 text-dark-600">
          O foco é acompanhar carteiras com precisão. Em seguida, contas, gastos e metas entram no mesmo painel,
          para que quem ainda não investe também tenha por onde começar.
        </p>
      </div>

      <div className="mt-14 grid gap-4 lg:grid-cols-6 lg:grid-rows-[auto_auto]">
        <Tile
          status="live"
          icon={<Wallet className="h-5 w-5" />}
          title="Carteiras e operações"
          className="lg:col-span-4 lg:row-span-2"
          visual={
            <div className="flex h-full flex-col gap-4">
            <div className="grid items-center gap-6 rounded-2xl border border-dark-200/70 bg-dark-50/60 p-5 sm:grid-cols-[160px_1fr]">
              <DonutRing
                className="mx-auto h-40 w-40"
                thickness={12}
                slices={HOLDINGS.map((h, i) => ({ label: h.symbol, value: h.share, color: SERIES_COLORS[i] }))}
              >
                <span className="text-xs text-dark-500">Posições</span>
                <span className="font-display text-2xl font-semibold text-dark-900">4</span>
              </DonutRing>
              <ul className="divide-y divide-dark-200/70">
                {HOLDINGS.map((h, i) => (
                  <li key={h.symbol} className="flex items-center gap-3 py-2.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: SERIES_COLORS[i] }} aria-hidden="true" />
                    <span className="font-medium text-dark-900">{h.symbol}</span>
                    <span className="hidden truncate text-sm text-dark-500 sm:inline">{h.name}</span>
                    <span className="ml-auto text-sm text-dark-700">{h.share}%</span>
                  </li>
                ))}
              </ul>
            </div>
            <dl className="mt-auto grid grid-cols-3 divide-x divide-dark-200/70 rounded-2xl border border-dark-200/70 bg-dark-50/60">
              {[
                ['Preço médio', 'por ativo'],
                ['Ganho', 'não realizado'],
                ['Vendas', 'validadas pelo saldo'],
              ].map(([term, detail]) => (
                <div key={term} className="px-4 py-3.5">
                  <dt className="text-sm font-medium text-dark-900">{term}</dt>
                  <dd className="text-xs text-dark-500">{detail}</dd>
                </div>
              ))}
            </dl>
            </div>
          }
        >
          Registre compras e vendas e veja posições, preço médio, ganho e distribuição recalculados a cada operação.
          Vendas acima do saldo são recusadas.
        </Tile>

        <Tile
          status="building"
          icon={<Receipt className="h-5 w-5" />}
          title="Receitas e despesas"
          className="lg:col-span-2"
          visual={
            <div className="flex h-24 items-end gap-3" aria-hidden="true">
              {MONTHS.map((x) => (
                <div key={x.m} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex h-20 w-full items-end justify-center gap-1">
                    <span className="w-2 rounded-full bg-primary-500/80" style={{ height: `${x.income}%` }} />
                    <span className="w-2 rounded-full" style={{ height: `${x.expense}%`, background: EXPENSE_COLOR }} />
                  </div>
                  <span className="text-[11px] text-dark-500">{x.m}</span>
                </div>
              ))}
            </div>
          }
        >
          Gastos por categoria e comparação mês a mês.
        </Tile>

        <Tile
          status="planned"
          icon={<Landmark className="h-5 w-5" />}
          title="Contas pelo Open Finance"
          className="lg:col-span-2"
          visual={
            <div className="flex items-center justify-between gap-2 text-dark-500" aria-hidden="true">
              <div className="flex flex-col gap-2">
                {['Conta corrente', 'Cartão', 'Investimentos'].map((b) => (
                  <span key={b} className="flex items-center gap-2 rounded-lg border border-dark-200 bg-dark-50/70 px-2.5 py-1.5 text-xs">
                    <Building2 className="h-3.5 w-3.5" />
                    {b}
                  </span>
                ))}
              </div>
              <svg viewBox="0 0 60 90" className="h-20 w-12 shrink-0">
                {[15, 45, 75].map((y) => (
                  <path key={y} d={`M0,${y} C30,${y} 30,45 60,45`} fill="none" stroke="rgb(var(--dark-300))" strokeDasharray="3 4" />
                ))}
              </svg>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control border border-primary-500/40 bg-primary-500/10 text-primary-500">
                <Wallet className="h-5 w-5" />
              </span>
            </div>
          }
        >
          Saldos, Pix e transações importados com sua autorização, pelo fluxo oficial da instituição.
        </Tile>

        <Tile status="planned" icon={<Sparkles className="h-5 w-5" />} title="Explicações com IA" className="lg:col-span-3">
          <p>
            A IA interpreta indicadores calculados pelo sistema e explica, em linguagem simples, o que eles significam
            para a sua carteira.
          </p>
          <p className="mt-3 rounded-xl border border-accent-500/25 bg-accent-500/5 px-3.5 py-2.5 text-dark-700">
            Ela não decide nem recomenda compras e vendas: os números vêm de cálculos verificáveis.
          </p>
        </Tile>

        <Tile
          status="planned"
          icon={<Target className="h-5 w-5" />}
          title="Para quem está começando"
          className="lg:col-span-3"
          visual={
            <div className="flex items-center gap-4 rounded-2xl border border-dark-200/70 bg-dark-50/60 p-4">
              <DonutRing className="h-16 w-16 shrink-0" thickness={14} slices={[{ label: 'Meta', value: 35, color: SERIES_COLORS[1] }, { label: 'Restante', value: 65, color: 'transparent' }]} />
              <div className="text-sm">
                <p className="font-medium text-dark-900">Reserva de emergência</p>
                <p className="text-dark-500">Simule quanto guardar por mês para chegar lá.</p>
              </div>
            </div>
          }
        >
          Metas e simulação de aportes, úteis mesmo sem nenhum investimento.
        </Tile>
      </div>
    </section>
  );
}
