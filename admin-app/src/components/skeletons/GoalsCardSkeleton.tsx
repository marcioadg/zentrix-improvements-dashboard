import React from 'react';

/**
 * Enhanced skeleton with shimmer effect for goals list
 * Provides better perceived loading performance
 */
export const GoalsCardSkeleton = () => {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div 
          key={index} 
          className="border border-border rounded-[6px] p-4 bg-card"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex items-start gap-3">
            {/* Icon with shimmer */}
            <div className="h-5 w-5 skeleton-shimmer rounded flex-shrink-0 mt-0.5" />
            
            <div className="flex-1 min-w-0 space-y-3">
              {/* Title with shimmer - varied widths for realism */}
              <div className={`h-4 skeleton-shimmer rounded ${
                index === 0 ? 'w-3/4' : 
                index === 1 ? 'w-2/3' : 
                index === 2 ? 'w-4/5' : 'w-1/2'
              }`} />
              
              {/* Status and Percentage with shimmer */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-5 skeleton-shimmer rounded-full w-16" />
                  <div className="h-4 skeleton-shimmer rounded w-8" />
                </div>
                <div className="h-3 skeleton-shimmer rounded w-20" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};