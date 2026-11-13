import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  /** Ícone exibido à esquerda do texto (oculto enquanto loading) */
  icon?: ReactNode;
}

const VARIANTS = {
  primary:
    'bg-brand text-on-brand shadow-[0_8px_24px_-10px_rgb(var(--violet)/0.7)] hover:shadow-glow [background-size:140%_100%] hover:[background-position:100%_0]',
  secondary: 'border border-dark-200 bg-dark-100/80 text-dark-900 hover:border-dark-300 hover:bg-dark-200/80',
  danger: 'border border-red-500/30 bg-red-500/15 text-red-700 hover:bg-red-500/25',
  ghost: 'bg-transparent text-dark-600 hover:bg-dark-100 hover:text-dark-900',
};

const SIZES = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, children, className, icon, ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(
        'group/btn relative isolate inline-flex items-center justify-center overflow-hidden whitespace-nowrap rounded-control font-semibold',
        'transition-[background-color,background-position,border-color,box-shadow,transform,color] duration-300 ease-out',
        'active:scale-[0.97] focus:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {variant === 'primary' && (
        <span
          className="pointer-events-none absolute inset-y-0 -left-1/2 -z-10 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-[transform,opacity] duration-700 ease-out group-hover/btn:translate-x-[320%] group-hover/btn:opacity-100"
          aria-hidden="true"
        />
      )}
      {loading && (
        <svg className="-ml-1 mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {icon && !loading && (
        <span className={clsx('inline-flex shrink-0 transition-transform duration-300 group-hover/btn:-translate-y-px', children ? 'mr-2' : '')} aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </button>
  ),
);

Button.displayName = 'Button';
