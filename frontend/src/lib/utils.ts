import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number, currency = 'INR'): string => {
  if (amount === 0) return 'Free';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
};

export const formatDate = (date: string | Date, fmt = 'MMM dd, yyyy'): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, fmt);
};

export const formatRelativeTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
};

export const getInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
};

export const truncateText = (text: string, maxLength: number): string => {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

export const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    Technology: '💻',
    Music: '🎵',
    Design: '🎨',
    Business: '💼',
    Food: '🍽️',
    Sports: '⚽',
    Arts: '🎭',
    Health: '🏥',
    Education: '📚',
    Gaming: '🎮',
  };
  return icons[category] || '🎯';
};

export const TICKET_TYPE_COLORS: Record<string, string> = {
  FREE: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
  GENERAL: 'text-brand-500 bg-brand-50 dark:bg-brand-900/20',
  VIP: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
  STUDENT: 'text-violet-500 bg-violet-50 dark:bg-violet-900/20',
};

export const EVENT_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'text-gray-500 bg-gray-100 dark:bg-gray-800',
  PUBLISHED: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
  CANCELLED: 'text-red-500 bg-red-50 dark:bg-red-900/20',
  COMPLETED: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
};
