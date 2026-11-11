import type { ReactNode } from 'react';
import { motion, useReducedMotion, useTransform, type MotionValue } from 'motion/react';
import clsx from 'clsx';

interface FloatCardProps {
  children: ReactNode;
  className?: string;
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  /** Intensidade do parallax (px de deslocamento no extremo do cursor). */
  depth: number;
  delay: number;
  /** Período da flutuação contínua, em segundos; 0 desativa. */
  floatPeriod?: number;
  rich: boolean;
}

export function FloatCard({ children, className, pointerX, pointerY, depth, delay, floatPeriod = 7, rich }: FloatCardProps) {
  const reduced = useReducedMotion();
  const x = useTransform(pointerX, (v) => v * depth);
  const y = useTransform(pointerY, (v) => v * depth * 0.7);

  return (
    <motion.div className={clsx('absolute', className)} style={{ x, y }}>
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 28, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          animate={rich && floatPeriod ? { y: [0, -7, 0] } : undefined}
          transition={rich && floatPeriod ? { duration: floatPeriod, delay: delay + 0.9, repeat: Infinity, ease: 'easeInOut' } : undefined}
        >
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
