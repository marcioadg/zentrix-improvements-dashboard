import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Base skeleton component with shimmer animation
const SkeletonBase: React.FC<{
  className?: string;
  shape?: 'rectangle' | 'circle' | 'text-line';
  'aria-label'?: string;
}> = ({ className = '', shape = 'rectangle', 'aria-label': ariaLabel }) => {
  const baseClasses = "skeleton-shimmer";
  const shapeClasses = {
    rectangle: "rounded-md",
    circle: "rounded-full",
    'text-line': "rounded-sm"
  };

  return (
    <div 
      className={`${baseClasses} ${shapeClasses[shape]} ${className}`}
      aria-label={ariaLabel || "Loading content"}
      role="status"
    />
  );
};

// Individual task item skeleton
const TaskItemSkeleton: React.FC = () => (
  <div className="p-3 sm:p-4 border border-border rounded-lg space-y-3 transition-colors hover:bg-muted/20">
    <div className="flex items-start gap-3">
      {/* Checkbox */}
      <SkeletonBase 
        shape="rectangle" 
        className="w-4 h-4 mt-1 flex-shrink-0" 
        aria-label="Loading task checkbox"
      />
      
      {/* Task content */}
      <div className="flex-1 space-y-2">
        {/* Task title */}
        <SkeletonBase 
          shape="text-line" 
          className="h-4 w-3/4 max-w-md" 
          aria-label="Loading task title"
        />
        
        {/* Task description - hidden on mobile */}
        <SkeletonBase 
          shape="text-line" 
          className="h-3 w-1/2 max-w-xs hidden sm:block" 
          aria-label="Loading task description"
        />
        
        {/* Task metadata row */}
        <div className="flex items-center gap-2 sm:gap-4 mt-2 flex-wrap">
          <SkeletonBase 
            shape="text-line" 
            className="h-3 w-12 sm:w-16" 
            aria-label="Loading task date"
          />
          <SkeletonBase 
            shape="text-line" 
            className="h-3 w-16 sm:w-20" 
            aria-label="Loading task team"
          />
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-1 sm:gap-2">
        <SkeletonBase 
          shape="rectangle" 
          className="w-6 h-6 sm:w-8 sm:h-8" 
          aria-label="Loading task actions"
        />
        <SkeletonBase 
          shape="rectangle" 
          className="w-6 h-6 sm:w-8 sm:h-8" 
          aria-label="Loading task menu"
        />
      </div>
    </div>
  </div>
);

// Filter tabs skeleton
const FilterTabsSkeleton: React.FC = () => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
    {/* Filter tabs */}
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <SkeletonBase
          key={index}
          shape="rectangle"
          className="h-9 w-16 sm:w-20"
          aria-label="Loading filter tab"
        />
      ))}
    </div>
    
    {/* Search bar skeleton */}
    <div className="flex-1 max-w-sm">
      <SkeletonBase
        shape="rectangle"
        className="h-10 w-full"
        aria-label="Loading search bar"
      />
    </div>
  </div>
);

// Header skeleton
const HeaderSkeleton: React.FC = () => (
  <div className="mb-6 sm:mb-8">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
      <div className="flex items-center gap-3">
        <SkeletonBase 
          shape="rectangle" 
          className="w-6 h-6 sm:w-8 sm:h-8" 
          aria-label="Loading page icon"
        />
        <SkeletonBase 
          shape="text-line" 
          className="h-6 sm:h-8 w-24 sm:w-32" 
          aria-label="Loading page title"
        />
      </div>
    </div>
  </div>
);

// Quick add task skeleton
const QuickAddTaskSkeleton: React.FC = () => (
  <div className="p-3 sm:p-4 border-2 border-dashed border-muted rounded-lg bg-muted/5">
    <div className="flex items-center gap-3">
      <SkeletonBase 
        shape="circle" 
        className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" 
        aria-label="Loading add task button"
      />
      <SkeletonBase 
        shape="text-line" 
        className="h-4 flex-1 max-w-md" 
        aria-label="Loading add task input"
      />
    </div>
  </div>
);

// Main tasks skeleton component
export const TasksSkeleton: React.FC<{
  taskCount?: number;
  showFilters?: boolean;
  showQuickAdd?: boolean;
}> = ({ 
  taskCount = 6, 
  showFilters = true, 
  showQuickAdd = true 
}) => {
  return (
    <div 
      className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl animate-fade-in"
      role="status"
      aria-label="Loading tasks page"
    >
      {/* Header skeleton */}
      <HeaderSkeleton />
      
      {/* Filters skeleton */}
      {showFilters && <FilterTabsSkeleton />}
      
      {/* Tasks list skeleton */}
      <Card className="mb-6 shadow-sm">
        <CardContent className="space-y-3 sm:space-y-4 pt-4 sm:pt-6">
          {Array.from({ length: taskCount }).map((_, index) => (
            <div key={index} className="animate-fade-in" style={{ animationDelay: `${index * 40}ms` }}>
              <TaskItemSkeleton />
            </div>
          ))}
          
          {/* Quick add task skeleton */}
          {showQuickAdd && <QuickAddTaskSkeleton />}
        </CardContent>
      </Card>
      
      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Loading your tasks, please wait...
      </div>
      
      {/* High contrast focus indicator for accessibility */}
      <div className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:bg-background focus:text-foreground focus:p-2 focus:rounded focus:border-2 focus:border-primary">
        Skip to main content
      </div>
    </div>
  );
};

// Mobile-specific skeleton
export const MobileTasksSkeleton: React.FC = () => (
  <div 
    className="min-h-screen bg-background animate-fade-in"
    role="status"
    aria-label="Loading mobile tasks"
  >
    {/* Mobile header skeleton */}
    <div className="p-4 border-b border-border">
      <div className="flex items-center justify-between mb-4">
        <SkeletonBase 
          shape="text-line" 
          className="h-6 w-24" 
          aria-label="Loading mobile header"
        />
        <SkeletonBase 
          shape="rectangle" 
          className="w-8 h-8" 
          aria-label="Loading mobile menu"
        />
      </div>
      
      {/* Mobile search */}
      <SkeletonBase 
        shape="rectangle" 
        className="h-10 w-full" 
        aria-label="Loading mobile search"
      />
    </div>
    
    {/* Mobile tabs skeleton */}
    <div className="flex border-b border-border">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex-1 p-4">
          <SkeletonBase 
            shape="text-line" 
            className="h-4 w-full" 
            aria-label="Loading mobile tab"
          />
        </div>
      ))}
    </div>
    
    {/* Mobile task list */}
    <div className="p-4 space-y-3">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="p-3 border border-border rounded-lg">
          <div className="flex items-start gap-3">
            <SkeletonBase 
              shape="rectangle" 
              className="w-4 h-4 mt-1 flex-shrink-0" 
              aria-label="Loading mobile task checkbox"
            />
            <div className="flex-1 space-y-2">
              <SkeletonBase 
                shape="text-line" 
                className="h-4 w-4/5" 
                aria-label="Loading mobile task title"
              />
              <SkeletonBase 
                shape="text-line" 
                className="h-3 w-2/3" 
                aria-label="Loading mobile task details"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
    
    <div className="sr-only" aria-live="polite">
      Loading your mobile tasks, please wait...
    </div>
  </div>
);