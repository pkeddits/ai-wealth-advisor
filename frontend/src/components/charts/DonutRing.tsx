import type { ReactNode } from 'react';
import clsx from 'clsx';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutRingProps {
  slices: DonutSlice[];
  className?: string;
  thickness?: number;
  children?: ReactNode;
}

export function DonutRing({ slices, className, thickness = 10, children }: DonutRingProps) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = 50 - thickness / 2;
  const circumference = 2 * Math.PI * r;
  const gap = slices.length > 1 ? 1.5 : 0;
  let offset = 0;

  return (
    <div className={clsx('relative', className)}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgb(var(--dark-100))" strokeWidth={thickness} />
        {slices.map((slice) => {
          const length = (slice.value / total) * circumference;
          const dash = Math.max(length - gap, 0);
          const el = (
            <circle
              key={slice.label}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={slice.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += length;
          return el;
        })}
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>}
    </div>
  );
}
