import type { ReactNode } from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';

type RevealVariant = 'up' | 'left' | 'right' | 'scale' | 'clip';

const EASE = [0.22, 1, 0.36, 1] as const;

const VARIANTS: Record<RevealVariant, Variants> = {
  up: { hidden: { opacity: 0, y: 32 }, visible: { opacity: 1, y: 0 } },
  left: { hidden: { opacity: 0, x: -40 }, visible: { opacity: 1, x: 0 } },
  right: { hidden: { opacity: 0, x: 40 }, visible: { opacity: 1, x: 0 } },
  scale: { hidden: { opacity: 0, scale: 0.94, y: 16 }, visible: { opacity: 1, scale: 1, y: 0 } },
  clip: { hidden: { opacity: 0, clipPath: 'inset(12% 8% 12% 8% round 24px)' }, visible: { opacity: 1, clipPath: 'inset(0% 0% 0% 0% round 24px)' } },
};

interface RevealProps {
  children: ReactNode;
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article';
}

export function Reveal({ children, variant = 'up', delay = 0, duration = 0.8, className, as = 'div' }: RevealProps) {
  const Component = motion[as];
  const reduced = useReducedMotion();
  return (
    <Component
      className={className}
      variants={VARIANTS[variant]}
      initial={reduced ? false : 'hidden'}
      whileInView="visible"
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </Component>
  );
}

/** Container que revela os filhos (RevealItem) em sequência. */
export function RevealGroup({ children, className, stagger = 0.08 }: { children: ReactNode; className?: string; stagger?: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : 'hidden'}
      whileInView="visible"
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ staggerChildren: stagger }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className, variant = 'up' }: { children: ReactNode; className?: string; variant?: RevealVariant }) {
  return (
    <motion.div className={className} variants={VARIANTS[variant]} transition={{ duration: 0.7, ease: EASE }}>
      {children}
    </motion.div>
  );
}
