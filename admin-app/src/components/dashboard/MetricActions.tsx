
import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSimpleIssues } from '@/hooks/useSimpleIssues';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { logger } from '@/utils/logger';

interface MetricActionsProps {
  metric: WeeklyMetricWithOwner;
  currentValue: number | null;
  onCreateIssue?: (metric: any) => void;
  valueColor?: string;
  selectedTeam?: string;
}

export const MetricActions: React.FC<MetricActionsProps> = ({
  metric,
  currentValue,
  onCreateIssue,
  valueColor = 'text-muted-foreground',
  selectedTeam,
}) => {
  const { toast } = useToast();
  const { addIssue } = useSimpleIssues(selectedTeam, undefined, undefined, undefined, { silent: true });

  const handleCreateIssue = async () => {
    const issueTitle = `Metric: ${metric.metric_name} needs attention`;
    
    // Format the current value with proper unit
    let formattedValue = currentValue?.toString() || '0';
    if (metric.unit === 'currency') {
      formattedValue = `$${currentValue || 0}`;
    } else if (metric.unit === 'percentage') {
      formattedValue = `${currentValue || 0}%`;
    }
    
    const issueDescription = `Current value: ${formattedValue}
Target: ${metric.target_value || 'Not set'}
Owner: ${metric.owner}

This metric requires immediate attention to get back on track.`;

    // Use owner_id if available, otherwise fallback to current user (addIssue will handle this)
    const ownerId = metric.owner_id && metric.owner_id !== 'null' ? metric.owner_id : undefined;
    
    logger.debug('Creating issue for metric:', metric.metric_name, 'with owner_id:', ownerId);
    
    const success = await addIssue(issueTitle, issueDescription, 'short_term', ownerId);
    
    if (success) {
      toast({
        title: "Issue Created",
        description: `Issue created for ${metric.metric_name}`,
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to create issue. Please try again.",
        variant: "destructive"
      });
    }

    if (onCreateIssue) {
      onCreateIssue({
        title: issueTitle,
        description: issueDescription,
        metricId: metric.id,
      });
    }
  };

  // Check for red in multiple possible formats to handle both getValueColor functions
  const isMetricFailing = () => {
    // Handle both formats:
    // - useMetricsFormatting: 'text-destructive'
    // - useMetricsSectionState: 'text-black bg-destructive/10'
    const hasTextRed = valueColor?.includes('text-red');
    const hasBgRed = valueColor?.includes('bg-red');
    
    return hasTextRed || hasBgRed;
  };

  const getIconColor = () => {
    // Simply rely on the valueColor prop which is already correctly calculated
    // by MetricRow.tsx after filtering out future weeks
    const failing = isMetricFailing();
    
    if (failing) {
      return 'text-destructive hover:text-destructive/80 !text-destructive';
    }
    
    return 'text-muted-foreground hover:text-foreground';
  };

  return (
    <div className="flex items-center justify-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCreateIssue}
            aria-label="Create issue for this metric"
            className={`h-7 w-7 p-0 hover:bg-destructive/10 ${getIconColor()}`}
          >
            <AlertCircle className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipPrimitive.Portal>
          <TooltipContent side="bottom" align="center" className="z-[100] max-w-xs" collisionPadding={{ top: 80, bottom: 20 }}>
            <p className="text-xs">Click to create an issue in the Issues tab</p>
          </TooltipContent>
        </TooltipPrimitive.Portal>
      </Tooltip>
    </div>
  );
};
