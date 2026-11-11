import { useId, useMemo } from 'react';
import clsx from 'clsx';

interface SignalRibbonProps {
  className?: string;
  lines?: number;
  /** Variação vertical da onda, em unidades do viewBox. */
  amplitude?: number;
  /** Abertura vertical do feixe, em unidades do viewBox. */
  spread?: number;
}

const WIDTH = 1200;
const HEIGHT = 600;

/**
 * Fita de linhas em onda, elemento gráfico da identidade. As curvas são somas
 * de senoides com fase deslocada por linha, gerando um feixe coeso e determinístico.
 */
export function SignalRibbon({ className, lines = 28, amplitude = 90, spread = 140 }: SignalRibbonProps) {
  const gradientId = useId();
  const paths = useMemo(() => {
    const result: string[] = [];
    for (let i = 0; i < lines; i++) {
      const t = i / (lines - 1);
      const offset = (t - 0.5) * spread;
      let d = '';
      for (let x = 0; x <= WIDTH; x += 20) {
        const u = x / WIDTH;
        const y =
          HEIGHT / 2 +
          offset * (0.35 + 0.65 * Math.sin(Math.PI * u)) +
          Math.sin(u * Math.PI * 2.2 + t * 1.6) * amplitude * (0.6 + 0.4 * t) +
          Math.sin(u * Math.PI * 5.3 - t * 2.4) * amplitude * 0.18;
        d += `${x === 0 ? 'M' : 'L'}${x},${y.toFixed(1)}`;
      }
      result.push(d);
    }
    return result;
  }, [lines, amplitude, spread]);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className={clsx('pointer-events-none', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgb(var(--accent-500))" stopOpacity="0" />
          <stop offset="30%" stopColor="rgb(var(--accent-500))" stopOpacity="0.55" />
          <stop offset="70%" stopColor="rgb(var(--primary-500))" stopOpacity="0.6" />
          <stop offset="100%" stopColor="rgb(var(--primary-500))" stopOpacity="0" />
        </linearGradient>
      </defs>
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={i % 7 === 3 ? 1.6 : 0.8}
          opacity={0.25 + 0.75 * Math.sin((Math.PI * (i + 1)) / (lines + 1))}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
