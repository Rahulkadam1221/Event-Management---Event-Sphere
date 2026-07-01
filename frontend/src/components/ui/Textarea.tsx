import React from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className, disabled, rows = 4, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 tracking-wide uppercase">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          disabled={disabled}
          rows={rows}
          className={cn(
            'w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200 text-sm resize-y disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
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

Textarea.displayName = 'Textarea';
