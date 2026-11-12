import { useEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'motion/react';

interface AnimatedNumberProps {
  value: number;
  format: (value: number) => string;
  className?: string;
  duration?: number;
}

/**
 * Exibe a transição entre o valor anterior e o atual. Apenas a apresentação é
 * interpolada; o valor final mostrado é sempre exatamente `value`.
 */
export function AnimatedNumber({ value, format, className, duration = 0.9 }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduced) {
      node.textContent = format(value);
      previous.current = value;
      return;
    }
    const controls = animate(previous.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => (node.textContent = format(v)),
      onComplete: () => (node.textContent = format(value)),
    });
    previous.current = value;
    return () => controls.stop();
  }, [value, format, duration, reduced]);

  return (
    <span ref={ref} className={className ? `sensitive ${className}` : 'sensitive'} aria-label={format(value)}>
      {format(value)}
    </span>
  );
}

/** Valor monetário com centavos em tom secundário. */
export function MoneyFigure({ value, className, centsClassName = 'text-dark-500', rounded = false }: { value: number; className?: string; centsClassName?: string; rounded?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const render = (v: number) => {
      const sign = v < -0.004 ? '-' : '';
      const [whole, cents] = Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: rounded ? 0 : 2, maximumFractionDigits: rounded ? 0 : 2 }).split(',');
      node.innerHTML = cents ? `${sign}R$&nbsp;${whole}<span class="${centsClassName}">,${cents}</span>` : `${sign}R$&nbsp;${whole}`;
    };
    if (reduced) {
      render(value);
      previous.current = value;
      return;
    }
    const controls = animate(previous.current, value, {
      duration: 1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: render,
      onComplete: () => render(value),
    });
    previous.current = value;
    return () => controls.stop();
  }, [value, reduced, centsClassName, rounded]);

  return <span ref={ref} className={`sensitive ${className ?? ''}`} aria-label={value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />;
}
