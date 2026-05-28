import React, { memo } from 'react';
import { cn } from '@/lib/utils';

// Base skeleton with shimmer animation
const SkeletonBase: React.FC<{
  className?: string;
  'aria-label'?: string;
}> = ({ className = '', 'aria-label': ariaLabel }) => (
  <div 
    className={cn("skeleton-shimmer rounded-md", className)}
    aria-label={ariaLabel || "Loading"}
    role="status"
  />
);

// ============= GOALS SKELETON =============
const GoalCardSkeleton = memo(() => (
  <div className="bg-card border border-border/50 rounded-[6px] p-4 space-y-3">
    {/* Header: Title + Status Badge */}
    <div className="flex items-start justify-between gap-3">
      <SkeletonBase className="h-5 flex-1 max-w-[70%]" aria-label="Loading goal title" />
      <SkeletonBase className="h-6 w-20 rounded-full" aria-label="Loading status badge" />
    </div>
    
    {/* Progress bar */}
    <div className="space-y-1.5">
      <div className="flex justify-between">
        <SkeletonBase className="h-3 w-16" aria-label="Loading progress label" />
        <SkeletonBase className="h-3 w-10" aria-label="Loading progress value" />
      </div>
      <SkeletonBase className="h-2 w-full rounded-full" aria-label="Loading progress bar" />
    </div>
    
    {/* Footer: Owner + Due date */}
    <div className="flex items-center justify-between pt-1">
      <div className="flex items-center gap-2">
        <SkeletonBase className="h-6 w-6 rounded-full" aria-label="Loading avatar" />
        <SkeletonBase className="h-3 w-20" aria-label="Loading owner name" />
      </div>
      <SkeletonBase className="h-3 w-16" aria-label="Loading due date" />
    </div>
  </div>
));
GoalCardSkeleton.displayName = 'GoalCardSkeleton';

export const MobileGoalsSkeleton = memo(() => (
  <div className="space-y-3" role="status" aria-label="Loading goals">
    {[1, 2, 3].map((i) => (
      <GoalCardSkeleton key={i} />
    ))}
    <div className="sr-only" aria-live="polite">Loading your goals, please wait...</div>
  </div>
));
MobileGoalsSkeleton.displayName = 'MobileGoalsSkeleton';

// ============= ISSUES SKELETON =============
const IssueCardSkeleton = memo(() => (
  <div className="bg-card border border-border/50 rounded-[6px] p-4 space-y-2.5">
    {/* Title row */}
    <SkeletonBase className="h-5 w-[85%]" aria-label="Loading issue title" />
    
    {/* Description line */}
    <SkeletonBase className="h-4 w-[60%]" aria-label="Loading issue description" />
    
    {/* Footer: Owner + Priority/Rating */}
    <div className="flex items-center justify-between pt-1.5">
      <div className="flex items-center gap-2">
        <SkeletonBase className="h-6 w-6 rounded-full" aria-label="Loading owner avatar" />
        <SkeletonBase className="h-3 w-24" aria-label="Loading owner name" />
      </div>
      <SkeletonBase className="h-5 w-12 rounded-md" aria-label="Loading rating" />
    </div>
  </div>
));
IssueCardSkeleton.displayName = 'IssueCardSkeleton';

export const MobileIssuesSkeleton = memo(() => (
  <div className="space-y-3" role="status" aria-label="Loading issues">
    {[1, 2, 3, 4].map((i) => (
      <IssueCardSkeleton key={i} />
    ))}
    <div className="sr-only" aria-live="polite">Loading your issues, please wait...</div>
  </div>
));
MobileIssuesSkeleton.displayName = 'MobileIssuesSkeleton';

// ============= METRICS SKELETON =============
const MetricRowSkeleton = memo(() => (
  <div className="bg-card border border-border/50 rounded-[6px] p-4">
    <div className="flex items-center gap-4">
      {/* Left: Metric info */}
      <div className="flex-1 space-y-2">
        <SkeletonBase className="h-4 w-[65%]" aria-label="Loading metric name" />
        <div className="flex items-center gap-2">
          <SkeletonBase className="h-5 w-5 rounded-full" aria-label="Loading owner avatar" />
          <SkeletonBase className="h-3 w-20" aria-label="Loading owner name" />
        </div>
      </div>
      
      {/* Right: Value input + Target */}
      <div className="flex flex-col items-end gap-1.5">
        <SkeletonBase className="h-10 w-20 rounded-lg" aria-label="Loading value input" />
        <SkeletonBase className="h-3 w-16" aria-label="Loading target" />
      </div>
    </div>
  </div>
));
MetricRowSkeleton.displayName = 'MetricRowSkeleton';

export const MobileMetricsSkeleton = memo(() => (
  <div className="space-y-3" role="status" aria-label="Loading metrics">
    {[1, 2, 3, 4].map((i) => (
      <MetricRowSkeleton key={i} />
    ))}
    <div className="sr-only" aria-live="polite">Loading your metrics, please wait...</div>
  </div>
));
MobileMetricsSkeleton.displayName = 'MobileMetricsSkeleton';

// ============= TASKS SKELETON =============
const TaskCardSkeleton = memo(() => (
  <div className="bg-card border border-border/50 rounded-[6px] p-4">
    <div className="flex items-start gap-3">
      {/* Checkbox */}
      <SkeletonBase className="h-5 w-5 rounded-md mt-0.5 flex-shrink-0" aria-label="Loading checkbox" />
      
      {/* Content */}
      <div className="flex-1 space-y-2">
        <SkeletonBase className="h-4 w-[80%]" aria-label="Loading task title" />
        <div className="flex items-center gap-3">
          <SkeletonBase className="h-3 w-16" aria-label="Loading due date" />
          <SkeletonBase className="h-5 w-5 rounded-full" aria-label="Loading assignee" />
        </div>
      </div>
    </div>
  </div>
));
TaskCardSkeleton.displayName = 'TaskCardSkeleton';

export const MobileTasksListSkeleton = memo(() => (
  <div className="space-y-3" role="status" aria-label="Loading tasks">
    {[1, 2, 3, 4, 5].map((i) => (
      <TaskCardSkeleton key={i} />
    ))}
    <div className="sr-only" aria-live="polite">Loading your tasks, please wait...</div>
  </div>
));
MobileTasksListSkeleton.displayName = 'MobileTasksListSkeleton';

// ============= GENERIC PAGE SKELETON =============
export const MobilePageSkeleton = memo<{ itemCount?: number }>(({ itemCount = 4 }) => (
  <div className="space-y-3" role="status" aria-label="Loading content">
    {Array.from({ length: itemCount }).map((_, i) => (
      <div key={i} className="bg-card border border-border/50 rounded-[6px] p-4 space-y-2.5">
        <SkeletonBase className="h-5 w-[70%]" />
        <SkeletonBase className="h-4 w-[50%]" />
        <div className="flex items-center gap-2 pt-1">
          <SkeletonBase className="h-5 w-5 rounded-full" />
          <SkeletonBase className="h-3 w-20" />
        </div>
      </div>
    ))}
    <div className="sr-only" aria-live="polite">Loading content, please wait...</div>
  </div>
));
MobilePageSkeleton.displayName = 'MobilePageSkeleton';
