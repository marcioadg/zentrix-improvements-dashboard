import React from 'react';

export const MetricsCardSkeleton = () => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
        <div className="h-6 bg-muted/60 rounded-[4px] w-20 skeleton-shimmer"></div>
        <div className="h-4 bg-muted/60 rounded-[4px] w-32 skeleton-shimmer"></div>
        </div>
        <div className="h-6 bg-muted/60 rounded-[4px] w-16 skeleton-shimmer"></div>
      </div>
      
      <div className="flex-1 min-h-0">
        <div className="space-y-1 pr-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between py-3 px-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                <div className={`h-4 bg-muted/60 rounded-[4px] skeleton-shimmer ${
                  index === 0 ? 'w-28' : 
                  index === 1 ? 'w-32' : 
                  index === 2 ? 'w-24' : 
                  index === 3 ? 'w-36' : 
                  index === 4 ? 'w-20' : 'w-30'
                }`}></div>
                  
                  <div className="flex items-center gap-4">
                    {/* Owner Avatar */}
                  <div className="w-6 h-6 bg-muted/60 rounded-full skeleton-shimmer"></div>
                  
                  {/* Target */}
                  <div className="h-3 bg-muted/60 rounded-[4px] w-12 skeleton-shimmer"></div>
                  
                  {/* Value */}
                  <div className="h-8 bg-muted/60 rounded-[4px] w-20 skeleton-shimmer"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};