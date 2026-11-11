import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Layers, ReceiptText, Sparkles, Wallet } from 'lucide-react';
import clsx from 'clsx';
import type { Portfolio, Transaction } from '../../types';
import { AllocationDonut, SERIES_COLORS } from '../../components/charts';
import { AnimatedNumber } from '../../components/motion';
import { formatCurrency } from '../../utils/format';
import { assetClassLabel, riskProfileLabel } from '../../utils/labels';
import type { AggregatedHolding } from './useDashboardData';

const EASE = [0.22, 1, 0.36, 1] as const;

export function PanelCard({ title, action, children, className, delay = 0 }: { title: string; action?: ReactNode; children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.section
      className={clsx('panel flex flex-col p-5 sm:p-6', className)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-dark-900">{title}</h2>
        {action}
      </div>
      {children}
    </motion.section>
  );
}

const count = (v: number) => Math.round(v).toLocaleString('pt-BR');

export function StatsStrip({ portfolios, assets, operations }: { portfolios: number; assets: number; operations: number }) {
  const items = [
    { icon: Wallet, label: 'Carteiras', value: portfolios },
    { icon: Layers, label: 'Ativos em carteira', value: assets },
    { icon: ReceiptText, label: 'Operações registradas', value: operations },
  ];
  return (
    <motion.section
      className="panel grid grid-cols-3 divide-x divide-dark-200/70"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
      aria-label="Resumo"
    >
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex flex-col gap-2 px-4 py-4 sm:px-5">
          <Icon className="h-4 w-4 text-primary-700" aria-hidden="true" />
          <AnimatedNumber value={value} format={count} className="text-2xl font-semibold tracking-tight text-dark-900" />
          <span className="text-xs leading-tight text-dark-500">{label}</span>
        </div>
      ))}
    </motion.section>
  );
}

export function AllocationPanel({ holdings }: { holdings: AggregatedHolding[] }) {
  const byClass = new Map<string, number>();
  for (const h of holdings) byClass.set(h.assetClass, (byClass.get(h.assetClass) ?? 0) + h.currentValue);
  const slices = [...byClass.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cls, value], i) => ({ key: cls, label: assetClassLabel(cls), value, color: SERIES_COLORS[i % SERIES_COLORS.length] }));

  return (
    <PanelCard title="Distribuição por classe" delay={0.1}>
      {slices.length ? (
        <AllocationDonut slices={slices} formatValue={formatCurrency} size={176} stacked />
      ) : (
        <p className="py-10 text-center text-sm text-dark-500">Sem posições abertas.</p>
      )}
    </PanelCard>
  );
}

export function PortfoliosPanel({ portfolios }: { portfolios: Portfolio[] }) {
  const max = Math.max(...portfolios.map((p) => p.totalValue || 0), 1);
  return (
    <PanelCard
      title="Carteiras"
      delay={0.2}
      className="xl:col-span-5"
      action={<Link to="/portfolios" className="link-underline text-sm text-primary-700">Ver todas</Link>}
    >
      <ul className="-mx-2 space-y-1">
        {portfolios.slice(0, 5).map((p) => {
          const pct = p.totalReturnPct || 0;
          return (
            <li key={p.id}>
              <Link to={`/portfolios/${p.id}`} className="group flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-dark-100/70">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dark-200 bg-dark-100 text-primary-700 transition-colors group-hover:border-primary-500/40">
                  <Wallet className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-dark-900">{p.name}</span>
                  <span className="mt-1.5 block h-1 rounded-full bg-dark-100">
                    <motion.span
                      className="block h-full rounded-full bg-brand"
                      initial={{ width: 0 }}
                      animate={{ width: `${((p.totalValue || 0) / max) * 100}%` }}
                      transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
                    />
                  </span>
                  <span className="mt-1 block text-xs text-dark-500">{riskProfileLabel(p.riskProfile)}</span>
                </span>
                <span className="text-right">
                  <span className="block whitespace-nowrap text-sm font-medium text-dark-900">{formatCurrency(p.totalValue || 0)}</span>
                  <span className={clsx('block text-xs', pct >= 0 ? 'text-green-600' : 'text-red-600')}>{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%</span>
                </span>
                <ChevronRight className="h-4 w-4 text-dark-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </PanelCard>
  );
}

export function HoldingsPanel({ holdings, totalValue }: { holdings: AggregatedHolding[]; totalValue: number }) {
  return (
    <PanelCard title="Principais posições" delay={0.25} className="xl:col-span-4">
      {holdings.length ? (
        <ul className="space-y-3.5">
          {holdings.slice(0, 5).map((h, i) => {
            const share = totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0;
            const gain = h.investedValue > 0 ? ((h.currentValue - h.investedValue) / h.investedValue) * 100 : 0;
            return (
              <li key={h.assetId}>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-dark-100 text-[11px] font-semibold" style={{ color: SERIES_COLORS[i % SERIES_COLORS.length] }}>
                    {h.symbol.slice(0, 2)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-dark-900">{h.symbol}</span>
                    <span className="block truncate text-xs text-dark-500">{h.name}</span>
                  </span>
                  <span className="text-right">
                    <span className="block whitespace-nowrap text-sm text-dark-900">{formatCurrency(h.currentValue)}</span>
                    <span className={clsx('block text-xs', gain >= 0 ? 'text-green-600' : 'text-red-600')}>{gain >= 0 ? '+' : ''}{gain.toFixed(2)}%</span>
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="h-1 flex-1 rounded-full bg-dark-100">
                    <motion.span
                      className="block h-full rounded-full"
                      style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${share}%` }}
                      transition={{ duration: 0.9, delay: 0.35 + i * 0.06, ease: EASE }}
                    />
                  </span>
                  <span className="w-12 text-right text-[11px] text-dark-500">{share.toFixed(1)}%</span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-8 text-center text-sm text-dark-500">Nenhuma posição aberta.</p>
      )}
    </PanelCard>
  );
}

export function ActivityPanel({ transactions, loading }: { transactions: Transaction[]; loading: boolean }) {
  return (
    <PanelCard title="Atividade recente" delay={0.3}>
      {loading && !transactions.length ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-11" />)}</div>
      ) : transactions.length ? (
        <ul className="grid gap-x-8 divide-y divide-dark-200/60 lg:grid-cols-2 lg:divide-y-0">
          {transactions.map((t) => {
            const buy = t.type === 'compra';
            const Icon = buy ? ArrowDownLeft : ArrowUpRight;
            return (
              <li key={t.id} className="flex items-center gap-3 py-2.5 lg:border-b lg:border-dark-200/60">
                <span className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', buy ? 'bg-primary-500/10 text-primary-700' : 'bg-blue-500/10 text-blue-600')}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-dark-900">
                    {buy ? 'Compra' : 'Venda'} de {t.asset?.symbol ?? 'ativo'}
                  </span>
                  <span className="block text-xs text-dark-500">
                    {Number(t.quantity).toLocaleString('pt-BR')} un. em {new Date(`${t.date.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')}
                  </span>
                </span>
                <span className="whitespace-nowrap text-sm font-medium text-dark-800">{formatCurrency(Number(t.total ?? t.quantity * t.price))}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-8 text-center text-sm text-dark-500">Nenhuma operação registrada.</p>
      )}
    </PanelCard>
  );
}

export function InsightsPanel({ insights }: { insights: string[] | null }) {
  return (
    <motion.section
      className="relative overflow-hidden rounded-panel border border-accent-500/25 p-5 sm:p-6"
      style={{ background: 'radial-gradient(120% 100% at 100% 0%, rgb(var(--accent-500) / 0.1), transparent 60%), rgb(var(--surface))' }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35, ease: EASE }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-dark-900">
          <Sparkles className="h-4 w-4 text-accent-400" aria-hidden="true" /> Insights da IA
        </h2>
        {!insights && <span className="chip-planned">Planejado</span>}
      </div>
      {insights?.length ? (
        <ul className="mt-4 space-y-2">
          {insights.slice(0, 3).map((text, i) => (
            <li key={i} className="rounded-xl border border-dark-200/70 bg-dark-50/50 px-3.5 py-2.5 text-sm text-dark-700">{text}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-dark-600">
          A IA vai explicar, em linguagem simples, os indicadores calculados para a sua carteira. Ainda não está integrada, então nenhum insight é exibido.
        </p>
      )}
    </motion.section>
  );
}
