import { useEffect, useRef } from 'react';
import { animate } from 'motion/react';
import { cueChange, DURATION, EASE_OUT, useCalmMotion, type CueTone } from './tokens';

interface AnimatedNumberProps {
  value: number;
  format: (value: number) => string;
  className?: string;
  duration?: number;
  /** Alta favorável (normal), desfavorável (inverse) ou sem sinal. */
  cue?: CueTone;
}

/**
 * Exibe a transição entre o valor anterior e o atual. Apenas a apresentação é
 * interpolada; o valor final mostrado é sempre exatamente `value`.
 */
export function AnimatedNumber({ value, format, className, duration = 0.9, cue = 'normal' }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(0);
  const reduced = useCalmMotion();
  const mounted = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const from = previous.current;
    if (mounted.current) cueChange(node, from, value, cue);
    mounted.current = true;
    if (reduced) {
      node.textContent = format(value);
      previous.current = value;
      return;
    }
    const controls = animate(from, value, {
      duration,
      ease: EASE_OUT,
      onUpdate: (v) => (node.textContent = format(v)),
      onComplete: () => (node.textContent = format(value)),
    });
    previous.current = value;
    return () => controls.stop();
  }, [value, format, duration, reduced, cue]);

  return (
    <span ref={ref} className={className ? `sensitive ${className}` : 'sensitive'} aria-label={format(value)}>
      {format(value)}
    </span>
  );
}

/** Valor monetário com centavos em tom secundário. */
export function MoneyFigure({ value, className, centsClassName = 'text-dark-500', rounded = false, cue = 'normal' }: { value: number; className?: string; centsClassName?: string; rounded?: boolean; cue?: CueTone }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(0);
  const reduced = useCalmMotion();
  const mounted = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const render = (v: number) => {
      const sign = v < -0.004 ? '-' : '';
      const [whole, cents] = Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: rounded ? 0 : 2, maximumFractionDigits: rounded ? 0 : 2 }).split(',');
      node.innerHTML = cents ? `${sign}R$&nbsp;${whole}<span class="${centsClassName}">,${cents}</span>` : `${sign}R$&nbsp;${whole}`;
    };
    const from = previous.current;
    if (mounted.current) cueChange(node, from, value, cue);
    mounted.current = true;
    if (reduced) {
      render(value);
      previous.current = value;
      return;
    }
    const controls = animate(from, value, {
      duration: DURATION.value + 0.1,
      ease: EASE_OUT,
      onUpdate: render,
      onComplete: () => render(value),
    });
    previous.current = value;
    return () => controls.stop();
  }, [value, reduced, centsClassName, rounded, cue]);

  return <span ref={ref} className={`sensitive ${className ?? ''}`} aria-label={value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />;
}
