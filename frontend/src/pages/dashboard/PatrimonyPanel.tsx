import { motion } from 'motion/react';
import { ArrowDownRight, ArrowUpRight, LineChart } from 'lucide-react';
import clsx from 'clsx';
import { MoneyFigure, AnimatedNumber } from '../../components/motion';
import { TimelineArea, type TimelinePoint } from '../../components/charts';
import { useDisplayFormat } from '../../lib/displayFormat';

const shortDate = (d: string) => d.slice(8, 10) + '/' + d.slice(5, 7);

interface PatrimonyPanelProps {
  totalValue: number | null;
  totalInvested: number;
  totalReturn: number | null;
  totalReturnPct: number | null;
  marketAvailable: boolean;
  timeline: TimelinePoint[];
}

export function PatrimonyPanel({ totalValue, totalInvested, totalReturn, totalReturnPct, marketAvailable, timeline }: PatrimonyPanelProps) {
  const fmt = useDisplayFormat();
  const positive = (totalReturn ?? 0) >= 0;
  const Trend = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <section className="panel-feature overflow-hidden p-6 sm:p-8" aria-labelledby="patrimonio-titulo">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary-500/20 blur-[90px]" aria-hidden="true" />
      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div>
          <p id="patrimonio-titulo" className="text-sm text-dark-500">{marketAvailable ? 'Patrimônio total' : 'Capital aplicado'}</p>
          <MoneyFigure value={marketAvailable ? totalValue ?? 0 : totalInvested} rounded={fmt.rounded} className="mt-2 block whitespace-nowrap text-[2.4rem] font-semibold leading-none tracking-[-0.03em] text-dark-900 sm:text-[3.4rem]" />
          {!marketAvailable ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="chip-building">Cotações ainda não integradas</span>
              <span className="text-sm text-dark-500">Valor de mercado e resultado aparecem quando as cotações forem conectadas.</span>
            </div>
          ) : (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {fmt.returnDisplay !== 'absolute' && totalReturnPct !== null && (
              <span className={clsx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium', positive ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600')}>
                <Trend className="h-4 w-4" aria-hidden="true" />
                <AnimatedNumber value={totalReturnPct} format={fmt.percent} />
              </span>
            )}
            {fmt.returnDisplay !== 'percent' && totalReturn !== null && (
              <span className={clsx('text-sm font-medium', positive ? 'text-green-600' : 'text-red-600')}>
                <AnimatedNumber value={totalReturn} format={fmt.signedMoney} />
              </span>
            )}
            <span className="text-sm text-dark-500">resultado não realizado</span>
          </div>
          )}
        </div>
        {marketAvailable ? (
          <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <dt className="text-dark-500">Capital aplicado</dt>
            <dt className="text-dark-500">Valor de mercado</dt>
            <dd className="font-medium text-dark-900"><AnimatedNumber value={totalInvested} format={fmt.money} /></dd>
            <dd className="font-medium text-dark-900">{totalValue === null ? null : <AnimatedNumber value={totalValue} format={fmt.money} />}</dd>
          </dl>
        ) : (
          <dl className="text-sm">
            <dt className="text-dark-500">Valor de mercado</dt>
            <dd className="mt-1 font-medium text-dark-500">Cotação pendente</dd>
          </dl>
        )}
      </div>

      <div className="relative mt-8">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium text-dark-800">Evolução do capital aplicado</h3>
          <p className="text-xs text-dark-500">Custo das posições após cada data de operação</p>
        </div>
        {timeline.length >= 2 ? (
          <motion.div className="[&_.recharts-area-curve]:drop-shadow-[0_8px_16px_rgb(var(--violet)/0.45)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <TimelineArea data={timeline} formatValue={fmt.money} formatDate={shortDate} label="Capital aplicado" height={240} />
            <p className="mt-2 text-xs text-dark-500">
              Período de {fmt.date(timeline[0].date)} a {fmt.date(timeline[timeline.length - 1].date)}. A evolução a preço de mercado depende do histórico de cotações, ainda em desenvolvimento.
            </p>
          </motion.div>
        ) : (
          <div className="flex h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-dark-200 bg-dark-50/40 text-center">
            <LineChart className="h-8 w-8 text-dark-400" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-dark-700">O gráfico aparece a partir de duas datas de operação</p>
            <p className="mt-1 max-w-sm text-xs text-dark-500">Registre compras em dias diferentes para acompanhar como o capital aplicado evolui.</p>
          </div>
        )}
      </div>
    </section>
  );
}
