import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps { className?: string; }

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div className={cn('bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse', className)} />
);

export const EventCardSkeleton: React.FC = () => (
  <div className="card overflow-hidden">
    <Skeleton className="h-48 rounded-none rounded-t-2xl" />
    <div className="p-5 space-y-3">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex justify-between pt-2">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
    </div>
  </div>
);
