
import React from 'react';
import { AutoArchiveTimer, PendingArchiveTask } from '@/components/dashboard/AutoArchiveTimer';

interface OptimizedTasksPageContainerProps {
  loading: boolean;
  error?: string | null;
  pendingArchives: PendingArchiveTask[];
  onUndo: (taskId: string) => void;
  children: React.ReactNode;
}

export const OptimizedTasksPageContainer: React.FC<OptimizedTasksPageContainerProps> = ({
  loading,
  error,
  pendingArchives,
  onUndo,
  children
}) => {
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded-lg w-64 animate-pulse"></div>
            <div className="flex gap-4">
              <div className="h-10 bg-muted rounded-lg w-48 animate-pulse"></div>
              <div className="h-10 bg-muted rounded-lg w-32 animate-pulse"></div>
            </div>
          </div>

          {/* Content skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-4">
                <div className="h-6 bg-muted rounded w-24 animate-pulse"></div>
                <div className="space-y-3">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="h-20 bg-muted/50 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center py-12">
          <div className="text-destructive mb-4">
            <h2 className="text-2xl font-semibold">Error Loading Tasks</h2>
            <p className="text-secondary-foreground mt-2">{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {children}
      
      <AutoArchiveTimer
        pendingTasks={pendingArchives}
        onUndo={onUndo}
      />
    </div>
  );
};
