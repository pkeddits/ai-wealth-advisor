import { useEffect } from 'react';
import { useMotionValue, useSpring, type MotionValue } from 'motion/react';
import { useRichMotion } from './useRichMotion';

/** Posição normalizada do cursor na janela (-1 a 1), suavizada por mola. */
export function usePointerParallax(): { x: MotionValue<number>; y: MotionValue<number>; enabled: boolean } {
  const enabled = useRichMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 60, damping: 18, mass: 0.6 });
  const y = useSpring(rawY, { stiffness: 60, damping: 18, mass: 0.6 });

  useEffect(() => {
    if (!enabled) {
      rawX.set(0);
      rawY.set(0);
      return;
    }
    const onMove = (e: PointerEvent) => {
      rawX.set((e.clientX / window.innerWidth) * 2 - 1);
      rawY.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [enabled, rawX, rawY]);

  return { x, y, enabled };
}
