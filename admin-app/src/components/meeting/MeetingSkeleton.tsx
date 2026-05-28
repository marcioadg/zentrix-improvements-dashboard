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

// Meeting header skeleton that mimics MeetingLayout header
const MeetingHeaderSkeleton: React.FC = () => (
  <div className="sticky top-0 z-50 bg-background border-b border-border/20 px-6 py-4 backdrop-blur-sm">
    <div className="flex items-center justify-between">
      {/* Left: Team name and meeting status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <SkeletonBase 
            className="h-6 w-48" 
            shape="text-line" 
            aria-label="Loading team name"
          />
          <div className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded-md border border-border/40">
            <SkeletonBase 
              className="w-1.5 h-1.5 rounded-full" 
              aria-label="Loading meeting status"
            />
            <SkeletonBase 
              className="h-3 w-8" 
              shape="text-line" 
              aria-label="Loading status text"
            />
          </div>
        </div>
        
        {/* Divider */}
        <div className="h-6 w-px bg-border/40" />
        
        {/* Timer and status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <SkeletonBase 
              className="h-4 w-16 font-mono" 
              shape="text-line" 
              aria-label="Loading timer"
            />
            <SkeletonBase 
              className="h-6 w-6 p-0" 
              shape="rectangle" 
              aria-label="Loading pause button"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-muted-foreground/50 transition-all duration-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonBase 
              key={index}
              className="w-8 h-8" 
              shape="circle" 
              aria-label="Loading attendee avatar"
            />
          ))}
        </div>
        <div className="h-6 w-px bg-border/40" />
        <SkeletonBase 
          className="h-9 w-24" 
          shape="rectangle" 
          aria-label="Loading end meeting button"
        />
      </div>
    </div>
  </div>
);

// Meeting content skeleton
const MeetingContentSkeleton: React.FC = () => (
  <div className="p-6 space-y-6">
    {/* Meeting agenda section */}
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SkeletonBase 
          className="h-7 w-40" 
          shape="text-line" 
          aria-label="Loading section title"
        />
        <SkeletonBase 
          className="h-6 w-20" 
          shape="rectangle" 
          aria-label="Loading section badge"
        />
      </div>
      
      {/* Agenda items */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 p-4 border rounded-lg">
            <SkeletonBase 
              className="w-6 h-6" 
              shape="circle" 
              aria-label="Loading agenda item number"
            />
            <div className="flex-1 space-y-2">
              <SkeletonBase 
                className="h-5 w-64" 
                shape="text-line" 
                aria-label="Loading agenda item title"
              />
              <SkeletonBase 
                className="h-4 w-32" 
                shape="text-line" 
                aria-label="Loading agenda item duration"
              />
            </div>
            <SkeletonBase 
              className="w-8 h-8" 
              shape="rectangle" 
              aria-label="Loading agenda item status"
            />
          </div>
        ))}
      </div>
    </div>

    {/* Meeting sections */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left column */}
      <div className="space-y-6">
        <div className="border rounded-lg p-4">
          <SkeletonBase 
            className="h-6 w-32 mb-4" 
            shape="text-line" 
            aria-label="Loading section header"
          />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <SkeletonBase 
                  className="w-4 h-4" 
                  shape="rectangle" 
                  aria-label="Loading item icon"
                />
                <SkeletonBase 
                  className="h-4 flex-1" 
                  shape="text-line" 
                  aria-label="Loading item text"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right column */}
      <div className="space-y-6">
        <div className="border rounded-lg p-4">
          <SkeletonBase 
            className="h-6 w-40 mb-4" 
            shape="text-line" 
            aria-label="Loading section header"
          />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="p-3 border rounded">
                <SkeletonBase 
                  className="h-4 w-full mb-2" 
                  shape="text-line" 
                  aria-label="Loading item title"
                />
                <SkeletonBase 
                  className="h-3 w-3/4" 
                  shape="text-line" 
                  aria-label="Loading item description"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Main meeting skeleton component
export const MeetingSkeleton: React.FC = () => {
  return (
    <div 
      className="min-h-screen bg-background animate-fade-in"
      role="status"
      aria-label="Loading meeting"
    >
      <MeetingHeaderSkeleton />
      <MeetingContentSkeleton />
      
      {/* Fixed elements skeleton */}
      <div className="fixed bottom-8 left-8 z-40">
        <SkeletonBase 
          className="h-9 w-20" 
          shape="rectangle" 
          aria-label="Loading leave button"
        />
      </div>
      
      <div className="fixed bottom-8 right-8">
        <SkeletonBase 
          className="w-10 h-10 rounded-full" 
          aria-label="Loading floating action button"
        />
      </div>

      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Loading meeting, please wait...
      </div>
    </div>
  );
};