import clsx from 'clsx';
import type { DonutSlice } from './DonutRing';

export function SegmentBar({ slices, className }: { slices: DonutSlice[]; className?: string }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className={clsx('flex h-2 w-full gap-1 overflow-hidden rounded-full', className)} role="img" aria-label={slices.map((s) => `${s.label} ${Math.round((s.value / total) * 100)}%`).join(', ')}>
      {slices.map((s) => (
        <span key={s.label} className="h-full rounded-full" style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />
      ))}
    </div>
  );
}
