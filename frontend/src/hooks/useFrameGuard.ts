import { useEffect } from 'react';

const IDLE_MIN_FPS = 30;
const SCROLL_MIN_FPS = 40;

function markLow() {
  document.documentElement.dataset.perf = 'low';
  sessionStorage.setItem('aiwa.perf', 'low');
}

/** Conta quadros por um intervalo e informa a taxa média. */
function sample(duration: number, done: (fps: number) => void) {
  let frames = 0;
  let start = 0;
  let raf = 0;
  const tick = (t: number) => {
    if (!start) start = t;
    frames++;
    if (t - start < duration) raf = requestAnimationFrame(tick);
    else done((frames * 1000) / (t - start));
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

/**
 * Mede os quadros por segundo em repouso e na primeira rolagem. Se o aparelho não acompanhar,
 * desliga movimentos contínuos e camadas decorativas (data-perf="low") até o fim da sessão.
 */
export function useFrameGuard() {
  useEffect(() => {
    if (document.documentElement.dataset.perf === 'low') return;
    let cancelSample: (() => void) | null = null;
    const idle = setTimeout(() => {
      cancelSample = sample(2000, (fps) => fps < IDLE_MIN_FPS && markLow());
    }, 1500);
    const onScroll = () => {
      window.removeEventListener('scroll', onScroll);
      cancelSample?.();
      cancelSample = sample(1200, (fps) => fps < SCROLL_MIN_FPS && markLow());
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(idle);
      cancelSample?.();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);
}
