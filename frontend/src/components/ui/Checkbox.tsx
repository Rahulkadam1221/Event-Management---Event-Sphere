import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id || React.useId();

    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor={inputId}
          className="flex items-center gap-3 cursor-pointer group select-none text-sm text-gray-700 dark:text-gray-300"
        >
          <div className="relative flex items-center">
            <input
              type="checkbox"
              id={inputId}
              ref={ref}
              className="sr-only peer"
              {...props}
            />
            <div
              className={cn(
                'w-5 h-5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 flex items-center justify-center transition-all duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-checked:bg-brand-500 peer-checked:border-brand-500 peer-checked:text-white group-hover:border-brand-400 dark:group-hover:border-brand-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
                error && 'border-red-500',
                className
              )}
            >
              <Check className="w-3.5 h-3.5 opacity-0 peer-checked:opacity-100 transition-opacity duration-150 stroke-[3px]" />
            </div>
          </div>
          {label && (
            <span className="font-medium group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-150">
              {label}
            </span>
          )}
        </label>
        {error && (
          <span className="text-xs font-medium text-red-500 ml-8">{error}</span>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
