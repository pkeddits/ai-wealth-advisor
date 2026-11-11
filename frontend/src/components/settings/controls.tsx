import { useId, type ReactNode } from 'react';
import { motion } from 'motion/react';
import clsx from 'clsx';

export function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border p-0.5 transition-colors duration-300 focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-40',
        checked ? 'justify-end border-primary-500/50 bg-primary-500/80' : 'justify-start border-dark-300 bg-dark-100',
      )}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 600, damping: 34 }}
        className={clsx('h-5 w-5 rounded-full shadow-[0_2px_6px_rgb(0_0_0/0.35)]', checked ? 'bg-on-brand' : 'bg-dark-500')}
      />
    </button>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
  disabled?: boolean;
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (value: T) => void; options: SegmentOption<T>[]; label: string }) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex max-w-full flex-wrap gap-1 rounded-2xl border border-dark-200/70 bg-dark-100/50 p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            title={option.hint}
            className={clsx(
              'relative rounded-xl px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
              active ? 'text-dark-900' : 'text-dark-500 hover:text-dark-800',
            )}
          >
            {active && (
              <motion.span
                layoutId={`${id}-pill`}
                className="absolute inset-0 rounded-xl border border-primary-500/35 bg-surface shadow-[0_6px_16px_-8px_rgb(var(--violet)/0.6)]"
                transition={{ type: 'spring', stiffness: 460, damping: 36 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SettingsSection({ id, title, description, children, icon }: { id: string; title: string; description: string; children: ReactNode; icon: ReactNode }) {
  return (
    <motion.section
      id={id}
      className="panel scroll-mt-28 p-6 sm:p-8"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      aria-labelledby={`${id}-title`}
    >
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-dark-200 bg-dark-100 text-primary-700">{icon}</span>
        <div>
          <h2 id={`${id}-title`} className="font-display text-xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-dark-500">{description}</p>
        </div>
      </div>
      <div className="mt-6 divide-y divide-dark-200/60">{children}</div>
    </motion.section>
  );
}

export function SettingRow({ title, description, children, status }: { title: string; description?: ReactNode; children?: ReactNode; status?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between md:gap-8">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-dark-900">
          {title}
          {status}
        </p>
        {description && <div className="mt-1 text-sm text-dark-500">{description}</div>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

export function SavedNote({ show, children = 'Salvo' }: { show: boolean; children?: ReactNode }) {
  return (
    <motion.span
      className="text-sm text-green-600"
      initial={false}
      animate={{ opacity: show ? 1 : 0, y: show ? 0 : 4 }}
      transition={{ duration: 0.25 }}
      aria-live="polite"
    >
      {show ? children : ''}
    </motion.span>
  );
}
