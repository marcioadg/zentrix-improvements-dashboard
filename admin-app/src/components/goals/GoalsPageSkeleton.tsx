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
const GoalsPageHeaderSkeleton: React.FC = () => (
  <div className="space-y-4 md:space-y-6 animate-fade-in">
    <div className="flex flex-col gap-2 md:gap-1">
      <SkeletonBase 
        className="h-8 md:h-10 w-24 md:w-32" 
        shape="text-line" 
        aria-label="Loading goals page title"
      />
      <SkeletonBase 
        className="h-4 md:h-5 w-64 md:w-80" 
        shape="text-line" 
        aria-label="Loading goals page description"
      />
    </div>
  </div>
);

// Team selector skeleton
const TeamSelectorSkeleton: React.FC = () => (
  <div className="space-y-4">
    <SkeletonBase 
      className="h-8 w-48" 
      shape="rectangle" 
      aria-label="Loading team selector"
    />
  </div>
);

// Company goals section skeleton
const CompanyGoalsSkeleton: React.FC<{
  goalCount?: number;
}> = ({ goalCount = 3 }) => (
  <div className="space-y-4">
    {/* Section header */}
    <div className="flex items-center gap-2">
      <SkeletonBase 
        className="w-5 h-5" 
        shape="rectangle" 
        aria-label="Loading company goals icon"
      />
      <SkeletonBase 
        className="h-6 w-32" 
        shape="text-line" 
        aria-label="Loading company goals title"
      />
    </div>

    {/* Company goals cards */}
    <div className="grid gap-4">
      {Array.from({ length: goalCount }).map((_, index) => (
        <div key={index} className="animate-fade-in bg-card border border-border rounded-[6px] p-3 mb-2 space-y-3" style={{ animationDelay: `${index * 40}ms` }}>
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <SkeletonBase 
                className="h-5 w-4/5" 
                shape="text-line" 
                aria-label="Loading company goal title"
              />
              <SkeletonBase 
                className="h-4 w-3/5" 
                shape="text-line" 
                aria-label="Loading company goal description"
              />
            </div>
            <div className="flex items-center gap-2">
              <SkeletonBase 
                className="w-6 h-6" 
                shape="circle" 
                aria-label="Loading goal owner avatar"
              />
              <SkeletonBase 
                className="w-4 h-4" 
                shape="rectangle" 
                aria-label="Loading goal actions"
              />
            </div>
          </div>
          
          {/* Progress section */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
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
              className="h-1.5 w-full rounded-full"
              shape="text-line"
              aria-label="Loading progress bar"
            />
          </div>

          {/* Date and status */}
          <div className="flex justify-between items-center text-sm">
            <SkeletonBase 
              className="h-3 w-20" 
              shape="text-line" 
              aria-label="Loading due date"
            />
            <SkeletonBase 
              className="h-5 w-16" 
              shape="rectangle" 
              aria-label="Loading status badge"
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Team goals section skeleton
const TeamGoalsSkeleton: React.FC<{
  personCount?: number;
  goalsPerPerson?: number;
}> = ({ 
  personCount = 4, 
  goalsPerPerson = 3 
}) => (
  <div className="space-y-4">
    {/* Section header */}
    <div className="border-t pt-4 md:pt-6">
      <SkeletonBase 
        className="h-6 w-28" 
        shape="text-line" 
        aria-label="Loading team goals title"
      />
    </div>

    {/* Team members and their goals */}
    <div className="space-y-6">
      {Array.from({ length: personCount }).map((_, personIndex) => (
        <div key={personIndex} className="animate-fade-in bg-card border border-border rounded-[6px]" style={{ animationDelay: `${personIndex * 40}ms` }}>
          {/* Person header */}
          <div className="p-4 border-b bg-muted/20">
            <div className="flex items-center gap-3">
              <SkeletonBase 
                className="w-10 h-10" 
                shape="circle" 
                aria-label="Loading person avatar"
              />
              <div className="flex-1 space-y-1">
                <SkeletonBase 
                  className="h-5 w-32" 
                  shape="text-line" 
                  aria-label="Loading person name"
                />
                <SkeletonBase 
                  className="h-3 w-24" 
                  shape="text-line" 
                  aria-label="Loading person role"
                />
              </div>
              <SkeletonBase 
                className="w-8 h-8" 
                shape="rectangle" 
                aria-label="Loading add goal button"
              />
            </div>
          </div>

          {/* Person's goals */}
          <div className="p-4 space-y-3">
            {Array.from({ length: goalsPerPerson }).map((_, goalIndex) => (
              <div key={goalIndex} className="flex items-start gap-3 p-3 border border-border rounded-[6px] mb-2 transition-colors duration-150">
                <SkeletonBase 
                  className="w-4 h-4 mt-1" 
                  shape="rectangle" 
                  aria-label="Loading goal checkbox"
                />
                <div className="flex-1 space-y-2">
                  <SkeletonBase 
                    className="h-4 w-4/5" 
                    shape="text-line" 
                    aria-label="Loading goal title"
                  />
                  <SkeletonBase 
                    className="h-3 w-3/5" 
                    shape="text-line" 
                    aria-label="Loading goal description"
                  />
                  
                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <SkeletonBase 
                        className="h-2 w-12" 
                        shape="text-line" 
                        aria-label="Loading progress text"
                      />
                      <SkeletonBase 
                        className="h-2 w-8" 
                        shape="text-line" 
                        aria-label="Loading progress percentage"
                      />
                    </div>
                    <SkeletonBase
                      className="h-1.5 w-full rounded-full"
                      shape="text-line"
                      aria-label="Loading progress bar"
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <SkeletonBase 
                      className="h-3 w-16" 
                      shape="text-line" 
                      aria-label="Loading due date"
                    />
                    <SkeletonBase 
                      className="h-4 w-12" 
                      shape="rectangle" 
                      aria-label="Loading status"
                    />
                  </div>
                </div>
                <SkeletonBase 
                  className="w-6 h-6" 
                  shape="rectangle" 
                  aria-label="Loading goal actions"
                />
              </div>
            ))}

            {/* Add goal button */}
            <div className="flex items-center gap-2 p-3 border-2 border-dashed border-muted rounded-md">
              <SkeletonBase 
                className="w-4 h-4" 
                shape="circle" 
                aria-label="Loading add goal icon"
              />
              <SkeletonBase 
                className="h-4 w-24" 
                shape="text-line" 
                aria-label="Loading add goal text"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Mobile goals skeleton
const MobileGoalsSkeleton: React.FC<{
  itemCount?: number;
}> = ({ itemCount = 8 }) => (
  <div className="space-y-4 p-4">
    {Array.from({ length: itemCount }).map((_, index) => (
      <div key={index} className="bg-card border border-border rounded-[6px] p-3 mb-2 space-y-3">
        {/* Goal header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <SkeletonBase 
              className="w-6 h-6" 
              shape="circle" 
              aria-label="Loading mobile goal avatar"
            />
            <div className="space-y-1 flex-1">
              <SkeletonBase 
                className="h-4 w-3/4" 
                shape="text-line" 
                aria-label="Loading mobile goal title"
              />
              <SkeletonBase 
                className="h-3 w-1/2" 
                shape="text-line" 
                aria-label="Loading mobile goal owner"
              />
            </div>
          </div>
          <SkeletonBase 
            className="w-4 h-4" 
            shape="rectangle" 
            aria-label="Loading mobile goal actions"
          />
        </div>

        {/* Goal content */}
        <div className="space-y-2">
          <SkeletonBase 
            className="h-3 w-full" 
            shape="text-line" 
            aria-label="Loading mobile goal description"
          />
          <SkeletonBase 
            className="h-3 w-4/5" 
            shape="text-line" 
            aria-label="Loading mobile goal description continued"
          />
        </div>

        {/* Progress section */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <SkeletonBase 
              className="h-3 w-16" 
              shape="text-line" 
              aria-label="Loading mobile progress label"
            />
            <SkeletonBase 
              className="h-3 w-8" 
              shape="text-line" 
              aria-label="Loading mobile progress percentage"
            />
          </div>
          <SkeletonBase
            className="h-1.5 w-full rounded-full"
            shape="text-line"
            aria-label="Loading mobile progress bar"
          />
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center">
          <SkeletonBase 
            className="h-3 w-20" 
            shape="text-line" 
            aria-label="Loading mobile due date"
          />
          <SkeletonBase 
            className="h-5 w-16" 
            shape="rectangle" 
            aria-label="Loading mobile status badge"
          />
        </div>
      </div>
    ))}
  </div>
);

// Main goals page skeleton component
export const GoalsPageSkeleton: React.FC<{
  variant?: 'desktop' | 'mobile';
  showHeader?: boolean;
  showTeamSelector?: boolean;
  companyGoalCount?: number;
  teamPersonCount?: number;
}> = ({ 
  variant = 'desktop',
  showHeader = true,
  showTeamSelector = true,
  companyGoalCount = 3,
  teamPersonCount = 4
}) => {
  if (variant === 'mobile') {
    return (
      <div 
        className="space-y-4 animate-fade-in"
        role="status"
        aria-label="Loading mobile goals page"
      >
        {showHeader && <GoalsPageHeaderSkeleton />}
        
        {showTeamSelector && (
          <div className="p-4">
            <SkeletonBase 
              className="h-8 w-full" 
              shape="rectangle" 
              aria-label="Loading mobile team selector"
            />
          </div>
        )}
        
        <MobileGoalsSkeleton />

        <div className="sr-only" aria-live="polite">
          Loading your mobile goals, please wait...
        </div>
      </div>
    );
  }

  return (
    <div 
      className="space-y-4 md:space-y-6 animate-fade-in"
      role="status"
      aria-label="Loading goals page"
    >
      {showHeader && <GoalsPageHeaderSkeleton />}
      
      {showTeamSelector && <TeamSelectorSkeleton />}
      
      <CompanyGoalsSkeleton goalCount={companyGoalCount} />
      
      <TeamGoalsSkeleton 
        personCount={teamPersonCount} 
        goalsPerPerson={3} 
      />

      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Loading your goals dashboard, please wait...
      </div>

      {/* High contrast focus indicator for accessibility */}
      <div className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:bg-background focus:text-foreground focus:p-2 focus:rounded focus:border-2 focus:border-primary">
        Skip to main content
      </div>
    </div>
  );
};

// Specialized skeletons for different goals page states
export const GoalsLoadingSkeleton: React.FC = () => (
  <GoalsPageSkeleton 
    variant="desktop"
    showHeader={true}
    showTeamSelector={true}
    companyGoalCount={3}
    teamPersonCount={4}
  />
);

export const MobileGoalsLoadingSkeleton: React.FC = () => (
  <GoalsPageSkeleton 
    variant="mobile"
    showHeader={true}
    showTeamSelector={true}
  />
);

// Empty state with skeleton for team selection
export const GoalsTeamSelectionSkeleton: React.FC = () => (
  <div 
    className="space-y-6 animate-fade-in"
    role="status"
    aria-label="Loading team selection for goals"
  >
    <GoalsPageHeaderSkeleton />
    
    <div className="bg-card border rounded-lg p-8 text-center space-y-4">
      <SkeletonBase 
        className="h-6 w-56 mx-auto" 
        shape="text-line" 
        aria-label="Loading team selection message"
      />
      <SkeletonBase 
        className="h-4 w-80 mx-auto" 
        shape="text-line" 
        aria-label="Loading team selection instructions"
      />
      <SkeletonBase 
        className="h-8 w-48 mx-auto" 
        shape="rectangle" 
        aria-label="Loading team selector"
      />
    </div>

    <div className="sr-only" aria-live="polite">
      Loading team selection for goals, please wait...
    </div>
  </div>
);

// Skeleton for no data state
export const GoalsNoDataSkeleton: React.FC = () => (
  <div 
    className="space-y-6 animate-fade-in"
    role="status"
    aria-label="Loading goals setup"
  >
    <GoalsPageHeaderSkeleton />
    <TeamSelectorSkeleton />
    
    <div className="bg-card border rounded-lg p-12 text-center space-y-4">
      <SkeletonBase 
        className="h-8 w-64 mx-auto" 
        shape="text-line" 
        aria-label="Loading no goals message"
      />
      <SkeletonBase 
        className="h-4 w-96 mx-auto" 
        shape="text-line" 
        aria-label="Loading goals setup instructions"
      />
      <SkeletonBase 
        className="h-8 w-32 mx-auto" 
        shape="rectangle" 
        aria-label="Loading add goal button"
      />
    </div>

    <div className="sr-only" aria-live="polite">
      Loading goals setup, please wait...
    </div>
  </div>
);