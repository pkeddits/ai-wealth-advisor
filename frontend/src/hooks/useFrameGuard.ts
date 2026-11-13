import { useEffect } from 'react';

// A leitura de FPS serve apenas para reduzir efeitos custosos em lentidão sustentada.
// Um pico de carregamento ou a primeira rolagem nunca deve desativar o motion do produto.
const LOW_FPS_THRESHOLD = 18;
const RECOVERY_FPS_THRESHOLD = 35;
const REQUIRED_LOW_SAMPLES = 3;
const REQUIRED_RECOVERY_SAMPLES = 2;
const INITIAL_DELAY_MS = 6000;
const SAMPLE_MS = 2000;
const BETWEEN_SAMPLES_MS = 4500;

function sample(duration: number, done: (fps: number) => void) {
  let frames = 0;
  let start = 0;
  let raf = 0;
  const tick = (time: number) => {
    if (start === 0) start = time;
    frames++;
    const elapsed = time - start;
    if (elapsed < duration) raf = requestAnimationFrame(tick);
    else done((frames * 1000) / Math.max(1, elapsed));
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

/**
 * Apenas suspende efeitos ambientais custosos quando há lentidão persistente.
 * Mantém o cenário, os balões e as microinterações visíveis. Recupera quando
 * o dispositivo volta a acompanhar o ritmo e não persiste o diagnóstico.
 */
export function useFrameGuard() {
  useEffect(() => {
    const root = document.documentElement;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelSample: (() => void) | undefined;
    let lowSamples = 0;
    let recoverySamples = 0;

    const schedule = (delay: number) => {
      timer = setTimeout(measure, delay);
    };

    const measure = () => {
      if (stopped) return;
      if (document.hidden) {
        lowSamples = 0;
        recoverySamples = 0;
        schedule(BETWEEN_SAMPLES_MS);
        return;
      }

      cancelSample = sample(SAMPLE_MS, (fps) => {
        if (stopped) return;
        if (document.hidden) {
          lowSamples = 0;
          recoverySamples = 0;
        } else if (fps < LOW_FPS_THRESHOLD) {
          lowSamples++;
          recoverySamples = 0;
          if (lowSamples >= REQUIRED_LOW_SAMPLES) root.dataset.perf = 'low';
        } else if (fps >= RECOVERY_FPS_THRESHOLD) {
          lowSamples = 0;
          recoverySamples++;
          if (recoverySamples >= REQUIRED_RECOVERY_SAMPLES) delete root.dataset.perf;
        } else {
          lowSamples = 0;
          recoverySamples = 0;
        }
        schedule(BETWEEN_SAMPLES_MS);
      });
    };

    schedule(INITIAL_DELAY_MS);
    return () => {
      stopped = true;
      if (timer !== undefined) clearTimeout(timer);
      cancelSample?.();
    };
  }, []);
}
