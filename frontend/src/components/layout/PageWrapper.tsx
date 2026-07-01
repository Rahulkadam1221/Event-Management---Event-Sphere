import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { cn } from '../../lib/utils';

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  showFooter?: boolean;
  noPadding?: boolean;
}

export const PageWrapper: React.FC<PageWrapperProps> = ({ children, className, showFooter = true, noPadding }) => (
  <div className="min-h-screen flex flex-col bg-white dark:bg-[#0f0f11]">
    <Navbar />
    <main className={cn('flex-1', !noPadding && 'pt-16', className)}>
      {children}
    </main>
    {showFooter && <Footer />}
  </div>
);
