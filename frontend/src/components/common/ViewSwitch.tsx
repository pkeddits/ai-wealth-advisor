import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import clsx from 'clsx';

interface Option<T extends string> { value: T; label: string }

/** Alternador de visões com destaque deslizante. As opções sempre têm rótulo visível. */
export function ViewSwitch<T extends string>({ value, options, onChange, id, label }: { value: T; options: Option<T>[]; onChange: (v: T) => void; id: string; label: string }) {
  const index = options.findIndex((o) => o.value === value);
  return (
    <div className="inline-flex items-center gap-2">
      <div role="tablist" aria-label={label} className="inline-flex rounded-2xl border border-dark-200/70 bg-dark-100/40 p-1 backdrop-blur">
        {options.map((o) => (
          <button key={o.value} type="button" role="tab" aria-selected={o.value === value} onClick={() => onChange(o.value)} className={clsx('relative rounded-xl px-4 py-2 text-sm font-medium transition-colors', o.value === value ? 'text-dark-900' : 'text-dark-500 hover:text-dark-800')}>
            {o.value === value && <motion.span layoutId={`switch-${id}`} className="absolute inset-0 rounded-xl border border-primary-500/35 bg-gradient-to-r from-primary-500/20 to-blue-500/15 shadow-[0_6px_20px_-10px_rgb(var(--violet)/0.8)]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <span className="relative">{o.label}</span>
          </button>
        ))}
      </div>
      {options.length === 2 && (
        <motion.button type="button" onClick={() => onChange(options[(index + 1) % 2].value)} aria-label={`Ir para ${options[(index + 1) % 2].label}`} className="hidden h-9 w-9 items-center justify-center rounded-xl border border-dark-200/70 text-dark-500 transition-colors hover:border-primary-500/40 hover:text-primary-700 sm:flex" animate={{ rotate: index === 1 ? 180 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }}>
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      )}
    </div>
  );
}
