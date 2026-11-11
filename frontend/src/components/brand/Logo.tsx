import { useId } from 'react';
import clsx from 'clsx';

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
  size?: 'sm' | 'md';
}

export function LogoMark({ className }: { className?: string }) {
  const gradientId = useId();
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="rgb(var(--accent-500))" />
          <stop offset="100%" stopColor="rgb(var(--primary-500))" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="11" fill="rgb(var(--surface-raised))" stroke="rgb(var(--dark-200))" />
      <path
        d="M9 27.5c3.2 0 3.9-7 7.1-7s3.4 4.2 6.3 4.2S26.6 12 31 12"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="31" cy="12" r="2.6" fill="rgb(var(--primary-500))" />
    </svg>
  );
}

export function Logo({ className, showWordmark = true, size = 'md' }: LogoProps) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'} />
      {showWordmark && (
        <span className={clsx('font-display font-semibold tracking-tight text-dark-900', size === 'sm' ? 'text-sm' : 'text-base')}>
          AI Wealth Advisor
        </span>
      )}
    </span>
  );
}
