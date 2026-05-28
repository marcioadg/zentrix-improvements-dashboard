import React from 'react';
import { SidebarSkeleton } from './SidebarSkeleton';
import { DashboardPageSkeleton } from './DashboardPageSkeleton';
import { Skeleton } from '@/components/ui/skeleton';

interface SimpleAppSkeletonProps {
  showSidebar?: boolean;
  contentType?: 'dashboard' | 'generic';
}

export const SimpleAppSkeleton: React.FC<SimpleAppSkeletonProps> = ({ 
  showSidebar = true,
  contentType = 'dashboard'
}) => {
  return (
    <div className="min-h-screen flex w-full">
      {/* Desktop sidebar */}
      {showSidebar && (
        <div className="hidden md:block">
          <SidebarSkeleton />
        </div>
      )}
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="hidden md:block">
          <header className="border-b bg-background/95 backdrop-blur h-14 flex items-center justify-between px-4">
            <Skeleton className="w-6 h-6" />
            <div className="flex items-center gap-2">
              <Skeleton className="w-20 h-8" />
              <Skeleton className="w-8 h-8" />
            </div>
          </header>
        </div>
        
        {/* Mobile header */}
        <div className="md:hidden border-b bg-background/95 backdrop-blur h-14 flex items-center justify-between px-4">
          <Skeleton className="w-8 h-8" />
          <Skeleton className="w-24 h-6" />
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>
        
        {/* Main content */}
        <main className="flex-1 overflow-auto min-w-0 pb-20 md:pb-0">
          {contentType === 'dashboard' ? (
            <DashboardPageSkeleton />
          ) : (
            // Generic page skeleton
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-96" />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
      
      {/* Mobile bottom navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur">
        <div className="flex items-center justify-around p-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex flex-col items-center gap-1 p-2">
              <Skeleton className="w-5 h-5" />
              <Skeleton className="h-2 w-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};