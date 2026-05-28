
import React, { memo } from 'react';
import { getTargetLogicSymbol } from '@/utils/metricUtils';
import { BulkTargetEditModal } from '@/components/metrics/BulkTargetEditModal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

interface MetricTargetCellProps {
  metric: any;
  formatValue: (value: number | null, unit: string) => string;
  weekStarts?: string[];
  selectedTeam?: string;
  managementMode?: boolean;
  formatWeekDate?: (weekStart: string) => string;
}

const MetricTargetCellComponent: React.FC<MetricTargetCellProps> = ({
  metric,
  formatValue,
  weekStarts = [],
  selectedTeam,
  managementMode = false,
  formatWeekDate,
}) => {
  const [bulkEditOpen, setBulkEditOpen] = React.useState(false);

  const formatTargetValue = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return formatValue(value, metric.unit);
  };

  // Use adjusted target for period views (4-week, 13-week) or fall back to weekly target
  const displayTarget = (metric as any).adjusted_target_value ?? metric.target_value;
  const displayLogic = metric.target_logic ?? 'greater_than_or_equal';

  // Only check weeklyCustomTargets - this is the source of truth for custom targets
  const hasCustomTargets = metric.weeklyCustomTargets && 
    Object.keys(metric.weeklyCustomTargets).length > 0;

  const handleClick = () => {
    if (!managementMode && weekStarts.length > 0) {
      setBulkEditOpen(true);
    }
  };

  return (
    <>
      <div className="h-8 flex items-center justify-center">
        {(displayTarget !== null && displayTarget !== undefined) ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleClick}
                disabled={managementMode || weekStarts.length === 0}
                className={`text-sm font-medium transition-colors rounded px-1 ${
                  managementMode || weekStarts.length === 0
                    ? 'text-muted-foreground cursor-default'
                    : 'text-muted-foreground hover:text-foreground cursor-pointer hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:bg-muted/50'
                }`}
              >
                {getTargetLogicSymbol(displayLogic)}{formatTargetValue(displayTarget)}
              </button>
            </TooltipTrigger>
            <TooltipPrimitive.Portal>
              <TooltipContent side="bottom" align="center" className="z-[100] max-w-xs" collisionPadding={{ top: 80, bottom: 20 }}>
                {managementMode 
                  ? 'Target value'
                  : hasCustomTargets
                  ? 'Has custom weekly targets - Click to edit'
                  : 'Click to set custom targets for specific weeks'
                }
              </TooltipContent>
            </TooltipPrimitive.Portal>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleClick}
                disabled={managementMode || weekStarts.length === 0}
                className={`text-sm transition-colors rounded px-1 ${
                  managementMode || weekStarts.length === 0
                    ? 'text-muted-foreground cursor-default'
                    : 'text-muted-foreground hover:text-foreground cursor-pointer hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:bg-muted/50'
                }`}
              >
                -
              </button>
            </TooltipTrigger>
            <TooltipPrimitive.Portal>
              <TooltipContent side="bottom" align="center" className="z-[100] max-w-xs" collisionPadding={{ top: 80, bottom: 20 }}>
                {managementMode ? 'No target set' : 'Click to set custom targets'}
              </TooltipContent>
            </TooltipPrimitive.Portal>
          </Tooltip>
        )}
      </div>

      {!managementMode && formatWeekDate && (
        <BulkTargetEditModal
          open={bulkEditOpen}
          onOpenChange={setBulkEditOpen}
          metricId={metric.id}
          teamId={selectedTeam || metric.team_id}
          metricName={metric.metric_name}
          weekStarts={weekStarts}
          defaultTarget={metric.target_value}
          defaultLogic={metric.target_logic}
          formatWeekDate={formatWeekDate}
          unit={metric.unit}
          description={metric.description}
          displayOrder={metric.display_order}
          isFormula={metric.is_formula}
          formulaComponents={metric.formula_components}
          aggregationType={metric.aggregation_type}
        />
      )}
    </>
  );
};

export const MetricTargetCell = memo(MetricTargetCellComponent, (prevProps, nextProps) => {
  return (
    prevProps.metric.id === nextProps.metric.id &&
    prevProps.metric.target_value === nextProps.metric.target_value &&
    prevProps.metric.target_logic === nextProps.metric.target_logic &&
    prevProps.metric.adjusted_target_value === nextProps.metric.adjusted_target_value &&
    prevProps.weekStarts === nextProps.weekStarts &&
    prevProps.managementMode === nextProps.managementMode &&
    prevProps.selectedTeam === nextProps.selectedTeam
  );
});
