import { useState } from 'react';
import { motion } from 'motion/react';
import clsx from 'clsx';

export interface AllocationSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface AllocationDonutProps {
  slices: AllocationSlice[];
  formatValue: (value: number) => string;
  centerLabel?: string;
  className?: string;
  size?: number;
  /** Legenda abaixo do gráfico, para colunas estreitas. */
  stacked?: boolean;
}

const THICKNESS = 14;
const GAP = 1.6;

export function AllocationDonut({ slices, formatValue, centerLabel = 'Total', className, size = 220, stacked = false }: AllocationDonutProps) {
  const [active, setActive] = useState<string | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = 50 - THICKNESS / 2 - 2;
  const circumference = 2 * Math.PI * r;
  const focused = slices.find((s) => s.key === active);

  let offset = 0;
  const arcs = slices.map((slice, index) => {
    const length = total > 0 ? (slice.value / total) * circumference : 0;
    const arc = { slice, index, start: offset, length: Math.max(length - (slices.length > 1 ? GAP : 0), 0) };
    offset += length;
    return arc;
  });

  return (
    <div className={clsx('flex flex-col items-center gap-6', !stacked && 'sm:flex-row sm:items-center', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 overflow-visible" role="img" aria-label={slices.map((s) => `${s.label} ${((s.value / (total || 1)) * 100).toFixed(1)}%`).join(', ')}>
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgb(var(--dark-100))" strokeWidth={THICKNESS} />
          {arcs.map(({ slice, index, start, length }) => (
            <motion.circle
              key={slice.key}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={slice.color}
              strokeLinecap="butt"
              initial={{ strokeDasharray: `0 ${circumference}`, strokeWidth: THICKNESS }}
              animate={{
                strokeDasharray: `${length} ${circumference - length}`,
                strokeWidth: active === slice.key ? THICKNESS + 4 : THICKNESS,
                opacity: active && active !== slice.key ? 0.35 : 1,
              }}
              transition={{
                strokeDasharray: { duration: 1.1, delay: 0.15 + index * 0.08, ease: [0.22, 1, 0.36, 1] },
                strokeWidth: { duration: 0.25 },
                opacity: { duration: 0.25 },
              }}
              strokeDashoffset={-start}
              onMouseEnter={() => setActive(slice.key)}
              onMouseLeave={() => setActive(null)}
              className="cursor-pointer"
              style={{ filter: active === slice.key ? `drop-shadow(0 0 6px ${slice.color})` : undefined }}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-dark-500">{focused ? focused.label : centerLabel}</span>
          <span className="mt-1 text-lg font-semibold tracking-tight text-dark-900">{formatValue(focused ? focused.value : total)}</span>
          {focused && total > 0 && <span className="text-xs text-dark-500">{((focused.value / total) * 100).toFixed(1)}%</span>}
        </div>
      </div>

      <ul className={clsx('w-full min-w-0 flex-1', stacked ? 'space-y-0.5' : 'space-y-1')}>
        {slices.map((slice) => {
          const share = total > 0 ? (slice.value / total) * 100 : 0;
          return (
            <li key={slice.key}>
              <button
                type="button"
                onMouseEnter={() => setActive(slice.key)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(slice.key)}
                onBlur={() => setActive(null)}
                className={clsx(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors',
                  active === slice.key ? 'bg-dark-100' : 'hover:bg-dark-100/60',
                )}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: slice.color, boxShadow: `0 0 10px ${slice.color}` }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-sm text-dark-700">{slice.label}</span>
                <span className="text-sm font-medium text-dark-900">{share.toFixed(1)}%</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
