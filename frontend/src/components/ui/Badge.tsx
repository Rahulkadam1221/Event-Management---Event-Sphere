import React from 'react';
import { cn } from '../../lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  success: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  danger: 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400',
  info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  brand: 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400',
};

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', children, className, ...props }) => (
  <span className={cn('badge', variants[variant], className)} {...props}>{children}</span>
);
