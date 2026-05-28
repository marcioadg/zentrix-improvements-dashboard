import React, { memo } from 'react';

interface EnhancedSkeletonProps {
  variant: 'task-item' | 'task-list' | 'kanban-card' | 'header';
  count?: number;
  animate?: boolean;
}

const TaskItemSkeleton = memo(() => (
  <div className="flex items-center gap-3 p-4 rounded-lg border bg-background">
    <div className="w-5 h-5 skeleton-shimmer rounded-[4px]"></div>
    <div className="flex-1 space-y-2">
      <div className="h-4 skeleton-shimmer rounded-[4px] w-3/4"></div>
      <div className="h-3 skeleton-shimmer rounded-[4px] w-1/2"></div>
    </div>
    <div className="w-8 h-8 skeleton-shimmer rounded-full"></div>
    <div className="w-8 h-8 skeleton-shimmer rounded-md"></div>
  </div>
));

const KanbanCardSkeleton = memo(() => (
  <div className="bg-background rounded-xl p-4 shadow-sm border">
    <div className="space-y-3">
      <div className="h-4 skeleton-shimmer rounded-[4px] w-3/4"></div>
      <div className="h-3 skeleton-shimmer rounded-[4px] w-full"></div>
      <div className="h-3 skeleton-shimmer rounded-[4px] w-1/2"></div>
      <div className="flex justify-between items-center mt-4">
        <div className="w-6 h-6 skeleton-shimmer rounded-full"></div>
        <div className="h-3 skeleton-shimmer rounded-[4px] w-16"></div>
      </div>
    </div>
  </div>
));

const HeaderSkeleton = memo(() => (
  <div className="flex items-center justify-between mb-6">
    <div className="space-y-2">
      <div className="h-8 skeleton-shimmer rounded-[4px] w-48"></div>
      <div className="h-4 skeleton-shimmer rounded-[4px] w-32"></div>
    </div>
    <div className="flex gap-2">
      <div className="h-10 skeleton-shimmer rounded-md w-24"></div>
      <div className="h-10 skeleton-shimmer rounded-md w-24"></div>
    </div>
  </div>
));

export const EnhancedSkeleton: React.FC<EnhancedSkeletonProps> = memo(({ 
  variant, 
  count = 1,
  animate: _animate = true 
}) => {
  const skeletons = Array.from({ length: count }, (_, index) => {
    switch (variant) {
      case 'task-item':
        return (
          <div key={index} className="animate-fade-in" style={{ animationDelay: `${index * 40}ms` }}>
            <TaskItemSkeleton />
          </div>
        );
      case 'kanban-card':
        return (
          <div key={index} className="animate-fade-in" style={{ animationDelay: `${index * 40}ms` }}>
            <KanbanCardSkeleton />
          </div>
        );
      case 'header':
        return <HeaderSkeleton key={index} />;
      case 'task-list':
        return (
          <div key={index} className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                <TaskItemSkeleton />
              </div>
            ))}
          </div>
        );
      default:
        return <div key={index} className="h-4 skeleton-shimmer rounded-[4px]"></div>;
    }
  });

  return <>{skeletons}</>;
});

EnhancedSkeleton.displayName = 'EnhancedSkeleton';
