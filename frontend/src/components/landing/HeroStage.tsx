import { motion, useReducedMotion, useTransform, type MotionValue } from 'motion/react';
import { ArrowDownRight, ArrowUpRight, Check, ShoppingBag, Sparkles } from 'lucide-react';
import { AreaSpark, SERIES_COLORS, EXPENSE_COLOR } from '../charts';
import { FloatCard } from './FloatCard';

const SERIES = [31.2, 31.9, 31.4, 32.8, 33.6, 33.1, 34.9, 35.6, 35.2, 36.8, 38.1, 37.6, 39.4, 41.2, 40.6, 42.9, 44.1, 43.7, 45.8, 48.2];

const ALLOCATION = [
  { label: 'Ações', value: 46 },
  { label: 'Renda fixa', value: 28 },
  { label: 'FIIs', value: 17 },
  { label: 'ETFs', value: 9 },
];

const HOLDINGS = [
  { symbol: 'ITUB4', name: 'Itaú Unibanco PN', value: 'R$ 12.410,00', change: '+8,2%', up: true },
  { symbol: 'SELIC29', name: 'Tesouro Selic 2029', value: 'R$ 13.500,00', change: '+2,7%', up: true },
  { symbol: 'MXRF11', name: 'Maxi Renda FII', value: 'R$ 8.196,60', change: '-1,4%', up: false },
];

interface HeroStageProps {
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  tilt: MotionValue<number>;
  rich: boolean;
}

export function HeroStage({ pointerX, pointerY, tilt, rich }: HeroStageProps) {
  const reduced = useReducedMotion();
  const panelX = useTransform(pointerX, (v) => v * 6);
  const panelRotateY = useTransform(pointerX, (v) => v * 3);

  return (
    <div className="relative mx-auto w-full max-w-[1080px] [perspective:1800px]" role="img" aria-label="Ilustração do painel com valores fictícios">
      <motion.div
        className="relative mx-auto w-full max-w-[860px] origin-bottom"
        style={{ rotateX: tilt, rotateY: panelRotateY, x: panelX, transformStyle: 'preserve-3d' }}
        initial={reduced ? false : { opacity: 0, y: 120 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.3, delay: 0.85, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="fx-decor pointer-events-none absolute inset-x-[8%] -bottom-10 h-32 rounded-[50%] bg-primary-500/25 blur-3xl" aria-hidden="true" />
        <div className="panel-raised relative overflow-hidden !rounded-[28px] p-2 shadow-[0_40px_80px_-40px_rgb(var(--indigo)/0.6)]">
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-dark-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-dark-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-dark-300" />
            </div>
            <span className="chip-planned">Ilustração</span>
          </div>

          <div className="grid gap-2 rounded-[22px] bg-dark-50/60 p-2 md:grid-cols-[1.55fr_1fr]">
            <div className="panel-feature p-5 sm:p-6">
              <p className="text-xs text-dark-500">Patrimônio total</p>
              <p className="mt-1 whitespace-nowrap text-[1.9rem] font-semibold tracking-tight text-dark-900 sm:text-[2.6rem]">
                R$ 48.215<span className="text-dark-500">,40</span>
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /> 5,2% em 30 dias
              </p>
              <AreaSpark values={SERIES} animate className="mt-5 h-28 w-full sm:h-36" />
            </div>

            <div className="flex flex-col gap-2">
              <div className="panel p-4">
                <p className="text-xs text-dark-500">Distribuição</p>
                <div className="mt-3 flex h-2 gap-1 overflow-hidden rounded-full">
                  {ALLOCATION.map((a, i) => (
                    <motion.span
                      key={a.label}
                      className="h-full rounded-full"
                      style={{ background: SERIES_COLORS[i] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${a.value}%` }}
                      transition={{ duration: 1, delay: 1.6 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                    />
                  ))}
                </div>
                <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  {ALLOCATION.map((a, i) => (
                    <li key={a.label} className="flex items-center gap-1.5 text-dark-600">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: SERIES_COLORS[i] }} aria-hidden="true" />
                      {a.label}
                      <span className="ml-auto text-dark-800">{a.value}%</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="panel flex-1 p-4">
                <p className="text-xs text-dark-500">Principais posições</p>
                <ul className="mt-2 divide-y divide-dark-200/60">
                  {HOLDINGS.map((h) => (
                    <li key={h.symbol} className="flex items-center gap-3 py-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-dark-100 text-[10px] font-semibold text-primary-700">{h.symbol.slice(0, 2)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium text-dark-900">{h.symbol}</span>
                        <span className="block truncate text-[11px] text-dark-500">{h.name}</span>
                      </span>
                      <span className="text-right">
                        <span className="block text-xs text-dark-800">{h.value}</span>
                        <span className={`block text-[11px] ${h.up ? 'text-green-600' : 'text-red-600'}`}>{h.change}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <FloatCard className="hidden xl:left-[-120px] xl:top-[6%] xl:block" pointerX={pointerX} pointerY={pointerY} depth={22} delay={1.55} floatPeriod={7} rich={rich}>
        <div className="panel-glass w-56 p-4">
          <p className="text-xs text-dark-500">Resultado acumulado</p>
          <p className="mt-1 text-xl font-semibold text-green-600">+R$ 2.384,10</p>
          <div className="mt-3 flex h-8 items-end gap-1" aria-hidden="true">
            {[38, 52, 44, 61, 58, 72, 66, 84].map((h, i) => (
              <motion.span
                key={i}
                className="flex-1 rounded-sm bg-gradient-to-t from-primary-500/30 to-primary-500"
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.7, delay: 1.9 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}
          </div>
        </div>
      </FloatCard>

      <FloatCard className="hidden xl:bottom-[-4%] xl:left-[-90px] xl:block" pointerX={pointerX} pointerY={pointerY} depth={34} delay={1.75} floatPeriod={8.5} rich={rich}>
        <div className="panel-glass flex w-[270px] items-center gap-3 p-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-500/15 text-green-600">
            <Check className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-dark-900">Compra registrada</p>
            <p className="truncate text-xs text-dark-500">ITUB4, 100 unidades a R$ 31,20</p>
          </div>
        </div>
      </FloatCard>

      <FloatCard className="hidden xl:right-[-124px] xl:top-[-4%] xl:block" pointerX={pointerX} pointerY={pointerY} depth={28} delay={1.95} floatPeriod={9} rich={rich}>
        <div className="panel-glass w-64 !border-accent-500/30 p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-accent-400">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Explicação com IA
          </p>
          <p className="mt-2 text-sm leading-snug text-dark-700">Quase metade do patrimônio está em ações. Entenda como isso afeta a variação da carteira.</p>
        </div>
      </FloatCard>

      <FloatCard className="hidden xl:bottom-[2%] xl:right-[-104px] xl:block" pointerX={pointerX} pointerY={pointerY} depth={40} delay={2.15} floatPeriod={7.8} rich={rich}>
        <div className="panel-glass w-56 p-4">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs text-dark-500">
              <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" /> Gastos do mês
            </p>
          </div>
          <p className="mt-1.5 flex items-center gap-2 text-lg font-semibold text-dark-900">
            R$ 3.140,90
            <span className="inline-flex items-center rounded-full bg-red-500/10 px-1.5 py-px text-[11px] font-medium text-red-600">
              <ArrowDownRight className="h-3 w-3" aria-hidden="true" />4%
            </span>
          </p>
          <div className="mt-3 space-y-1.5" aria-hidden="true">
            {[78, 52, 34].map((w, i) => (
              <div key={i} className="h-1.5 rounded-full bg-dark-100">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: EXPENSE_COLOR }}
                  initial={{ width: 0 }}
                  animate={{ width: `${w}%` }}
                  transition={{ duration: 0.9, delay: 2.4 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            ))}
          </div>
        </div>
      </FloatCard>
    </div>
  );
}
