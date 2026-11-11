import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(({ label, error, id, ...props }, ref) => {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? props.name;
  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-dark-700">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={clsx(
            'h-11 w-full rounded-control border bg-dark-50/70 pl-3 pr-11 text-dark-900 placeholder:text-dark-400 transition-[border-color,box-shadow] duration-200 focus:border-primary-500/70 focus:shadow-focus focus:outline-none',
            error ? 'border-red-500/70' : 'border-dark-200',
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-dark-500 hover:text-dark-800"
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

PasswordInput.displayName = 'PasswordInput';
