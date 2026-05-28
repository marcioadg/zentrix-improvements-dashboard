import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const SidebarSkeleton: React.FC = () => (
  <div className="w-64 border-r bg-card flex flex-col h-screen">
    {/* Header skeleton */}
    <div className="p-4 border-b">
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-4 w-20" />
    </div>

    {/* Navigation skeleton */}
    <div className="flex-1 p-2 space-y-1">
      {/* Main navigation items */}
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 p-2 rounded-md">
          <Skeleton className="w-4 h-4" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
      
      {/* Separator */}
      <div className="my-4">
        <Skeleton className="h-px w-full" />
      </div>
      
      {/* Secondary navigation items */}
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={`secondary-${index}`} className="flex items-center gap-3 p-2 rounded-md">
          <Skeleton className="w-4 h-4" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>

    {/* Footer skeleton */}
    <div className="p-4 border-t space-y-3">
      {/* User profile */}
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-full" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-2 w-16" />
        </div>
      </div>
    </div>
  </div>
);