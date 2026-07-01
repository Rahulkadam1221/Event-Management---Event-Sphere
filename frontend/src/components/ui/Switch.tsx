import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'checked'> {
  label?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, checked, onCheckedChange, className, disabled, id, ...props }, ref) => {
    const inputId = id || React.useId();

    const handleToggle = () => {
      if (!disabled) {
        onCheckedChange(!checked);
      }
    };

    return (
      <div className="flex items-center gap-3 select-none">
        <div className="relative flex items-center">
          <input
            type="checkbox"
            id={inputId}
            ref={ref}
            checked={checked}
            disabled={disabled}
            onChange={(e) => onCheckedChange(e.target.checked)}
            className="sr-only"
            {...props}
          />
          <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={handleToggle}
            className={cn(
              'relative w-11 h-6 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed',
              checked ? 'bg-brand-500' : 'bg-gray-250 dark:bg-gray-800',
              className
            )}
          >
            <motion.span
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="block w-5 h-5 rounded-full bg-white shadow-sm absolute left-0.5 top-0.5"
              animate={{ x: checked ? 20 : 0 }}
            />
          </button>
        </div>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);

Switch.displayName = 'Switch';
