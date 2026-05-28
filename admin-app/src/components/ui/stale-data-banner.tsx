import React from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StaleDataBannerProps {
  lastUpdated: Date | number;
  threshold?: number;
  message?: string;
  action?: string;
  onRefresh?: () => void;
  className?: string;
}

export const StaleDataBanner: React.FC<StaleDataBannerProps> = ({
  lastUpdated,
  threshold = 5 * 60 * 1000, // 5 minutes
  message = "This data might be outdated.",
  action = "Refresh Now",
  onRefresh,
  className
}) => {
  const lastUpdateTime = typeof lastUpdated === 'number' ? lastUpdated : lastUpdated.getTime();
  const timeSinceUpdate = Date.now() - lastUpdateTime;
  const isStale = timeSinceUpdate > threshold;

  if (!isStale) return null;

  const minutesAgo = Math.floor(timeSinceUpdate / 60000);
  const timeText = minutesAgo < 60 
    ? `${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago`
    : `${Math.floor(minutesAgo / 60)} hour${Math.floor(minutesAgo / 60) !== 1 ? 's' : ''} ago`;

  return (
    <div className={cn(
      'flex items-center justify-between gap-4 p-3 rounded-lg',
      'bg-accent/50 border border-accent',
      className
    )}>
      <div className="flex items-center gap-2 flex-1">
        <AlertCircle className="h-4 w-4 text-accent-foreground flex-shrink-0" />
        <div className="text-sm">
          <span className="text-foreground font-medium">{message}</span>
          <span className="text-muted-foreground ml-1">Last updated {timeText}.</span>
        </div>
      </div>
      {onRefresh && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="gap-2 flex-shrink-0"
        >
          <RefreshCw className="h-3 w-3" />
          {action}
        </Button>
      )}
    </div>
  );
};
