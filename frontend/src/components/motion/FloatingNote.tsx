import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import clsx from 'clsx';

/**
 * Balão contextual preso à borda de um card. Mostra apenas informação derivada dos dados reais da tela,
 * não recebe cliques e fica fora da área de leitura dos valores.
 */
export function FloatingNote({ children, className, delay = 0.6, tone = 'brand' }: { children: ReactNode; className?: string; delay?: number; tone?: 'brand' | 'ok' | 'warn' }) {
  return (
    <motion.span
      aria-hidden="true"
      className={clsx(
        'float-note pointer-events-none absolute z-10 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium shadow-float',
        tone === 'ok' ? 'border-green-500/30 bg-surface-raised text-green-700' : tone === 'warn' ? 'border-yellow-500/30 bg-surface-raised text-yellow-700' : 'border-primary-500/30 bg-surface-raised text-primary-800',
        className,
      )}
      initial={{ opacity: 0, y: 8, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 22 }}
    >
      {children}
    </motion.span>
  );
}
