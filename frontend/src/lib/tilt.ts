import type { PointerEvent } from 'react';
import { spotlightHandler } from '../hooks/useSpotlight';

const motionAllowed = () => {
  const root = document.documentElement.dataset;
  return root.motion !== 'reduced' && root.motion !== 'off' && root.perf !== 'low' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Inclinação 3D leve com o ponteiro, escrita em variáveis CSS (sem re-render do React).
 * A intensidade vem de data-tilt (graus; padrão 5). Também move o brilho de .spotlight.
 */
export const tilt = {
  onPointerMove(event: PointerEvent<HTMLElement>) {
    spotlightHandler(event);
    if (event.pointerType !== 'mouse' || !motionAllowed()) return;
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    const max = Number(el.dataset.tilt ?? 5);
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty('--ry', `${(px * max).toFixed(2)}deg`);
    el.style.setProperty('--rx', `${(-py * max).toFixed(2)}deg`);
  },
  onPointerLeave(event: PointerEvent<HTMLElement>) {
    event.currentTarget.style.setProperty('--rx', '0deg');
    event.currentTarget.style.setProperty('--ry', '0deg');
  },
};
