import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingSizes = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' };

export const Card: React.FC<CardProps> = ({ children, className, hover, onClick, padding = 'md' }) => (
  <motion.div
    whileHover={hover ? { y: -2, boxShadow: '0 12px 40px rgba(0,0,0,0.12)' } : undefined}
    transition={{ duration: 0.2 }}
    onClick={onClick}
    className={cn('card', paddingSizes[padding], hover && 'cursor-pointer', className)}
  >
    {children}
  </motion.div>
);
