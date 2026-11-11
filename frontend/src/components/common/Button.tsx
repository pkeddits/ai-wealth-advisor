import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  /** Ícone exibido à esquerda do texto (oculto enquanto loading) */
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, children, className, icon, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-0 font-semibold rounded-control transition-[background-color,border-color,box-shadow,transform,color] duration-200 ease-out active:scale-[0.98] focus:outline-none focus-visible:shadow-focus disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';
    
    const variantStyles = {
      primary: 'bg-primary-500 text-dark-50 hover:bg-primary-700 hover:shadow-glow',
      secondary: 'border border-dark-200 bg-dark-100 text-dark-900 hover:border-dark-300 hover:bg-dark-200',
      danger: 'border border-red-500/30 bg-red-500/15 text-red-700 hover:bg-red-500/25',
      ghost: 'bg-transparent text-dark-600 hover:bg-dark-100 hover:text-dark-900',
    };
    
    const sizeStyles = {
      sm: 'h-9 px-3 text-sm',
      md: 'h-11 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };
    
    return (
      <button
        ref={ref}
        className={clsx(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {icon && !loading && (
          <span className={clsx('inline-flex shrink-0', children ? 'mr-2' : '')} aria-hidden="true">
            {icon}
          </span>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
