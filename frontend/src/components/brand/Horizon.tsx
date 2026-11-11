import { useId } from 'react';
import { motion, useReducedMotion, type MotionValue } from 'motion/react';
import clsx from 'clsx';

interface HorizonProps {
  className?: string;
  /** Desloca o horizonte verticalmente (parallax de scroll). */
  offsetY?: MotionValue<number>;
  intensity?: 'full' | 'soft';
}

/**
 * Horizonte luminoso: arco de uma esfera vista de perto, com halo e um brilho
 * que percorre a borda. Elemento de assinatura da identidade.
 */
export function Horizon({ className, offsetY, intensity = 'full' }: HorizonProps) {
  const id = useId();
  const soft = intensity === 'soft';
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={clsx('pointer-events-none [mask-image:linear-gradient(to_bottom,black_40%,transparent_78%)]', className)}
      style={{ y: offsetY }}
      aria-hidden="true"
    >
      <motion.div
        className="absolute inset-x-[-20%] top-[18%] h-[70%] rounded-[50%]"
        style={{ background: 'radial-gradient(50% 50% at 50% 0%, rgb(var(--violet) / 0.5), rgb(var(--indigo) / 0.22) 40%, transparent 70%)' }}
        initial={reduced ? false : { opacity: 0, scale: 0.9 }}
        animate={{ opacity: soft ? 0.45 : 0.9, scale: 1 }}
        transition={{ duration: 1.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      />
      <svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMin slice" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id={`${id}-sphere`} cx="50%" cy="0%" r="75%">
            <stop offset="0%" stopColor="rgb(var(--indigo))" stopOpacity={soft ? 0.18 : 0.32} />
            <stop offset="55%" stopColor="rgb(var(--surface))" stopOpacity="0.9" />
            <stop offset="100%" stopColor="rgb(var(--dark-50))" stopOpacity="1" />
          </radialGradient>
          <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgb(var(--azure))" stopOpacity="0" />
            <stop offset="25%" stopColor="rgb(var(--azure))" stopOpacity="0.7" />
            <stop offset="50%" stopColor="rgb(var(--primary-800))" stopOpacity="1" />
            <stop offset="75%" stopColor="rgb(var(--violet))" stopOpacity="0.7" />
            <stop offset="100%" stopColor="rgb(var(--violet))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <ellipse cx="600" cy="1120" rx="980" ry="1000" fill={`url(#${id}-sphere)`} />
        <motion.path
          d="M -380 1120 A 980 1000 0 0 1 1580 1120"
          fill="none"
          stroke={`url(#${id}-rim)`}
          strokeWidth="18"
          strokeOpacity="0.35"
          initial={reduced ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: soft ? 0.5 : 0.9 }}
          transition={{ duration: 1.8, delay: 0.5, ease: [0.65, 0, 0.35, 1] }}
        />
        <motion.path
          d="M -380 1120 A 980 1000 0 0 1 1580 1120"
          fill="none"
          stroke={`url(#${id}-rim)`}
          strokeWidth="1.6"
          initial={reduced ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.8, delay: 0.5, ease: [0.65, 0, 0.35, 1] }}
        />
        {!soft && !reduced && (
          <motion.path
            d="M -380 1120 A 980 1000 0 0 1 1580 1120"
            fill="none"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeDasharray="0.05 0.95"
            pathLength={1}
            initial={{ strokeDashoffset: 0.6, opacity: 0 }}
            animate={{ strokeDashoffset: [0.6, -0.4], opacity: [0, 0.9, 0.9, 0] }}
            transition={{ duration: 7, delay: 2.4, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }}
          />
        )}
      </svg>
    </motion.div>
  );
}
