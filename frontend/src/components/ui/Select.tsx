import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  label?: string;
  error?: string;
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, label, error, helperText, className, disabled, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 tracking-wide uppercase">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200 text-sm appearance-none disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-red-500 focus:ring-red-500',
              className
            )}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500 dark:text-gray-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && (
          <span className="text-xs font-medium text-red-500">{error}</span>
        )}
        {!error && helperText && (
          <span className="text-xs text-gray-500 dark:text-gray-400">{helperText}</span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
