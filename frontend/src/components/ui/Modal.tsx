import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
};

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', className }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={cn('relative w-full card p-0 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col', sizes[size], className)}
        >
          {title && (
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800 shrink-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
              <button onClick={onClose} className="btn-ghost p-2 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
          )}
          <div className="overflow-y-auto flex-1">{children}</div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
