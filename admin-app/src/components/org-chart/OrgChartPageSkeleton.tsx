import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface OrgChartPageSkeletonProps {
  rolesCount?: number;
  variant?: 'desktop' | 'mobile';
  className?: string;
}

// Shimmer overlay component for enhanced loading effect
const ShimmerOverlay: React.FC<{ className?: string }> = ({ className }) => (
  <div 
    className={cn(
      "absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-background/60 to-transparent",
      "animate-[shimmer_2s_infinite]",
      className
    )} 
    aria-hidden="true"
  />
);

// Page header skeleton
const PageHeaderSkeleton: React.FC = () => (
  <div className="p-4 sm:p-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 sm:h-10 w-64 sm:w-80" />
        <Skeleton className="h-4 w-80 sm:w-96" />
      </div>
      <div className="flex items-center gap-3 self-start sm:self-auto">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  </div>
);

// Connection test skeleton for network errors
const ConnectionTestSkeleton: React.FC = () => (
  <div className="mb-6 p-4 rounded-lg border border-destructive/20 bg-destructive/5">
    <div className="flex items-center gap-3">
      <Skeleton className="h-6 w-6 rounded-full" />
      <div className="space-y-1 flex-1">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-64" />
      </div>
    </div>
  </div>
);

// Org chart header with connection status
const OrgChartHeaderSkeleton: React.FC = () => (
  <div className="flex items-center justify-between p-4 bg-muted/30">
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

// Org chart controls bar skeleton
const OrgChartControlsSkeleton: React.FC<{ isMobile?: boolean }> = ({ isMobile = false }) => (
  <div className={cn(
    "flex items-center justify-between gap-4 p-4 bg-background/50",
    isMobile ? "flex-col space-y-3" : "flex-row"
  )}>
    <div className={cn("flex items-center gap-3", isMobile ? "w-full" : "flex-1 max-w-md")}>
      <div className="relative flex-1">
        <ShimmerOverlay className="rounded" />
        <Skeleton className="h-9 w-full" />
      </div>
      <Skeleton className="h-9 w-9 rounded" />
    </div>
    
    <div className="flex items-center gap-2">
      <Skeleton className="h-8 w-8 rounded" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-8 w-8 rounded" />
      <div className="w-px h-6 bg-border mx-2" />
      <Skeleton className="h-8 w-24 rounded" />
      <Skeleton className="h-8 w-20 rounded" />
    </div>
  </div>
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
      "relative overflow-hidden rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow",
      sizeClasses[size],
      className
    )} 
    role="presentation" 
    aria-label="Loading role information"
    >
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

// Hierarchical org chart skeleton
const OrgChartHierarchySkeleton: React.FC<{ 
  rolesCount: number; 
  isMobile?: boolean;
}> = ({ rolesCount, isMobile = false }) => {
  if (isMobile) {
    return (
      <div className="flex flex-col space-y-6 p-4" aria-label="Loading organization chart">
        {/* Mobile: Vertical list layout */}
        <EnhancedRoleCardSkeleton size="md" className="mx-auto" />
        
        <div className="space-y-4">
          {Array.from({ length: Math.min(rolesCount - 1, 5) }).map((_, index) => (
            <div key={`mobile-role-${index}`} className="ml-4 border-l border-border pl-4">
              <EnhancedRoleCardSkeleton size="sm" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-8 p-6 min-h-[600px]" aria-label="Loading organization chart">
      {/* Root level - CEO/President */}
      <div className="flex justify-center">
        <EnhancedRoleCardSkeleton size="lg" />
      </div>

      {/* Connecting lines */}
      <div className="flex flex-col items-center">
        <div className="w-px h-6 bg-border" />
        <div className="w-20 h-px bg-border" />
        <div className="w-px h-6 bg-border" />
      </div>

      {/* Second level - Department heads */}
      <div className="flex justify-center gap-8 flex-wrap">
        {Array.from({ length: Math.min(rolesCount - 1, 4) }).map((_, index) => (
          <div key={`level-2-${index}`} className="flex flex-col items-center">
            <EnhancedRoleCardSkeleton size="md" />
            
            {/* Connecting line down if there are more levels */}
            {rolesCount > 5 && index < 3 && (
              <>
                <div className="w-px h-6 bg-border mt-4" />
                <div className="w-16 h-px bg-border" />
                <div className="w-px h-6 bg-border" />
                <div className="flex gap-4 mt-4">
                  <EnhancedRoleCardSkeleton size="sm" />
                  {index < 2 && <EnhancedRoleCardSkeleton size="sm" />}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Third level if needed */}
      {rolesCount > 8 && (
        <>
          <div className="w-full flex justify-center">
            <div className="w-32 h-px bg-border" />
          </div>
          <div className="flex justify-center gap-6 flex-wrap">
            {Array.from({ length: Math.min(rolesCount - 8, 6) }).map((_, index) => (
              <EnhancedRoleCardSkeleton key={`level-3-${index}`} size="sm" />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Main org chart page skeleton
export const OrgChartPageSkeleton: React.FC<OrgChartPageSkeletonProps> = ({ 
  rolesCount = 6, 
  variant = 'desktop',
  className 
}) => {
  const isMobile = variant === 'mobile';

  return (
    <div className={cn("h-full flex flex-col", className)} role="presentation" aria-live="polite">
      <PageHeaderSkeleton />
      
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <Card className="h-full">
          <CardContent className="h-full p-0">
            <div className="h-full flex flex-col">
              <OrgChartHeaderSkeleton />
              <OrgChartControlsSkeleton isMobile={isMobile} />
              
              <div className="flex-1 overflow-auto">
                <div className="min-h-full flex items-center justify-center">
                  <OrgChartHierarchySkeleton 
                    rolesCount={rolesCount} 
                    isMobile={isMobile}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Standalone role card for reuse
export const RoleCardSkeleton: React.FC<{ 
  size?: 'sm' | 'md' | 'lg';
  showAvatar?: boolean;
  className?: string;
}> = ({ size = 'md', showAvatar = true, className }) => (
  <EnhancedRoleCardSkeleton size={size} showAvatar={showAvatar} className={className} />
);

// Content area skeleton for the org chart builder
export const OrgChartContentSkeleton: React.FC<{ 
  rolesCount?: number;
  variant?: 'desktop' | 'mobile';
}> = ({ rolesCount = 6, variant = 'desktop' }) => (
  <div className="h-full flex flex-col">
    <OrgChartControlsSkeleton isMobile={variant === 'mobile'} />
    <div className="flex-1 overflow-auto">
      <div className="min-h-full flex items-center justify-center">
        <OrgChartHierarchySkeleton 
          rolesCount={rolesCount} 
          isMobile={variant === 'mobile'}
        />
      </div>
    </div>
  </div>
);