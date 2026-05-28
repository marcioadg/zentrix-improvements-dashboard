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
    rectangle: "rounded-[4px]",
    circle: "rounded-full",
    'text-line': "rounded-[4px]"
  };

  return (
    <div 
      className={cn(baseClasses, shapeClasses[shape], className)}
      aria-label={ariaLabel || "Loading content"}
      role="status"
    />
  );
};

// Sidebar skeleton component
const SidebarSkeleton: React.FC = () => (
  <div className="w-64 border-r bg-card flex flex-col h-screen">
    {/* Header skeleton */}
    <div className="p-4 border-b">
      <SkeletonBase 
        className="h-8 w-32 mb-2" 
        shape="text-line" 
        aria-label="Loading company name"
      />
      <SkeletonBase 
        className="h-4 w-20" 
        shape="text-line" 
        aria-label="Loading company role"
      />
    </div>

    {/* Navigation skeleton */}
    <div className="flex-1 p-2 space-y-1">
      {/* Main navigation group */}
      <div className="space-y-0.5 mb-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={`main-${index}`} className="flex items-center gap-3 p-2 rounded-md">
            <SkeletonBase 
              className="w-4 h-4" 
              shape="rectangle" 
              aria-label="Loading navigation icon"
            />
            <SkeletonBase 
              className="h-4 flex-1" 
              shape="text-line" 
              aria-label="Loading navigation item"
            />
          </div>
        ))}
      </div>

      {/* Management navigation group */}
      <div className="space-y-0.5 mb-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`mgmt-${index}`} className="flex items-center gap-3 p-2 rounded-md">
            <SkeletonBase 
              className="w-4 h-4" 
              shape="rectangle" 
              aria-label="Loading management navigation icon"
            />
            <SkeletonBase 
              className="h-4 flex-1" 
              shape="text-line" 
              aria-label="Loading management navigation item"
            />
          </div>
        ))}
      </div>

      {/* Settings */}
      <div className="flex items-center gap-3 p-2 rounded-md">
        <SkeletonBase 
          className="w-4 h-4" 
          shape="rectangle" 
          aria-label="Loading settings icon"
        />
        <SkeletonBase 
          className="h-4 flex-1" 
          shape="text-line" 
          aria-label="Loading settings"
        />
      </div>
    </div>

    {/* Footer skeleton */}
    <div className="p-4 border-t space-y-3">
      {/* User profile skeleton */}
      <div className="flex items-center gap-3">
        <SkeletonBase 
          className="w-8 h-8" 
          shape="circle" 
          aria-label="Loading user avatar"
        />
        <div className="flex-1 space-y-1">
          <SkeletonBase 
            className="h-3 w-20" 
            shape="text-line" 
            aria-label="Loading user name"
          />
          <SkeletonBase 
            className="h-2 w-16" 
            shape="text-line" 
            aria-label="Loading user email"
          />
        </div>
      </div>
      
      {/* Version display skeleton */}
      <SkeletonBase 
        className="h-3 w-12" 
        shape="text-line" 
        aria-label="Loading version"
      />
    </div>
  </div>
);

// Header skeleton component
const HeaderSkeleton: React.FC = () => (
  <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0 w-full">
    <div className="flex h-14 items-center justify-between px-4 w-full">
      <div className="flex items-center gap-2">
        <SkeletonBase 
          className="w-6 h-6" 
          shape="rectangle" 
          aria-label="Loading sidebar trigger"
        />
      </div>
      <div className="flex items-center gap-2">
        <SkeletonBase 
          className="w-20 h-8" 
          shape="rectangle" 
          aria-label="Loading join meeting button"
        />
        <SkeletonBase 
          className="w-8 h-8" 
          shape="rectangle" 
          aria-label="Loading create dropdown"
        />
      </div>
    </div>
  </header>
);

// Dashboard content skeleton
const DashboardContentSkeleton: React.FC = () => (
  <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
    {/* Welcome Header */}
    <div className="mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2">
          <SkeletonBase 
            className="h-8 w-64" 
            shape="text-line" 
            aria-label="Loading welcome message"
          />
          <SkeletonBase 
            className="h-4 w-48" 
            shape="text-line" 
            aria-label="Loading date"
          />
        </div>
        
        {/* KPI Cards skeleton */}
        <div className="lg:max-w-md">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="p-4 border rounded-[6px] bg-card space-y-2">
                <SkeletonBase 
                  className="h-4 w-20" 
                  shape="text-line" 
                  aria-label="Loading KPI label"
                />
                <SkeletonBase 
                  className="h-8 w-16" 
                  shape="text-line" 
                  aria-label="Loading KPI value"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Main Dashboard Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
      {/* Tasks Section */}
      <div className="lg:col-span-3 flex">
        <div className="w-full h-[500px] border rounded-[6px] bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SkeletonBase 
                className="w-5 h-5" 
                shape="rectangle" 
                aria-label="Loading tasks icon"
              />
              <SkeletonBase 
                className="h-6 w-20" 
                shape="text-line" 
                aria-label="Loading tasks title"
              />
            </div>
            <SkeletonBase 
              className="w-16 h-6" 
              shape="text-line" 
              aria-label="Loading view all button"
            />
          </div>
          
          {/* Task items */}
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 p-2 rounded-md border">
                <SkeletonBase 
                  className="w-4 h-4" 
                  shape="rectangle" 
                  aria-label="Loading task checkbox"
                />
                <div className="flex-1 space-y-1">
                  <SkeletonBase 
                    className="h-4 w-3/4" 
                    shape="text-line" 
                    aria-label="Loading task title"
                  />
                  <SkeletonBase 
                    className="h-3 w-1/2" 
                    shape="text-line" 
                    aria-label="Loading task details"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Goals Section */}
      <div className="lg:col-span-3 flex">
        <div className="w-full h-[500px] border rounded-[6px] bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SkeletonBase 
                className="w-5 h-5" 
                shape="rectangle" 
                aria-label="Loading goals icon"
              />
              <SkeletonBase 
                className="h-6 w-20" 
                shape="text-line" 
                aria-label="Loading goals title"
              />
            </div>
            <SkeletonBase 
              className="w-16 h-6" 
              shape="text-line" 
              aria-label="Loading view all button"
            />
          </div>
          
          {/* Goal items */}
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="p-3 rounded-md border space-y-2">
                <SkeletonBase 
                  className="h-4 w-4/5" 
                  shape="text-line" 
                  aria-label="Loading goal title"
                />
                <div className="flex items-center gap-2">
                  <SkeletonBase 
                    className="h-2 flex-1" 
                    shape="text-line" 
                    aria-label="Loading goal progress"
                  />
                  <SkeletonBase 
                    className="h-3 w-8" 
                    shape="text-line" 
                    aria-label="Loading goal percentage"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics Section */}
      <div className="lg:col-span-4 flex">
        <div className="w-full h-[500px] border rounded-[6px] bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SkeletonBase 
                className="w-5 h-5" 
                shape="rectangle" 
                aria-label="Loading metrics icon"
              />
              <SkeletonBase 
                className="h-6 w-20" 
                shape="text-line" 
                aria-label="Loading metrics title"
              />
            </div>
            <SkeletonBase 
              className="w-16 h-6" 
              shape="text-line" 
              aria-label="Loading view all button"
            />
          </div>
          
          {/* Metrics table */}
          <div className="space-y-2">
            {/* Table header */}
            <div className="grid grid-cols-4 gap-4 p-2 border-b">
              <SkeletonBase className="h-3 w-12" shape="text-line" />
              <SkeletonBase className="h-3 w-10" shape="text-line" />
              <SkeletonBase className="h-3 w-8" shape="text-line" />
              <SkeletonBase className="h-3 w-10" shape="text-line" />
            </div>
            
            {/* Table rows */}
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="grid grid-cols-4 gap-4 p-2">
                <SkeletonBase className="h-3 w-16" shape="text-line" />
                <SkeletonBase className="h-3 w-8" shape="text-line" />
                <SkeletonBase className="h-3 w-6" shape="text-line" />
                <SkeletonBase className="h-3 w-10" shape="text-line" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Screen reader announcement */}
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      Loading your dashboard, please wait...
    </div>
  </div>
);

// Main app layout skeleton component
export const AppLayoutSkeleton: React.FC<{
  content?: 'dashboard' | 'custom';
  children?: React.ReactNode;
}> = ({ 
  content = 'dashboard',
  children 
}) => {
  return (
    <div 
      className="min-h-screen flex w-full animate-fade-in"
      role="status"
      aria-label="Loading application"
    >
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <SidebarSkeleton />
      </div>
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop header */}
        <div className="hidden md:block">
          <HeaderSkeleton />
        </div>
        
        {/* Mobile header skeleton */}
        <div className="md:hidden border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center justify-between px-4">
            <SkeletonBase 
              className="w-8 h-8" 
              shape="rectangle" 
              aria-label="Loading mobile menu"
            />
            <SkeletonBase 
              className="w-24 h-6" 
              shape="text-line" 
              aria-label="Loading company name"
            />
            <SkeletonBase 
              className="w-8 h-8" 
              shape="circle" 
              aria-label="Loading user avatar"
            />
          </div>
        </div>
        
        {/* Main content */}
        <main className="flex-1 overflow-auto min-w-0 pb-20 md:pb-0">
          {content === 'dashboard' ? (
            <DashboardContentSkeleton />
          ) : (
            children || (
              <div className="p-6 space-y-6 animate-fade-in">
                {/* Generic page skeleton */}
                <div className="space-y-4">
                  <SkeletonBase 
                    className="h-8 w-48" 
                    shape="text-line" 
                    aria-label="Loading page title"
                  />
                  <SkeletonBase 
                    className="h-4 w-96" 
                    shape="text-line" 
                    aria-label="Loading page description"
                  />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="p-4 border rounded-[6px] bg-card space-y-3">
                      <SkeletonBase className="h-5 w-3/4" shape="text-line" />
                      <SkeletonBase className="h-4 w-full" shape="text-line" />
                      <SkeletonBase className="h-4 w-2/3" shape="text-line" />
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </main>
      </div>
      
      {/* Mobile bottom navigation skeleton */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-around p-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex flex-col items-center gap-1 p-2">
              <SkeletonBase 
                className="w-5 h-5" 
                shape="rectangle" 
                aria-label="Loading mobile nav icon"
              />
              <SkeletonBase 
                className="h-2 w-8" 
                shape="text-line" 
                aria-label="Loading mobile nav label"
              />
            </div>
          ))}
        </div>
      </div>

      {/* High contrast focus indicator for accessibility */}
      <div className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:bg-background focus:text-foreground focus:p-2 focus:rounded focus:border-2 focus:border-primary">
        Skip to main content
      </div>
    </div>
  );
};

// Mobile-specific app layout skeleton
export const MobileAppLayoutSkeleton: React.FC = () => (
  <div 
    className="min-h-screen bg-background animate-fade-in"
    role="status"
    aria-label="Loading mobile application"
  >
    {/* Mobile header */}
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        <SkeletonBase 
          className="w-8 h-8" 
          shape="rectangle" 
          aria-label="Loading mobile menu"
        />
        <SkeletonBase 
          className="w-24 h-6" 
          shape="text-line" 
          aria-label="Loading company name"
        />
        <SkeletonBase 
          className="w-8 h-8" 
          shape="circle" 
          aria-label="Loading user avatar"
        />
      </div>
    </div>
    
    {/* Mobile content */}
    <div className="p-4 space-y-4 pb-20">
      <div className="space-y-2">
        <SkeletonBase 
          className="h-6 w-32" 
          shape="text-line" 
          aria-label="Loading mobile page title"
        />
        <SkeletonBase 
          className="h-4 w-48" 
          shape="text-line" 
          aria-label="Loading mobile page description"
        />
      </div>
      
      {/* Mobile content cards */}
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="p-3 border rounded-[6px] bg-card space-y-2">
            <div className="flex items-center gap-3">
              <SkeletonBase 
                className="w-8 h-8" 
                shape="circle" 
                aria-label="Loading mobile item icon"
              />
              <div className="flex-1 space-y-1">
                <SkeletonBase 
                  className="h-4 w-3/4" 
                  shape="text-line" 
                  aria-label="Loading mobile item title"
                />
                <SkeletonBase 
                  className="h-3 w-1/2" 
                  shape="text-line" 
                  aria-label="Loading mobile item details"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
    
    {/* Mobile bottom navigation */}
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-around p-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex flex-col items-center gap-1 p-2">
            <SkeletonBase 
              className="w-5 h-5" 
              shape="rectangle" 
              aria-label="Loading mobile nav icon"
            />
            <SkeletonBase 
              className="h-2 w-8" 
              shape="text-line" 
              aria-label="Loading mobile nav label"
            />
          </div>
        ))}
      </div>
    </div>

    <div className="sr-only" aria-live="polite">
      Loading your mobile application, please wait...
    </div>
  </div>
);