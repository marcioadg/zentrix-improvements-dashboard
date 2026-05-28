import React from 'react';
import { Loader2, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  isPulling: boolean;
  isRefreshing: boolean;
  progress: number;
  pullDistance: number;
}

export const PullToRefreshIndicator: React.FC<PullToRefreshIndicatorProps> = ({
  isPulling,
  isRefreshing,
  progress,
  pullDistance,
}) => {
  if (!isPulling && !isRefreshing) return null;

  return (
    <div
      className="absolute top-0 left-0 right-0 flex items-center justify-center z-10 transition-all duration-200"
      style={{
        transform: `translateY(${Math.min(pullDistance, 80)}px)`,
      }}
    >
      <div className={cn(
        "bg-background/95 backdrop-blur-sm rounded-full p-3 shadow-lg border",
        "transition-all duration-200",
        isRefreshing && "scale-110"
      )}>
        {isRefreshing ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <ArrowDown 
            className={cn(
              "h-5 w-5 text-muted-foreground transition-all duration-200",
              progress >= 1 && "text-primary rotate-180"
            )}
            style={{
              transform: `rotate(${progress * 180}deg)`,
            }}
          />
        )}
      </div>
    </div>
  );
};
