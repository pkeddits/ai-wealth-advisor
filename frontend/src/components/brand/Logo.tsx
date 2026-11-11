import { useId } from 'react';
import clsx from 'clsx';

export function LogoMark({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(var(--indigo))" />
          <stop offset="55%" stopColor="rgb(var(--violet))" />
          <stop offset="100%" stopColor="rgb(var(--azure))" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill={`url(#${id}-bg)`} />
      <rect x="0.5" y="0.5" width="39" height="39" rx="11.5" fill="none" stroke="rgb(255 255 255 / 0.28)" />
      <path d="M7 29.5c3.4-6.6 8-10 13-10s9.6 3.4 13 10" fill="none" stroke="white" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
      <path d="M12.5 24.5 18 17.8l4 3.4 6.5-9" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="28.5" cy="12.2" r="2.4" fill="white" />
    </svg>
  );
}

export function Logo({ className, showWordmark = true, size = 'md' }: { className?: string; showWordmark?: boolean; size?: 'sm' | 'md' }) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'} />
      {showWordmark && (
        <span className={clsx('font-display font-semibold tracking-tight text-dark-900', size === 'sm' ? 'text-[15px]' : 'text-[17px]')}>
          Wealth Advisor
          <span className="ml-1 align-top text-[0.62em] font-semibold tracking-normal text-primary-700">AI</span>
        </span>
      )}
    </span>
  );
}
