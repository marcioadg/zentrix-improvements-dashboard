
import React, { memo } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Target } from 'lucide-react';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { PermissionAwareMetricCell } from '@/components/dashboard/PermissionAwareMetricCell';
import { ClickableUserAvatar } from '@/components/ClickableUserAvatar';
import { useMetricsPermissions } from '@/hooks/useMetricsPermissions';
import { useMetricsUpdater } from '@/hooks/useMetricsUpdater';
import { logger } from '@/utils/logger';

interface OptimizedMetricsTableRowProps {
  metric: WeeklyMetricWithOwner;
  weekStarts: string[];
  getOwnerInitials: (fullName: string) => string;
  checkTargetCondition: (value: number, targetValue: number, logic: string) => boolean;
  onUpdateMetric: (metricId: string, weekStart: string, value: number) => void;
  highlightedWeek: string | null;
  formatValue: (value: number | null, unit: string) => string;
  getValueColor: (value: number | null, metric: any) => string;
}

export const OptimizedMetricsTableRow: React.FC<OptimizedMetricsTableRowProps> = memo(({
  metric,
  weekStarts,
  getOwnerInitials,
  checkTargetCondition,
  onUpdateMetric,
  highlightedWeek,
  formatValue,
  getValueColor,
}) => {
  const { canEditMetric } = useMetricsPermissions(metric.team_id);
  const { updateMetricOwner } = useMetricsUpdater();

  const canEdit = canEditMetric(metric);

  const handleOwnerChange = async (newOwnerId: string | null): Promise<boolean> => {
    if (!canEdit) return false;
    
    try {
      await updateMetricOwner(metric.id, newOwnerId);
      return true;
    } catch (error) {
      logger.error('Error updating metric owner:', error);
      return false;
    }
  };

  return (
    <TableRow>
      <TableCell className="sticky left-0 bg-background z-10 border-r">
        <span className="font-medium">{metric.metric_name}</span>
      </TableCell>
      
      <TableCell className="sticky left-48 bg-background z-10 border-r">
        <div className="flex items-center gap-2">
          <ClickableUserAvatar
            userId={metric.owner_id}
            fullName={metric.owner}
            avatarUrl={metric.owner_avatar_url}
            size="md"
            onUserChange={handleOwnerChange}
            disabled={!canEdit}
            className="bg-primary/10 text-primary"
          />
          <span className="text-sm text-muted-foreground truncate">
            {metric.owner || 'Unknown'}
          </span>
        </div>
      </TableCell>
      
      <TableCell className="sticky left-88 bg-background z-10 border-r">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Target className="h-3 w-3" />
          {metric.target_value !== null && metric.target_value !== undefined ? formatValue(metric.target_value, metric.unit) : 'No target'}
        </div>
      </TableCell>
      
      {weekStarts.map((weekStart) => {
        const value = metric.weeklyValues[weekStart];
        
        return (
          <TableCell key={weekStart}>
            <PermissionAwareMetricCell
              metric={metric as any}
              weekStart={weekStart}
              value={value}
              onUpdate={onUpdateMetric}
              formatValue={formatValue}
              getValueColor={getValueColor}
              isHighlighted={highlightedWeek === weekStart}
            />
          </TableCell>
        );
      })}
    </TableRow>
  );
});

OptimizedMetricsTableRow.displayName = 'OptimizedMetricsTableRow';
