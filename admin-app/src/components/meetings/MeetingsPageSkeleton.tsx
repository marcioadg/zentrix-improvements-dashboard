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
const MeetingsPageHeaderSkeleton: React.FC = () => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4 animate-fade-in">
    <div className="text-center sm:text-left space-y-2">
      <SkeletonBase 
        className="h-8 sm:h-10 lg:h-12 w-48 sm:w-64 mx-auto sm:mx-0" 
        shape="text-line" 
        aria-label="Loading meetings page title"
      />
      <SkeletonBase 
        className="h-4 sm:h-5 w-56 sm:w-80 mx-auto sm:mx-0" 
        shape="text-line" 
        aria-label="Loading meetings page description"
      />
    </div>
  </div>
);

// Quick start meeting card skeleton
const QuickStartMeetingCardSkeleton: React.FC<{
  isActive?: boolean;
  isDisabled?: boolean;
}> = ({ isActive = false, isDisabled = false }) => (
  <div className={cn(
    "border rounded-lg bg-card transition-all",
    isDisabled ? "bg-muted/50 opacity-75" : "hover:shadow-lg hover:border-muted-foreground/20"
  )}>
    {/* Header */}
    <div className="p-4 sm:p-6 pb-3 sm:pb-6">
      <div className="flex items-center gap-3">
        <SkeletonBase 
          className={cn(
            "w-10 h-10 sm:w-12 sm:h-12",
            isDisabled ? "bg-muted" : ""
          )}
          shape="rectangle" 
          aria-label="Loading meeting type icon"
        />
        <div className="flex-1 min-w-0">
          <SkeletonBase 
            className={cn(
              "h-5 sm:h-6 w-32 sm:w-40",
              isDisabled ? "bg-muted" : ""
            )}
            shape="text-line" 
            aria-label="Loading meeting title"
          />
        </div>
      </div>
    </div>

    {/* Content */}
    <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4">
      {/* Meeting details */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-1">
          <SkeletonBase 
            className={cn(
              "w-3 h-3 sm:w-4 sm:h-4",
              isDisabled ? "bg-muted/70" : ""
            )}
            shape="rectangle" 
            aria-label="Loading duration icon"
          />
          <SkeletonBase 
            className={cn(
              "h-3 sm:h-4 w-20",
              isDisabled ? "bg-muted/70" : ""
            )}
            shape="text-line" 
            aria-label="Loading duration"
          />
        </div>
        <div className="flex items-center gap-1">
          <SkeletonBase 
            className={cn(
              "w-3 h-3 sm:w-4 sm:h-4",
              isDisabled ? "bg-muted/70" : ""
            )}
            shape="rectangle" 
            aria-label="Loading participants icon"
          />
          <SkeletonBase 
            className={cn(
              "h-3 sm:h-4 w-24 sm:hidden",
              isDisabled ? "bg-muted/70" : ""
            )}
            shape="text-line" 
            aria-label="Loading participants"
          />
        </div>
      </div>

      {/* Active meeting indicator */}
      {isActive && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <SkeletonBase 
              className="w-2 h-2 rounded-full bg-success animate-pulse"
              aria-label="Loading active indicator"
            />
            <SkeletonBase 
              className="h-3 sm:h-4 w-40" 
              shape="text-line" 
              aria-label="Loading active meeting status"
            />
          </div>
          
          {/* Meeting members */}
          <div className="flex items-center gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonBase 
                key={index}
                className="w-6 h-6 sm:w-8 sm:h-8" 
                shape="circle" 
                aria-label="Loading meeting member avatar"
              />
            ))}
            <SkeletonBase 
              className="h-3 w-8" 
              shape="text-line" 
              aria-label="Loading member count"
            />
          </div>
        </div>
      )}

      {/* Action button */}
      <SkeletonBase 
        className={cn(
          "h-9 sm:h-10 w-full",
          isActive ? "bg-success" : isDisabled ? "bg-muted" : ""
        )}
        shape="rectangle" 
        aria-label="Loading meeting action button"
      />

      {/* Status message */}
      <SkeletonBase 
        className={cn(
          "h-3 w-full sm:w-64 mx-auto",
          isDisabled ? "bg-muted/70" : ""
        )}
        shape="text-line" 
        aria-label="Loading status message"
      />
    </div>
  </div>
);

// Quick start meetings section skeleton
const QuickStartMeetingsSkeleton: React.FC = () => (
  <div className="space-y-4 sm:space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
      {/* Weekly Meeting Card */}
      <QuickStartMeetingCardSkeleton />
      
      {/* Quarterly Meeting Card */}
      <QuickStartMeetingCardSkeleton />
      
      {/* Annual Meeting Card (Disabled) */}
      <QuickStartMeetingCardSkeleton isDisabled={true} />
    </div>
  </div>
);

// Active meetings list skeleton
const ActiveMeetingsListSkeleton: React.FC<{
  itemCount?: number;
}> = ({ itemCount = 5 }) => (
  <div className="border rounded-lg bg-card">
    {/* Header */}
    <div className="p-4 sm:p-6 border-b">
      <div className="flex items-center justify-between">
        <SkeletonBase 
          className="h-6 w-40" 
          shape="text-line" 
          aria-label="Loading meetings list header"
        />
        <SkeletonBase 
          className="h-4 w-24" 
          shape="text-line" 
          aria-label="Loading meetings count"
        />
      </div>
    </div>

    {/* Content */}
    <div className="p-3 sm:p-6">
      <div className="space-y-2 sm:space-y-3">
        {Array.from({ length: itemCount }).map((_, index) => (
          <div 
            key={index} 
            className="animate-fade-in flex items-center justify-between p-3 border rounded-lg hover:bg-muted/20 transition-colors"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <div className="flex-1 space-y-2">
              {/* Meeting info row */}
              <div className="flex items-center gap-2">
                <SkeletonBase 
                  className="h-5 w-28" 
                  shape="text-line" 
                  aria-label="Loading meeting name"
                />
                <SkeletonBase 
                  className="h-4 w-16" 
                  shape="rectangle" 
                  aria-label="Loading meeting type badge"
                />
                <SkeletonBase 
                  className="h-4 w-12" 
                  shape="rectangle" 
                  aria-label="Loading meeting status"
                />
                <SkeletonBase 
                  className="h-4 w-20" 
                  shape="text-line" 
                  aria-label="Loading meeting duration"
                />
              </div>
              
              {/* Meeting details row */}
              <div className="flex items-center gap-4">
                <SkeletonBase 
                  className="h-4 w-24" 
                  shape="text-line" 
                  aria-label="Loading team name"
                />
                <SkeletonBase 
                  className="h-4 w-20" 
                  shape="text-line" 
                  aria-label="Loading meeting date"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <SkeletonBase 
                className="h-8 w-20" 
                shape="rectangle" 
                aria-label="Loading join button"
              />
              <SkeletonBase 
                className="h-8 w-16" 
                shape="rectangle" 
                aria-label="Loading actions menu"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Show more button */}
      <div className="mt-3 sm:mt-4 text-center">
        <SkeletonBase 
          className="h-8 w-40 mx-auto" 
          shape="rectangle" 
          aria-label="Loading show more button"
        />
      </div>
    </div>
  </div>
);

// Mobile meetings skeleton
const MobileMeetingsSkeleton: React.FC = () => (
  <div className="space-y-4 p-4 animate-fade-in">
    {/* Mobile header */}
    <div className="text-center space-y-2">
      <SkeletonBase 
        className="h-8 w-48 mx-auto" 
        shape="text-line" 
        aria-label="Loading mobile meetings title"
      />
      <SkeletonBase 
        className="h-4 w-64 mx-auto" 
        shape="text-line" 
        aria-label="Loading mobile meetings description"
      />
    </div>

    {/* Mobile quick start cards */}
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="bg-card border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <SkeletonBase 
              className="w-10 h-10" 
              shape="rectangle" 
              aria-label="Loading mobile meeting icon"
            />
            <div className="flex-1 space-y-1">
              <SkeletonBase 
                className="h-5 w-32" 
                shape="text-line" 
                aria-label="Loading mobile meeting title"
              />
              <SkeletonBase 
                className="h-3 w-24" 
                shape="text-line" 
                aria-label="Loading mobile meeting duration"
              />
            </div>
          </div>

          <SkeletonBase 
            className="h-9 w-full" 
            shape="rectangle" 
            aria-label="Loading mobile action button"
          />
        </div>
      ))}
    </div>

    {/* Mobile active meetings */}
    <div className="space-y-3 mt-6">
      <SkeletonBase 
        className="h-6 w-32" 
        shape="text-line" 
        aria-label="Loading active meetings title"
      />
      
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="bg-card border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <SkeletonBase 
              className="h-4 w-28" 
              shape="text-line" 
              aria-label="Loading mobile meeting name"
            />
            <SkeletonBase 
              className="h-4 w-12" 
              shape="rectangle" 
              aria-label="Loading mobile meeting status"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <SkeletonBase 
              className="h-3 w-20" 
              shape="text-line" 
              aria-label="Loading mobile team name"
            />
            <SkeletonBase 
              className="h-6 w-16" 
              shape="rectangle" 
              aria-label="Loading mobile join button"
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Main meetings page skeleton component
export const MeetingsPageSkeleton: React.FC<{
  variant?: 'desktop' | 'mobile';
  showQuickStart?: boolean;
  showActiveMeetings?: boolean;
  activeMeetingsCount?: number;
}> = ({ 
  variant = 'desktop',
  showQuickStart = true,
  showActiveMeetings = true,
  activeMeetingsCount = 5
}) => {
  if (variant === 'mobile') {
    return (
      <div 
        className="min-h-screen bg-background animate-fade-in"
        role="status"
        aria-label="Loading mobile meetings page"
      >
        <MobileMeetingsSkeleton />

        <div className="sr-only" aria-live="polite">
          Loading your mobile meetings, please wait...
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-background p-4 sm:p-6 animate-fade-in"
      role="status"
      aria-label="Loading meetings page"
    >
      <div className="max-w-7xl mx-auto">
        <MeetingsPageHeaderSkeleton />

        <div className="space-y-4 sm:space-y-6">
          {showQuickStart && <QuickStartMeetingsSkeleton />}
          
          {showActiveMeetings && (
            <ActiveMeetingsListSkeleton itemCount={activeMeetingsCount} />
          )}
        </div>
      </div>

      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Loading your meetings dashboard, please wait...
      </div>

      {/* High contrast focus indicator for accessibility */}
      <div className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:bg-background focus:text-foreground focus:p-2 focus:rounded focus:border-2 focus:border-primary">
        Skip to main content
      </div>
    </div>
  );
};

// Specialized skeletons for different meetings page states
export const MeetingsLoadingSkeleton: React.FC = () => (
  <MeetingsPageSkeleton 
    variant="desktop"
    showQuickStart={true}
    showActiveMeetings={true}
    activeMeetingsCount={5}
  />
);

export const MobileMeetingsLoadingSkeleton: React.FC = () => (
  <MeetingsPageSkeleton 
    variant="mobile"
  />
);

// Skeleton for quick start only (when no active meetings)
export const MeetingsQuickStartSkeleton: React.FC = () => (
  <MeetingsPageSkeleton 
    variant="desktop"
    showQuickStart={true}
    showActiveMeetings={false}
  />
);

// Skeleton for active meetings only
export const MeetingsActiveSkeleton: React.FC = () => (
  <div 
    className="space-y-6 animate-fade-in"
    role="status"
    aria-label="Loading active meetings"
  >
    <ActiveMeetingsListSkeleton itemCount={3} />

    <div className="sr-only" aria-live="polite">
      Loading active meetings, please wait...
    </div>
  </div>
);

// Empty state skeleton
export const MeetingsEmptySkeleton: React.FC = () => (
  <div 
    className="min-h-screen bg-background p-4 sm:p-6 animate-fade-in"
    role="status"
    aria-label="Loading meetings setup"
  >
    <div className="max-w-7xl mx-auto">
      <MeetingsPageHeaderSkeleton />
      
      <div className="bg-card border rounded-lg p-12 text-center space-y-4">
        <SkeletonBase 
          className="h-8 w-56 mx-auto" 
          shape="text-line" 
          aria-label="Loading empty state message"
        />
        <SkeletonBase 
          className="h-4 w-80 mx-auto" 
          shape="text-line" 
          aria-label="Loading empty state instructions"
        />
        <SkeletonBase 
          className="h-10 w-40 mx-auto" 
          shape="rectangle" 
          aria-label="Loading start meeting button"
        />
      </div>
    </div>

    <div className="sr-only" aria-live="polite">
      Loading meetings setup, please wait...
    </div>
  </div>
);