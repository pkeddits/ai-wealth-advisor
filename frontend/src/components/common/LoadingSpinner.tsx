import clsx from 'clsx';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <div className={clsx('flex items-center justify-center', className)} role="status" aria-label="Carregando">
      <span className={clsx('relative block', sizeClasses[size])}>
        <span className="absolute inset-0 rounded-full border-2 border-dark-200" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary-500 border-r-primary-500/40 [animation-duration:0.9s]" />
        {size !== 'sm' && <span className="absolute inset-[30%] animate-pulse-soft rounded-full bg-primary-500/40 blur-[2px]" />}
      </span>
    </div>
  );
}
