import { useEffect } from 'react';

/**
 * Mede os quadros por segundo logo após a entrada na área logada. Abaixo de 30, desliga os
 * movimentos contínuos (data-perf="low") até o fim da sessão do navegador.
 */
export function useFrameGuard() {
  useEffect(() => {
    if (document.documentElement.dataset.perf === 'low') return;
    let frames = 0;
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      frames++;
      if (t - start < 2000) raf = requestAnimationFrame(tick);
      else if ((frames * 1000) / (t - start) < 30) {
        document.documentElement.dataset.perf = 'low';
        sessionStorage.setItem('aiwa.perf', 'low');
      }
    };
    const timer = setTimeout(() => { raf = requestAnimationFrame(tick); }, 1500);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, []);
}
