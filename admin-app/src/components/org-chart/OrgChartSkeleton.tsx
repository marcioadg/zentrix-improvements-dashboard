
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface OrgChartSkeletonProps {
  rolesCount?: number;
  variant?: 'loading' | 'empty' | 'error';
  className?: string;
}

// Shimmer overlay component for enhanced loading effect
const ShimmerOverlay: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn(
    "absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-background/50 to-transparent",
    className
  )} />
);

// Enhanced role card skeleton with shimmer
const EnhancedRoleCardSkeleton: React.FC<{ 
  size?: 'sm' | 'md' | 'lg'; 
  showAvatar?: boolean;
  className?: string;
}> = ({ 
  size = 'md', 
  showAvatar = true,
  className 
}) => {
  const sizeClasses = {
    sm: 'w-48 h-20 p-3',
    md: 'w-60 h-28 p-4',
    lg: 'w-72 h-32 p-5'
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-lg border bg-card shadow-sm",
      sizeClasses[size],
      className
    )} role="presentation" aria-label="Loading role information">
      <ShimmerOverlay />
      
      {/* Role title */}
      <Skeleton className="h-4 w-3/4 mb-2" />
      
      {/* Role description lines */}
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      
      {/* Bottom section with avatar and actions */}
      <div className="flex items-center justify-between mt-3">
        {showAvatar && (
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        )}
        <div className="flex gap-1">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 w-6 rounded" />
        </div>
      </div>
    </div>
  );
};

// Organization chart hierarchy skeleton
const OrgChartHierarchySkeleton: React.FC<{ rolesCount: number }> = ({ rolesCount }) => (
  <div className="flex flex-col items-center space-y-8 p-6" aria-label="Loading organization chart">
    {/* Root level - CEO/President */}
    <div className="flex justify-center">
      <EnhancedRoleCardSkeleton size="lg" />
    </div>

    {/* Connecting lines */}
    <div className="w-px h-6 bg-border" />

    {/* Second level - Department heads */}
    <div className="flex justify-center gap-8 flex-wrap">
      {Array.from({ length: Math.min(rolesCount - 1, 4) }).map((_, index) => (
        <div key={`level-2-${index}`} className="flex flex-col items-center">
          <EnhancedRoleCardSkeleton size="md" />
          
          {/* Connecting line down if there are more levels */}
          {rolesCount > 5 && (
            <>
              <div className="w-px h-6 bg-border mt-4" />
              <div className="flex gap-4 mt-4">
                <EnhancedRoleCardSkeleton size="sm" />
                {index < 2 && <EnhancedRoleCardSkeleton size="sm" />}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  </div>
);

// Org chart header skeleton
const OrgChartHeaderSkeleton: React.FC = () => (
  <div className="flex items-center justify-between p-4 border-b">
    <div className="flex items-center gap-3">
      <Skeleton className="h-8 w-8 rounded" />
      <div className="space-y-1">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Skeleton className="h-6 w-6 rounded-full" />
      <Skeleton className="h-8 w-20 rounded" />
    </div>
  </div>
);

// Org chart controls skeleton
const OrgChartControlsSkeleton: React.FC = () => (
  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-b bg-muted/30">
    <div className="flex items-center gap-3 w-full sm:w-auto">
      <Skeleton className="h-9 w-64" /> {/* Search bar */}
      <Skeleton className="h-9 w-9 rounded" /> {/* Search icon */}
    </div>
    
    <div className="flex items-center gap-2">
      <Skeleton className="h-8 w-8 rounded" /> {/* Zoom out */}
      <Skeleton className="h-8 w-16" /> {/* Zoom level */}
      <Skeleton className="h-8 w-8 rounded" /> {/* Zoom in */}
      <div className="w-px h-6 bg-border mx-2" />
      <Skeleton className="h-8 w-24 rounded" /> {/* Collapse/Expand */}
      <Skeleton className="h-8 w-20 rounded" /> {/* Add role */}
    </div>
  </div>
);

// Main org chart skeleton component
export const OrgChartSkeleton: React.FC<OrgChartSkeletonProps> = ({ 
  rolesCount = 6, 
  variant = 'loading',
  className 
}) => {
  if (variant === 'empty') {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
        <div className="w-16 h-16 rounded-full bg-muted mb-4 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-muted-foreground/20" />
        </div>
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
    );
  }

  if (variant === 'error') {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
        <div className="w-16 h-16 rounded-full bg-destructive/10 mb-4 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-destructive/20" />
        </div>
        <Skeleton className="h-6 w-56 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>
    );
  }

  return (
    <div className={cn("h-full flex flex-col", className)} role="presentation" aria-live="polite">
      <OrgChartHeaderSkeleton />
      <OrgChartControlsSkeleton />
      
      <div className="flex-1 overflow-auto">
        <div className="min-h-full flex items-center justify-center">
          <OrgChartHierarchySkeleton rolesCount={rolesCount} />
        </div>
      </div>
    </div>
  );
};

// Standalone role card skeleton for reuse
export const RoleCardSkeleton: React.FC<{ 
  size?: 'sm' | 'md' | 'lg';
  showAvatar?: boolean;
  className?: string;
}> = ({ size = 'md', showAvatar = true, className }) => (
  <EnhancedRoleCardSkeleton size={size} showAvatar={showAvatar} className={className} />
);

// Org chart builder skeleton for content area
export const OrgChartBuilderSkeleton: React.FC<{ rolesCount?: number }> = ({ rolesCount = 6 }) => (
  <div className="h-full flex flex-col">
    <OrgChartControlsSkeleton />
    <div className="flex-1 overflow-auto">
      <div className="min-h-full flex items-center justify-center">
        <OrgChartHierarchySkeleton rolesCount={rolesCount} />
      </div>
    </div>
  </div>
);
