
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { useMetricIssueCreation } from '@/hooks/useMetricIssueCreation';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';

interface MetricIssueCellProps {
  metric: WeeklyMetricWithOwner;
  onCreateIssue?: (title: string, description: string, ownerId?: string) => void;
}

export const MetricIssueCell: React.FC<MetricIssueCellProps> = ({
  metric,
  onCreateIssue
}) => {
  const { isCurrentlyOffTrack, getMostRecentWeek, createIssueFromMetric } = useMetricIssueCreation();
  
  // Check if the most recent week is off track
  const isOffTrack = isCurrentlyOffTrack(metric);
  const mostRecentWeek = getMostRecentWeek(metric);

  const handleCreateIssue = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!onCreateIssue) return;

    if (isOffTrack && mostRecentWeek) {
      // Create issue for the most recent off-track week
      createIssueFromMetric(metric, mostRecentWeek, onCreateIssue);
    } else {
      // For on-track metrics, create a general issue
      const title = `Metric: ${metric.metric_name} - General Issue`;
      const description = `Issue created for metric "${metric.metric_name}":
- Owner: ${metric.owner}
- Current Status: On track
- Target: ${metric.target_value} ${metric.unit}
- Target Logic: ${metric.target_logic || 'greater_than_or_equal'}

Please provide details about the issue or improvement needed for this metric.`;
      
      onCreateIssue(title, description, metric.owner_id);
    }
  };

  // Always show the icon if onCreateIssue is available
  if (!onCreateIssue) {
    return <div className="h-8 flex items-center justify-center"></div>;
  }

  const tooltipText = isOffTrack ? "Create issue for off-track metric" : "Create issue for metric";

  return (
    <div className="h-8 flex items-center justify-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            aria-label={tooltipText}
            className={`cursor-pointer p-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
              isOffTrack
                ? 'text-destructive hover:text-destructive/80 hover:bg-destructive/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
            onClick={handleCreateIssue}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCreateIssue(e as unknown as React.MouseEvent); } }}
          >
            <AlertTriangle className="h-4 w-4" />
          </div>
        </TooltipTrigger>
        <TooltipPrimitive.Portal>
          <TooltipContent side="top" align="center" className="z-[100]" collisionPadding={{ top: 80, bottom: 20 }}>
            <p className="text-xs">{tooltipText}</p>
          </TooltipContent>
        </TooltipPrimitive.Portal>
      </Tooltip>
    </div>
  );
};
