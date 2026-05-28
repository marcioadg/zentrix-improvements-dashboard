import React from 'react';
import { cn } from '@/lib/utils';

// Enhanced skeleton component with shimmer effect
const SkeletonBase: React.FC<{
  className?: string;
  shape?: 'rectangle' | 'circle' | 'text-line';
  'aria-label'?: string;
}> = ({ className = '', shape = 'rectangle', 'aria-label': ariaLabel }) => {
  const baseClasses = "skeleton-shimmer bg-muted";
  const shapeClasses = {
    rectangle: "rounded-md",
    circle: "rounded-full",
    'text-line': "rounded-sm"
  };

  return (
    <div 
      className={cn(baseClasses, shapeClasses[shape], className)}
      aria-label={ariaLabel || "Loading content"}
      role="status"
    />
  );
};

// Page header skeleton
const MetricsPageHeaderSkeleton: React.FC = () => (
  <div className="space-y-4 md:space-y-6 p-4 md:p-0 animate-fade-in">
    <div className="flex flex-col gap-2 md:gap-1">
      <SkeletonBase 
        className="h-8 md:h-10 w-32 md:w-40" 
        shape="text-line" 
        aria-label="Loading page title"
      />
      <SkeletonBase 
        className="h-4 md:h-5 w-64 md:w-80" 
        shape="text-line" 
        aria-label="Loading page description"
      />
    </div>
  </div>
);

// Controls bar skeleton
const MetricsControlsSkeleton: React.FC = () => (
  <div className="bg-card border rounded-lg p-4 space-y-4">
    {/* Main controls row */}
    <div className="flex items-center gap-4 flex-wrap">
      {/* Team selector */}
      <div className="flex items-center gap-2">
        <SkeletonBase 
          className="h-4 w-12" 
          shape="text-line" 
          aria-label="Loading team label"
        />
        <SkeletonBase 
          className="h-8 w-32" 
          shape="rectangle" 
          aria-label="Loading team selector"
        />
      </div>

      {/* Time period selector */}
      <div className="flex items-center gap-2">
        <SkeletonBase 
          className="h-8 w-28" 
          shape="rectangle" 
          aria-label="Loading time period selector"
        />
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <SkeletonBase 
          className="h-4 w-16" 
          shape="text-line" 
          aria-label="Loading search label"
        />
        <div className="relative flex-1 max-w-xs">
          <SkeletonBase 
            className="h-8 w-full" 
            shape="rectangle" 
            aria-label="Loading search input"
          />
        </div>
      </div>

      {/* Management button */}
      <SkeletonBase 
        className="h-8 w-36" 
        shape="rectangle" 
        aria-label="Loading management button"
      />

      {/* Settings button */}
      <SkeletonBase 
        className="h-8 w-8" 
        shape="rectangle" 
        aria-label="Loading settings button"
      />
    </div>
  </div>
);

// Metrics table skeleton
const MetricsTableSkeleton: React.FC<{
  rowCount?: number;
  weekCount?: number;
}> = ({ 
  rowCount = 8, 
  weekCount = 13 
}) => (
  <div className="bg-card border rounded-lg overflow-hidden">
    {/* Table header */}
    <div className="border-b bg-muted/50 p-4">
      <div className="grid grid-cols-[200px_100px_repeat(13,80px)] gap-2 items-center">
        {/* Metric name header */}
        <SkeletonBase 
          className="h-4 w-20" 
          shape="text-line" 
          aria-label="Loading metric name header"
        />
        
        {/* Owner header */}
        <SkeletonBase 
          className="h-4 w-12" 
          shape="text-line" 
          aria-label="Loading owner header"
        />
        
        {/* Week headers */}
        {Array.from({ length: weekCount }).map((_, index) => (
          <SkeletonBase 
            key={index}
            className="h-4 w-16" 
            shape="text-line" 
            aria-label="Loading week header"
          />
        ))}
      </div>
    </div>

    {/* Table rows */}
    <div className="divide-y">
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <div key={rowIndex} className="p-4 hover:bg-muted/20 transition-colors">
          <div className="grid grid-cols-[200px_100px_repeat(13,80px)] gap-2 items-center">
            {/* Metric name and info */}
            <div className="space-y-2">
              <SkeletonBase 
                className="h-4 w-3/4" 
                shape="text-line" 
                aria-label="Loading metric name"
              />
              <SkeletonBase 
                className="h-3 w-1/2" 
                shape="text-line" 
                aria-label="Loading metric details"
              />
            </div>
            
            {/* Owner */}
            <div className="flex items-center gap-2">
              <SkeletonBase 
                className="w-6 h-6" 
                shape="circle" 
                aria-label="Loading owner avatar"
              />
              <SkeletonBase 
                className="h-3 w-8" 
                shape="text-line" 
                aria-label="Loading owner name"
              />
            </div>
            
            {/* Week values */}
            {Array.from({ length: weekCount }).map((_, weekIndex) => (
              <div key={weekIndex} className="text-center">
                <SkeletonBase 
                  className="h-6 w-12 mx-auto" 
                  shape="text-line" 
                  aria-label="Loading metric value"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Mobile metrics skeleton
const MobileMetricsSkeleton: React.FC<{
  itemCount?: number;
}> = ({ itemCount = 6 }) => (
  <div className="space-y-4">
    {Array.from({ length: itemCount }).map((_, index) => (
      <div key={index} className="bg-card border rounded-lg p-4 space-y-3">
        {/* Metric header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1 flex-1">
            <SkeletonBase 
              className="h-5 w-3/4" 
              shape="text-line" 
              aria-label="Loading mobile metric name"
            />
            <SkeletonBase 
              className="h-3 w-1/2" 
              shape="text-line" 
              aria-label="Loading mobile metric details"
            />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBase 
              className="w-6 h-6" 
              shape="circle" 
              aria-label="Loading mobile owner avatar"
            />
          </div>
        </div>

        {/* Recent values */}
        <div className="space-y-2">
          <SkeletonBase 
            className="h-3 w-20" 
            shape="text-line" 
            aria-label="Loading recent values label"
          />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, valueIndex) => (
              <div key={valueIndex} className="text-center space-y-1">
                <SkeletonBase 
                  className="h-3 w-full" 
                  shape="text-line" 
                  aria-label="Loading mobile date"
                />
                <SkeletonBase 
                  className="h-6 w-full" 
                  shape="text-line" 
                  aria-label="Loading mobile value"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <SkeletonBase 
              className="h-3 w-16" 
              shape="text-line" 
              aria-label="Loading progress label"
            />
            <SkeletonBase 
              className="h-3 w-8" 
              shape="text-line" 
              aria-label="Loading progress percentage"
            />
          </div>
          <SkeletonBase 
            className="h-2 w-full" 
            shape="text-line" 
            aria-label="Loading progress bar"
          />
        </div>
      </div>
    ))}
  </div>
);

// Main metrics page skeleton component
export const MetricsPageSkeleton: React.FC<{
  variant?: 'desktop' | 'mobile';
  showControls?: boolean;
  tableRowCount?: number;
  tableWeekCount?: number;
}> = ({ 
  variant = 'desktop',
  showControls = true,
  tableRowCount = 8,
  tableWeekCount = 13
}) => {
  if (variant === 'mobile') {
    return (
      <div 
        className="space-y-4 p-4 animate-fade-in"
        role="status"
        aria-label="Loading mobile metrics page"
      >
        <MetricsPageHeaderSkeleton />
        
        {showControls && (
          <div className="space-y-3">
            {/* Mobile team selector */}
            <div className="flex items-center gap-2">
              <SkeletonBase 
                className="h-4 w-12" 
                shape="text-line" 
                aria-label="Loading mobile team label"
              />
              <SkeletonBase 
                className="h-8 flex-1" 
                shape="rectangle" 
                aria-label="Loading mobile team selector"
              />
            </div>
            
            {/* Mobile search */}
            <SkeletonBase 
              className="h-8 w-full" 
              shape="rectangle" 
              aria-label="Loading mobile search"
            />
            
            {/* Mobile filters */}
            <div className="flex gap-2">
              <SkeletonBase 
                className="h-8 w-20" 
                shape="rectangle" 
                aria-label="Loading mobile filter"
              />
              <SkeletonBase 
                className="h-8 w-24" 
                shape="rectangle" 
                aria-label="Loading mobile filter"
              />
            </div>
          </div>
        )}
        
        <MobileMetricsSkeleton />

        <div className="sr-only" aria-live="polite">
          Loading your mobile metrics, please wait...
        </div>
      </div>
    );
  }

  return (
    <div 
      className="space-y-6 animate-fade-in"
      role="status"
      aria-label="Loading metrics page"
    >
      <MetricsPageHeaderSkeleton />
      
      {showControls && <MetricsControlsSkeleton />}
      
      <MetricsTableSkeleton 
        rowCount={tableRowCount} 
        weekCount={tableWeekCount} 
      />

      {/* Export button skeleton */}
      <div className="flex justify-end">
        <SkeletonBase 
          className="h-8 w-24" 
          shape="rectangle" 
          aria-label="Loading export button"
        />
      </div>

      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Loading your metrics dashboard, please wait...
      </div>

      {/* High contrast focus indicator for accessibility */}
      <div className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:bg-background focus:text-foreground focus:p-2 focus:rounded focus:border-2 focus:border-primary">
        Skip to main content
      </div>
    </div>
  );
};

// Specialized skeletons for different metrics page states
export const MetricsLoadingSkeleton: React.FC = () => (
  <MetricsPageSkeleton 
    variant="desktop"
    showControls={true}
    tableRowCount={8}
    tableWeekCount={13}
  />
);

export const MobileMetricsLoadingSkeleton: React.FC = () => (
  <MetricsPageSkeleton 
    variant="mobile"
    showControls={true}
  />
);

// Empty state with skeleton for team selection
export const MetricsTeamSelectionSkeleton: React.FC = () => (
  <div 
    className="space-y-6 animate-fade-in"
    role="status"
    aria-label="Loading team selection"
  >
    <MetricsPageHeaderSkeleton />
    
    <div className="bg-card border rounded-lg p-8 text-center space-y-4">
      <SkeletonBase 
        className="h-6 w-48 mx-auto" 
        shape="text-line" 
        aria-label="Loading team selection message"
      />
      <SkeletonBase 
        className="h-4 w-64 mx-auto" 
        shape="text-line" 
        aria-label="Loading team selection instructions"
      />
      <SkeletonBase 
        className="h-8 w-32 mx-auto" 
        shape="rectangle" 
        aria-label="Loading team selector"
      />
    </div>

    <div className="sr-only" aria-live="polite">
      Loading team selection, please wait...
    </div>
  </div>
);

// Skeleton for no data state
export const MetricsNoDataSkeleton: React.FC = () => (
  <div 
    className="space-y-6 animate-fade-in"
    role="status"
    aria-label="Loading metrics setup"
  >
    <MetricsPageHeaderSkeleton />
    <MetricsControlsSkeleton />
    
    <div className="bg-card border rounded-lg p-12 text-center space-y-4">
      <SkeletonBase 
        className="h-8 w-56 mx-auto" 
        shape="text-line" 
        aria-label="Loading no data message"
      />
      <SkeletonBase 
        className="h-4 w-80 mx-auto" 
        shape="text-line" 
        aria-label="Loading setup instructions"
      />
      <SkeletonBase 
        className="h-8 w-36 mx-auto" 
        shape="rectangle" 
        aria-label="Loading add metric button"
      />
    </div>

    <div className="sr-only" aria-live="polite">
      Loading metrics setup, please wait...
    </div>
  </div>
);