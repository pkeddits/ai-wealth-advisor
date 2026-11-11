import { Sparkles, TrendingUp } from 'lucide-react';
import { AreaSpark, SegmentBar, SERIES_COLORS, EXPENSE_COLOR } from '../charts';

const SERIES = [31.2, 31.9, 31.4, 32.8, 33.6, 33.1, 34.9, 35.6, 35.2, 36.8, 38.1, 37.6, 39.4, 41.2, 40.6, 42.9, 44.1, 43.7, 45.8, 48.2];

const ALLOCATION = [
  { label: 'Ações', value: 46, color: SERIES_COLORS[0] },
  { label: 'Renda fixa', value: 28, color: SERIES_COLORS[1] },
  { label: 'FIIs', value: 17, color: SERIES_COLORS[2] },
  { label: 'ETFs', value: 9, color: SERIES_COLORS[3] },
];

const SPENDING = [
  { label: 'Moradia', value: 82 },
  { label: 'Mercado', value: 54 },
  { label: 'Transporte', value: 31 },
  { label: 'Lazer', value: 22 },
];

export function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[560px] sm:mb-36 lg:mr-0" aria-label="Ilustração do painel com valores fictícios" role="img">
      <div className="panel-raised relative overflow-hidden p-5 sm:p-6 animate-rise [animation-delay:150ms]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-dark-500">Patrimônio total</p>
            <p className="mt-1 whitespace-nowrap font-display text-[1.6rem] font-semibold tracking-tight text-dark-900 sm:text-4xl">R$ 48.215,40</p>
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
              +R$ 2.384,10 em 30 dias
            </p>
          </div>
          <span className="chip-planned shrink-0">Ilustração</span>
        </div>

        <AreaSpark values={SERIES} animate className="mt-6 h-36 w-full sm:h-44" />

        <div className="mt-6">
          <div className="mb-2.5 flex items-center justify-between text-xs text-dark-500">
            <span>Distribuição</span>
            <span>4 classes</span>
          </div>
          <SegmentBar slices={ALLOCATION} />
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
            {ALLOCATION.map((a) => (
              <li key={a.label} className="flex items-center gap-2 whitespace-nowrap text-dark-600">
                <span className="h-2 w-2 rounded-full" style={{ background: a.color }} aria-hidden="true" />
                {a.label}
                <span className="text-dark-800">{a.value}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="panel absolute -bottom-44 -left-4 hidden w-56 p-4 sm:block lg:-left-12 animate-rise [animation-delay:450ms]">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-dark-800">Gastos do mês</p>
          <span className="chip-building">Em breve</span>
        </div>
        <ul className="mt-3 space-y-2">
          {SPENDING.map((s) => (
            <li key={s.label} className="text-xs text-dark-500">
              <div className="mb-1 flex justify-between">
                <span>{s.label}</span>
              </div>
              <div className="h-1.5 rounded-full bg-dark-100">
                <div className="h-full rounded-full" style={{ width: `${s.value}%`, background: EXPENSE_COLOR, opacity: 0.85 }} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="absolute -right-2 -top-6 hidden max-w-[240px] rounded-2xl border border-accent-500/30 bg-surface-raised/90 p-3.5 shadow-panel backdrop-blur md:block lg:-right-8 animate-rise [animation-delay:700ms]">
        <p className="flex items-center gap-1.5 text-xs font-medium text-accent-400">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Análise com IA (planejada)
        </p>
        <p className="mt-1.5 text-sm leading-snug text-dark-700">
          Quase metade do patrimônio está em ações. Veja como isso afeta a variação da carteira.
        </p>
      </div>
    </div>
  );
}
