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
const ProcessPageHeaderSkeleton: React.FC = () => (
  <header className="text-center mb-12 animate-fade-in">
    <div className="flex items-center justify-center gap-3 mb-4">
      <SkeletonBase 
        className="w-10 h-10" 
        shape="rectangle" 
        aria-label="Loading process icon"
      />
      <SkeletonBase 
        className="h-10 w-80" 
        shape="text-line" 
        aria-label="Loading page title"
      />
    </div>
    <SkeletonBase 
      className="h-6 w-64 mx-auto mb-8" 
      shape="text-line" 
      aria-label="Loading page description"
    />
    
    {/* Progress Section */}
    <div className="max-w-md mx-auto bg-card rounded-lg p-6 shadow-sm border space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonBase 
          className="h-4 w-40" 
          shape="text-line" 
          aria-label="Loading progress label"
        />
        <SkeletonBase 
          className="h-8 w-12" 
          shape="text-line" 
          aria-label="Loading progress percentage"
        />
      </div>
      <SkeletonBase 
        className="h-3 w-full" 
        shape="text-line" 
        aria-label="Loading progress bar"
      />
      <SkeletonBase 
        className="h-4 w-48 mx-auto" 
        shape="text-line" 
        aria-label="Loading progress details"
      />
    </div>
  </header>
);

// Process category item skeleton
const ProcessCategoryItemSkeleton: React.FC<{
  isExpanded?: boolean;
  processCount?: number;
}> = ({ isExpanded = false, processCount = 0 }) => (
  <div className="transition-colors hover:bg-accent/30">
    {/* Category Header */}
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <SkeletonBase 
            className="h-6 w-32" 
            shape="text-line" 
            aria-label="Loading category name"
          />
        </div>
        <div className="flex items-center gap-4">
          <SkeletonBase 
            className="h-4 w-20" 
            shape="text-line" 
            aria-label="Loading process count"
          />
          <SkeletonBase 
            className="h-5 w-20" 
            shape="rectangle" 
            aria-label="Loading status badge"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <SkeletonBase 
          className="h-8 w-8" 
          shape="rectangle" 
          aria-label="Loading add button"
        />
        <SkeletonBase 
          className="w-5 h-5" 
          shape="rectangle" 
          aria-label="Loading expand icon"
        />
      </div>
    </div>
    
    {/* Expanded Process List */}
    {isExpanded && (
      <div className="px-4 pb-4 bg-accent/10">
        {processCount === 0 ? (
          <div className="text-center py-8 space-y-3">
            <SkeletonBase 
              className="h-4 w-40 mx-auto" 
              shape="text-line" 
              aria-label="Loading empty state message"
            />
            <SkeletonBase 
              className="h-8 w-8 mx-auto" 
              shape="rectangle" 
              aria-label="Loading create button"
            />
          </div>
        ) : (
          <div className="grid gap-2">
            {Array.from({ length: processCount }).map((_, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 bg-background border rounded-lg hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3 flex-1">
                  <SkeletonBase 
                    className="h-5 w-3/4" 
                    shape="text-line" 
                    aria-label="Loading process title"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <SkeletonBase 
                    className="h-3 w-24" 
                    shape="text-line" 
                    aria-label="Loading update date"
                  />
                  <SkeletonBase 
                    className="h-6 w-12" 
                    shape="rectangle" 
                    aria-label="Loading edit button"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
);

// Process categories section skeleton
const ProcessCategoriesSkeleton: React.FC = () => (
  <div className="bg-card rounded-lg shadow-sm border overflow-hidden mb-8">
    <div className="p-6 border-b space-y-2">
      <SkeletonBase 
        className="h-6 w-48" 
        shape="text-line" 
        aria-label="Loading categories title"
      />
      <SkeletonBase 
        className="h-4 w-80" 
        shape="text-line" 
        aria-label="Loading categories description"
      />
    </div>
    
    <div className="divide-y">
      {Array.from({ length: 7 }).map((_, index) => (
        <ProcessCategoryItemSkeleton 
          key={index} 
          isExpanded={index < 2} // Show first two as expanded
          processCount={index === 0 ? 3 : index === 1 ? 2 : 0}
        />
      ))}
    </div>
  </div>
);

// Training & compliance card skeleton
const TrainingCardSkeleton: React.FC = () => (
  <div className="p-4 rounded-lg border bg-background space-y-3">
    <div className="flex items-center justify-between">
      <SkeletonBase 
        className="h-5 w-24" 
        shape="text-line" 
        aria-label="Loading training category name"
      />
      <SkeletonBase 
        className="w-4 h-4" 
        shape="rectangle" 
        aria-label="Loading review icon"
      />
    </div>
    
    <div className="space-y-2">
      <div className="flex justify-between">
        <SkeletonBase 
          className="h-4 w-20" 
          shape="text-line" 
          aria-label="Loading training label"
        />
        <SkeletonBase 
          className="h-4 w-8" 
          shape="text-line" 
          aria-label="Loading training percentage"
        />
      </div>
      <SkeletonBase 
        className="h-2 w-full" 
        shape="text-line" 
        aria-label="Loading training progress bar"
      />
      
      <div className="flex gap-2 mt-3">
        <SkeletonBase 
          className="h-6 w-20" 
          shape="rectangle" 
          aria-label="Loading mark read button"
        />
        <SkeletonBase 
          className="h-6 w-16" 
          shape="rectangle" 
          aria-label="Loading quiz button"
        />
      </div>
    </div>
  </div>
);

// Training & compliance section skeleton
const TrainingComplianceSkeleton: React.FC = () => (
  <div className="bg-card rounded-lg p-6 shadow-sm border space-y-6">
    <div className="flex items-center gap-3">
      <SkeletonBase 
        className="w-6 h-6" 
        shape="rectangle" 
        aria-label="Loading training icon"
      />
      <SkeletonBase 
        className="h-8 w-56" 
        shape="text-line" 
        aria-label="Loading training title"
      />
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <TrainingCardSkeleton key={index} />
      ))}
    </div>
  </div>
);

// Mobile process skeleton
const MobileProcessSkeleton: React.FC = () => (
  <div className="space-y-4 p-4 animate-fade-in">
    {/* Mobile header */}
    <div className="text-center space-y-3">
      <div className="flex items-center justify-center gap-2">
        <SkeletonBase 
          className="w-8 h-8" 
          shape="rectangle" 
          aria-label="Loading mobile process icon"
        />
        <SkeletonBase 
          className="h-8 w-56" 
          shape="text-line" 
          aria-label="Loading mobile title"
        />
      </div>
      <SkeletonBase 
        className="h-5 w-48 mx-auto" 
        shape="text-line" 
        aria-label="Loading mobile description"
      />
      
      {/* Mobile progress card */}
      <div className="bg-card rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-center">
          <SkeletonBase 
            className="h-4 w-32" 
            shape="text-line" 
            aria-label="Loading mobile progress label"
          />
          <SkeletonBase 
            className="h-6 w-12" 
            shape="text-line" 
            aria-label="Loading mobile progress value"
          />
        </div>
        <SkeletonBase 
          className="h-3 w-full" 
          shape="text-line" 
          aria-label="Loading mobile progress bar"
        />
      </div>
    </div>

    {/* Mobile categories */}
    <div className="space-y-3">
      <SkeletonBase 
        className="h-6 w-32" 
        shape="text-line" 
        aria-label="Loading mobile categories title"
      />
      
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="bg-card border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <SkeletonBase 
              className="h-5 w-24" 
              shape="text-line" 
              aria-label="Loading mobile category name"
            />
            <SkeletonBase 
              className="h-4 w-16" 
              shape="rectangle" 
              aria-label="Loading mobile status"
            />
          </div>
          <div className="flex justify-between items-center">
            <SkeletonBase 
              className="h-3 w-20" 
              shape="text-line" 
              aria-label="Loading mobile process count"
            />
            <SkeletonBase 
              className="h-6 w-6" 
              shape="rectangle" 
              aria-label="Loading mobile add button"
            />
          </div>
        </div>
      ))}
    </div>

    {/* Mobile action button */}
    <div className="text-center pt-4">
      <SkeletonBase 
        className="h-10 w-40 mx-auto" 
        shape="rectangle" 
        aria-label="Loading mobile create button"
      />
    </div>
  </div>
);

// Main process page skeleton component
export const ProcessPageSkeleton: React.FC<{
  variant?: 'desktop' | 'mobile';
  showTraining?: boolean;
}> = ({ 
  variant = 'desktop',
  showTraining = true
}) => {
  if (variant === 'mobile') {
    return (
      <div 
        className="min-h-screen bg-background animate-fade-in"
        role="status"
        aria-label="Loading mobile process page"
      >
        <MobileProcessSkeleton />

        <div className="sr-only" aria-live="polite">
          Loading your mobile process documentation, please wait...
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-background to-accent/5 animate-fade-in"
      role="status"
      aria-label="Loading process page"
    >
      <div className="max-w-6xl mx-auto px-6 py-8">
        <ProcessPageHeaderSkeleton />
        
        <ProcessCategoriesSkeleton />
        
        {showTraining && <TrainingComplianceSkeleton />}

        {/* Quick Actions */}
        <div className="mt-8 text-center">
          <SkeletonBase 
            className="h-12 w-48 mx-auto" 
            shape="rectangle" 
            aria-label="Loading create process button"
          />
        </div>
      </div>

      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Loading your process documentation, please wait...
      </div>

      {/* High contrast focus indicator for accessibility */}
      <div className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:bg-background focus:text-foreground focus:p-2 focus:rounded focus:border-2 focus:border-primary">
        Skip to main content
      </div>
    </div>
  );
};

// Specialized skeletons for different process page states
export const ProcessLoadingSkeleton: React.FC = () => (
  <ProcessPageSkeleton 
    variant="desktop"
    showTraining={true}
  />
);

export const MobileProcessLoadingSkeleton: React.FC = () => (
  <ProcessPageSkeleton 
    variant="mobile"
  />
);

// Process detail view skeleton
export const ProcessDetailSkeleton: React.FC = () => (
  <div 
    className="min-h-screen bg-background p-6 animate-fade-in"
    role="status"
    aria-label="Loading process details"
  >
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button and title */}
      <div className="flex items-center gap-4 mb-6">
        <SkeletonBase 
          className="w-8 h-8" 
          shape="rectangle" 
          aria-label="Loading back button"
        />
        <SkeletonBase 
          className="h-8 w-64" 
          shape="text-line" 
          aria-label="Loading process title"
        />
      </div>

      {/* Process content */}
      <div className="bg-card rounded-lg p-6 space-y-4">
        <SkeletonBase 
          className="h-6 w-48" 
          shape="text-line" 
          aria-label="Loading section title"
        />
        <SkeletonBase 
          className="h-4 w-full" 
          shape="text-line" 
          aria-label="Loading content line"
        />
        <SkeletonBase 
          className="h-4 w-5/6" 
          shape="text-line" 
          aria-label="Loading content line"
        />
        <SkeletonBase 
          className="h-4 w-4/6" 
          shape="text-line" 
          aria-label="Loading content line"
        />
        
        {/* Process steps */}
        <div className="space-y-3 mt-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
              <SkeletonBase 
                className="w-6 h-6 mt-1" 
                shape="circle" 
                aria-label="Loading step number"
              />
              <div className="flex-1 space-y-2">
                <SkeletonBase 
                  className="h-5 w-3/4" 
                  shape="text-line" 
                  aria-label="Loading step title"
                />
                <SkeletonBase 
                  className="h-4 w-full" 
                  shape="text-line" 
                  aria-label="Loading step description"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <SkeletonBase 
          className="h-10 w-20" 
          shape="rectangle" 
          aria-label="Loading edit button"
        />
        <SkeletonBase 
          className="h-10 w-24" 
          shape="rectangle" 
          aria-label="Loading share button"
        />
      </div>
    </div>

    <div className="sr-only" aria-live="polite">
      Loading process details, please wait...
    </div>
  </div>
);

// Empty state skeleton
export const ProcessEmptySkeleton: React.FC = () => (
  <div 
    className="min-h-screen bg-gradient-to-br from-background to-accent/5 animate-fade-in"
    role="status"
    aria-label="Loading process setup"
  >
    <div className="max-w-6xl mx-auto px-6 py-8">
      <ProcessPageHeaderSkeleton />
      
      <div className="bg-card rounded-lg p-12 text-center space-y-4">
        <SkeletonBase 
          className="h-8 w-64 mx-auto" 
          shape="text-line" 
          aria-label="Loading empty state message"
        />
        <SkeletonBase 
          className="h-4 w-96 mx-auto" 
          shape="text-line" 
          aria-label="Loading empty state instructions"
        />
        <SkeletonBase 
          className="h-12 w-48 mx-auto" 
          shape="rectangle" 
          aria-label="Loading create first process button"
        />
      </div>
    </div>

    <div className="sr-only" aria-live="polite">
      Loading process setup, please wait...
    </div>
  </div>
);