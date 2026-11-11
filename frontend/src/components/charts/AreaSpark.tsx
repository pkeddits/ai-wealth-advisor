import { useId, useMemo } from 'react';
import clsx from 'clsx';
import { scaleSeries, smoothPath } from '../../lib/svgPath';

interface AreaSparkProps {
  values: number[];
  className?: string;
  /** Anima o traçado na montagem (desativado por prefers-reduced-motion via CSS). */
  animate?: boolean;
  tone?: 'primary' | 'accent';
}

const W = 600;
const H = 200;

export function AreaSpark({ values, className, animate = false, tone = 'primary' }: AreaSparkProps) {
  const id = useId();
  const { line, area, last } = useMemo(() => {
    const points = scaleSeries(values, W, H, 12);
    const path = smoothPath(points);
    return { line: path, area: `${path} L${W},${H} L0,${H} Z`, last: points[points.length - 1] };
  }, [values]);
  const color = tone === 'primary' ? 'var(--primary-500)' : 'var(--accent-500)';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={clsx('overflow-visible', className)} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`rgb(${color})`} stopOpacity="0.28" />
          <stop offset="100%" stopColor={`rgb(${color})`} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="rgb(var(--dark-200))" strokeDasharray="2 6" vectorEffect="non-scaling-stroke" />
      ))}
      <path d={area} fill={`url(#${id}-fill)`} className={animate ? 'animate-fade-in [animation-delay:600ms]' : undefined} />
      <path
        d={line}
        fill="none"
        stroke={`rgb(${color})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        pathLength={1}
        strokeDasharray={animate ? 1 : undefined}
        className={animate ? 'animate-draw' : undefined}
      />
      <circle cx={last.x} cy={last.y} r="5" fill={`rgb(${color})`} className={animate ? 'animate-fade-in [animation-delay:1400ms]' : undefined} />
    </svg>
  );
}
