import type { PointerEvent } from 'react';

/** Atualiza as variáveis --mx/--my usadas pela classe .spotlight. */
export function spotlightHandler(event: PointerEvent<HTMLElement>) {
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${event.clientX - rect.left}px`);
  el.style.setProperty('--my', `${event.clientY - rect.top}px`);
}
