import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface StrategyPageSkeletonProps {
  variant?: 'default' | 'compact' | 'mobile';
}

export const StrategyPageSkeleton: React.FC<StrategyPageSkeletonProps> = ({
  variant = 'default'
}) => {
  const isCompact = variant === 'compact';
  const isMobile = variant === 'mobile';

  return (
    <div 
      className="h-full flex flex-col animate-fade-in"
      role="status"
      aria-label="Loading strategy page content"
    >
      {/* Header Section */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex-1">
          <Skeleton className="h-8 w-64 mb-2 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
          <Skeleton className="h-4 w-96 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-32 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
            <Skeleton className="h-9 w-24 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <Skeleton className="h-6 w-20 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
            <Skeleton className="h-4 w-16 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6">
        <Skeleton className="h-10 w-full max-w-lg bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer rounded-lg" />
      </div>

      {/* Content Area */}
      <div className="flex-1 space-y-6">
        {variant === 'mobile' ? (
          <MobileStrategyContentSkeleton />
        ) : isCompact ? (
          <CompactStrategyContentSkeleton />
        ) : (
          <DefaultStrategyContentSkeleton />
        )}
      </div>
    </div>
  );
};

const DefaultStrategyContentSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {Array.from({ length: 6 }).map((_, index) => (
      <StrategyCardSkeleton key={index} />
    ))}
  </div>
);

const CompactStrategyContentSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 gap-4">
    {Array.from({ length: 4 }).map((_, index) => (
      <StrategyCardSkeleton key={index} compact />
    ))}
  </div>
);

const MobileStrategyContentSkeleton: React.FC = () => (
  <div className="space-y-4">
    {Array.from({ length: 3 }).map((_, index) => (
      <StrategyCardSkeleton key={index} mobile />
    ))}
  </div>
);

interface StrategyCardSkeletonProps {
  compact?: boolean;
  mobile?: boolean;
}

const StrategyCardSkeleton: React.FC<StrategyCardSkeletonProps> = ({
  compact = false,
  mobile = false
}) => (
  <div className={`
    bg-card border rounded-lg p-6 space-y-4
    ${mobile ? 'p-4' : ''}
    ${compact ? 'p-4' : ''}
  `}>
    {/* Card Header */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
        <Skeleton className={`
          bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer
          ${mobile ? 'h-5 w-32' : 'h-6 w-40'}
        `} />
      </div>
      <Skeleton className="h-6 w-6 rounded bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
    </div>

    {/* Card Description */}
    <Skeleton className={`
      bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer
      ${mobile ? 'h-3 w-full' : 'h-4 w-full'}
    `} />
    
    {/* Content Area */}
    <div className={`space-y-3 ${compact ? 'space-y-2' : ''}`}>
      {/* Text Content */}
      <div className="space-y-2">
        <Skeleton className={`
          bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer
          ${mobile ? 'h-3 w-full' : 'h-4 w-full'}
        `} />
        <Skeleton className={`
          bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer
          ${mobile ? 'h-3 w-4/5' : 'h-4 w-4/5'}
        `} />
        {!compact && (
          <Skeleton className={`
            bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer
            ${mobile ? 'h-3 w-3/4' : 'h-4 w-3/4'}
          `} />
        )}
      </div>

      {/* Action Items or List Items */}
      {!mobile && (
        <div className="space-y-2">
          {Array.from({ length: compact ? 2 : 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
              <Skeleton className="h-3 flex-1 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Card Footer */}
    <div className="flex items-center justify-between pt-2 border-t border-border/50">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
        <Skeleton className="h-4 w-4 rounded-full bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
      </div>
      <Skeleton className={`
        bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer
        ${mobile ? 'h-7 w-16' : 'h-8 w-20'}
      `} />
    </div>
  </div>
);

// Specialized skeletons for different strategy sections
export const StrategyTabContentSkeleton: React.FC = () => (
  <div className="space-y-6" role="status" aria-label="Loading strategy content">
    <DefaultStrategyContentSkeleton />
  </div>
);

export const ExecutionTabContentSkeleton: React.FC = () => (
  <div className="space-y-6" role="status" aria-label="Loading execution content">
    {/* Execution Timeline */}
    <div className="bg-card border rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-6 w-6 rounded bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
        <Skeleton className="h-6 w-48 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
      </div>
      
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-start gap-4">
            <Skeleton className="h-8 w-8 rounded-full bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
              <Skeleton className="h-3 w-1/2 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Quarterly Priorities */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-card border rounded-lg p-4">
          <Skeleton className="h-5 w-24 mb-3 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-full bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
            <Skeleton className="h-3 w-4/5 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const SwotTabContentSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6" role="status" aria-label="Loading SWOT analysis">
    {['Strengths', 'Weaknesses', 'Opportunities', 'Threats'].map((section) => (
      <div key={section} className="bg-card border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-6 w-6 rounded bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
          <Skeleton className="h-6 w-24 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
        </div>
        
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-start gap-2">
              <Skeleton className="h-3 w-3 rounded-full mt-1 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
              <Skeleton className="h-3 flex-1 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export default StrategyPageSkeleton;