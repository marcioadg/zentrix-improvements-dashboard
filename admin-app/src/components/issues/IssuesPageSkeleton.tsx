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
const IssuesPageHeaderSkeleton: React.FC = () => (
  <div className="space-y-4 animate-fade-in">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <SkeletonBase 
          className="h-8 sm:h-10 w-24 sm:w-32" 
          shape="text-line" 
          aria-label="Loading issues page title"
        />
      </div>
      
      {/* Team selector skeleton */}
      <div className="bg-muted/30 rounded-[6px] p-3 sm:p-4 border border-border">
        <SkeletonBase 
          className="h-8 w-48 sm:w-56" 
          shape="rectangle" 
          aria-label="Loading team selector"
        />
      </div>
    </div>
  </div>
);

// Issue type tabs skeleton
const IssueTypeTabsSkeleton: React.FC = () => (
  <div className="mb-6">
    <div className="bg-muted/20 rounded-[6px] p-1 border border-border">
      <div className="flex">
        <SkeletonBase 
          className="h-10 flex-1 mr-1" 
          shape="rectangle" 
          aria-label="Loading short-term tab"
        />
        <SkeletonBase 
          className="h-10 flex-1 ml-1" 
          shape="rectangle" 
          aria-label="Loading long-term tab"
        />
      </div>
    </div>
  </div>
);

// Issues controls skeleton
const IssuesControlsSkeleton: React.FC = () => (
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
    <div className="flex items-center gap-2">
      <SkeletonBase 
        className="h-8 w-24" 
        shape="rectangle" 
        aria-label="Loading add issue button"
      />
      <SkeletonBase 
        className="h-8 w-28" 
        shape="rectangle" 
        aria-label="Loading show solved toggle"
      />
    </div>
    
    <div className="flex items-center gap-2">
      <SkeletonBase 
        className="h-4 w-16" 
        shape="text-line" 
        aria-label="Loading sort label"
      />
      <SkeletonBase 
        className="h-8 w-32" 
        shape="rectangle" 
        aria-label="Loading sort dropdown"
      />
    </div>
  </div>
);

// Individual issue item skeleton
const IssueItemSkeleton: React.FC<{
  showVotes?: boolean;
}> = ({ showVotes = true }) => (
  <div className="bg-card border border-border rounded-[6px] p-3 transition-colors duration-150">
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 space-y-3">
        {/* Issue header */}
        <div className="flex items-start gap-3">
          <SkeletonBase 
            className="w-5 h-5 mt-0.5" 
            shape="rectangle" 
            aria-label="Loading issue type icon"
          />
          <div className="flex-1 space-y-2">
            <SkeletonBase 
              className="h-5 w-4/5" 
              shape="text-line" 
              aria-label="Loading issue title"
            />
            <SkeletonBase 
              className="h-4 w-3/5" 
              shape="text-line" 
              aria-label="Loading issue description"
            />
          </div>
        </div>

        {/* Issue metadata */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <SkeletonBase 
              className="w-6 h-6" 
              shape="circle" 
              aria-label="Loading issue owner avatar"
            />
            <SkeletonBase 
              className="h-3 w-20" 
              shape="text-line" 
              aria-label="Loading issue owner name"
            />
          </div>
          
          <SkeletonBase 
            className="h-3 w-16" 
            shape="text-line" 
            aria-label="Loading issue date"
          />
          
          <SkeletonBase 
            className="h-4 w-12" 
            shape="rectangle" 
            aria-label="Loading issue status"
          />
        </div>

        {/* Voting section if enabled */}
        {showVotes && (
          <div className="flex items-center gap-4 pt-2 border-t">
            <div className="flex items-center gap-2">
              <SkeletonBase 
                className="w-4 h-4" 
                shape="rectangle" 
                aria-label="Loading vote icon"
              />
              <SkeletonBase 
                className="h-3 w-8" 
                shape="text-line" 
                aria-label="Loading vote count"
              />
            </div>
            
            <SkeletonBase 
              className="h-6 w-16" 
              shape="rectangle" 
              aria-label="Loading vote button"
            />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        <SkeletonBase 
          className="w-8 h-8" 
          shape="rectangle" 
          aria-label="Loading issue action"
        />
        <SkeletonBase 
          className="w-8 h-8" 
          shape="rectangle" 
          aria-label="Loading issue menu"
        />
      </div>
    </div>
  </div>
);

// Issues list skeleton
const IssuesListSkeleton: React.FC<{
  itemCount?: number;
  showVotes?: boolean;
  showControls?: boolean;
}> = ({ 
  itemCount = 6, 
  showVotes = true,
  showControls = true 
}) => (
  <div className="space-y-4">
    {showControls && <IssuesControlsSkeleton />}
    
    {/* Issues list */}
    <div className="space-y-3">
      {Array.from({ length: itemCount }).map((_, index) => (
        <div key={index} className="animate-fade-in" style={{ animationDelay: `${index * 40}ms` }}>
          <IssueItemSkeleton showVotes={showVotes} />
        </div>
      ))}
    </div>

    {/* Add issue placeholder */}
    <div className="border border-dashed border-border rounded-[6px] p-3 bg-muted/10">
      <div className="flex items-center gap-3">
        <SkeletonBase 
          className="w-5 h-5" 
          shape="circle" 
          aria-label="Loading add issue icon"
        />
        <SkeletonBase 
          className="h-4 w-32" 
          shape="text-line" 
          aria-label="Loading add issue text"
        />
      </div>
    </div>
  </div>
);

// Mobile issues skeleton
const MobileIssuesSkeleton: React.FC<{
  itemCount?: number;
}> = ({ itemCount = 8 }) => (
  <div className="space-y-4 p-4">
    {/* Mobile header */}
    <div className="space-y-4">
      <SkeletonBase 
        className="h-8 w-24" 
        shape="text-line" 
        aria-label="Loading mobile issues title"
      />
      
      {/* Mobile team selector */}
      <SkeletonBase 
        className="h-10 w-full" 
        shape="rectangle" 
        aria-label="Loading mobile team selector"
      />
      
      {/* Mobile tabs */}
      <div className="flex gap-2">
        <SkeletonBase 
          className="h-8 flex-1" 
          shape="rectangle" 
          aria-label="Loading mobile short-term tab"
        />
        <SkeletonBase 
          className="h-8 flex-1" 
          shape="rectangle" 
          aria-label="Loading mobile long-term tab"
        />
      </div>
    </div>

    {/* Mobile controls */}
    <div className="flex justify-between items-center">
      <SkeletonBase 
        className="h-8 w-20" 
        shape="rectangle" 
        aria-label="Loading mobile add button"
      />
      <SkeletonBase 
        className="h-8 w-24" 
        shape="rectangle" 
        aria-label="Loading mobile sort"
      />
    </div>

    {/* Mobile issues list */}
    <div className="space-y-3">
      {Array.from({ length: itemCount }).map((_, index) => (
        <div key={index} className="bg-card border border-border rounded-[6px] p-3 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <SkeletonBase 
                className="h-4 w-4/5" 
                shape="text-line" 
                aria-label="Loading mobile issue title"
              />
              <SkeletonBase 
                className="h-3 w-3/5" 
                shape="text-line" 
                aria-label="Loading mobile issue description"
              />
            </div>
            <SkeletonBase 
              className="w-6 h-6" 
              shape="rectangle" 
              aria-label="Loading mobile issue menu"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SkeletonBase 
                className="w-5 h-5" 
                shape="circle" 
                aria-label="Loading mobile issue owner"
              />
              <SkeletonBase 
                className="h-3 w-16" 
                shape="text-line" 
                aria-label="Loading mobile issue date"
              />
            </div>
            <SkeletonBase 
              className="h-5 w-12" 
              shape="rectangle" 
              aria-label="Loading mobile issue status"
            />
          </div>

          {/* Mobile voting */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              <SkeletonBase 
                className="w-4 h-4" 
                shape="rectangle" 
                aria-label="Loading mobile vote icon"
              />
              <SkeletonBase 
                className="h-3 w-8" 
                shape="text-line" 
                aria-label="Loading mobile vote count"
              />
            </div>
            <SkeletonBase 
              className="h-6 w-14" 
              shape="rectangle" 
              aria-label="Loading mobile vote button"
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Main issues page skeleton component
export const IssuesPageSkeleton: React.FC<{
  variant?: 'desktop' | 'mobile';
  showTabs?: boolean;
  showVoting?: boolean;
  itemCount?: number;
}> = ({ 
  variant = 'desktop',
  showTabs = true,
  showVoting = true,
  itemCount = 6
}) => {
  if (variant === 'mobile') {
    return (
      <div 
        className="min-h-screen bg-background animate-fade-in"
        role="status"
        aria-label="Loading mobile issues page"
      >
        <MobileIssuesSkeleton itemCount={itemCount} />

        <div className="sr-only" aria-live="polite">
          Loading your mobile issues, please wait...
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-background p-3 sm:p-6 animate-fade-in"
      role="status"
      aria-label="Loading issues page"
    >
      <div className="max-w-4xl mx-auto">
        <IssuesPageHeaderSkeleton />
        
        {showTabs && <IssueTypeTabsSkeleton />}
        
        {/* Content area */}
        <div className="bg-card border border-border rounded-[6px] p-4">
          <IssuesListSkeleton
            itemCount={itemCount}
            showVotes={showVoting}
            showControls={true}
          />
        </div>
      </div>

      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Loading your issues dashboard, please wait...
      </div>

      {/* High contrast focus indicator for accessibility */}
      <div className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:bg-background focus:text-foreground focus:p-2 focus:rounded focus:border-2 focus:border-primary">
        Skip to main content
      </div>
    </div>
  );
};

// Specialized skeletons for different issues page states
export const IssuesLoadingSkeleton: React.FC = () => (
  <IssuesPageSkeleton 
    variant="desktop"
    showTabs={true}
    showVoting={true}
    itemCount={6}
  />
);

export const MobileIssuesLoadingSkeleton: React.FC = () => (
  <IssuesPageSkeleton 
    variant="mobile"
    itemCount={8}
  />
);

// Meeting context skeleton (no team selector)
export const IssuesMeetingSkeleton: React.FC = () => (
  <div 
    className="space-y-6 animate-fade-in"
    role="status"
    aria-label="Loading meeting issues"
  >
    <IssueTypeTabsSkeleton />
    
    <div className="bg-card border border-border rounded-[6px] p-4">
      <IssuesListSkeleton
        itemCount={4}
        showVotes={true}
        showControls={false}
      />
    </div>

    <div className="sr-only" aria-live="polite">
      Loading meeting issues, please wait...
    </div>
  </div>
);

// Empty state with skeleton for team selection
export const IssuesTeamSelectionSkeleton: React.FC = () => (
  <div 
    className="min-h-screen bg-background p-3 sm:p-6 animate-fade-in"
    role="status"
    aria-label="Loading team selection for issues"
  >
    <div className="max-w-4xl mx-auto">
      <IssuesPageHeaderSkeleton />
      
      <div className="bg-card border border-border rounded-[6px] p-12 text-center space-y-4">
        <SkeletonBase
          className="h-6 w-64 mx-auto"
          shape="text-line"
          aria-label="Loading team selection message"
        />
        <SkeletonBase
          className="h-4 w-96 mx-auto"
          shape="text-line"
          aria-label="Loading team selection instructions"
        />
        <SkeletonBase
          className="h-8 w-48 mx-auto"
          shape="rectangle"
          aria-label="Loading team selector"
        />
      </div>
    </div>

    <div className="sr-only" aria-live="polite">
      Loading team selection for issues, please wait...
    </div>
  </div>
);

// Skeleton for no data state
export const IssuesNoDataSkeleton: React.FC = () => (
  <div 
    className="space-y-6 animate-fade-in"
    role="status"
    aria-label="Loading issues setup"
  >
    <IssuesPageHeaderSkeleton />
    <IssueTypeTabsSkeleton />
    
    <div className="bg-card border border-border rounded-[6px] p-12 text-center space-y-4">
      <SkeletonBase
        className="h-8 w-48 mx-auto"
        shape="text-line"
        aria-label="Loading no issues message"
      />
      <SkeletonBase 
        className="h-4 w-80 mx-auto" 
        shape="text-line" 
        aria-label="Loading issues setup instructions"
      />
      <SkeletonBase 
        className="h-8 w-32 mx-auto" 
        shape="rectangle" 
        aria-label="Loading add issue button"
      />
    </div>

    <div className="sr-only" aria-live="polite">
      Loading issues setup, please wait...
    </div>
  </div>
);