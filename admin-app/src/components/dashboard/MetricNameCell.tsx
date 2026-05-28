import React, { memo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Zap, AlertTriangle, ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MetricNameCellProps {
  metric: any;
  onMetricConfiguration: (metric: any) => void;
  isArchived?: boolean;
  onUnarchive?: () => void;
}

const MetricNameCellComponent: React.FC<MetricNameCellProps> = ({
  metric,
  onMetricConfiguration,
  isArchived = false,
  onUnarchive,
}) => {
  const hasBrokenFormula = metric.is_formula && metric.formula_error_type === 'METRIC_NOT_FOUND';

  return (
    <div className="flex items-center gap-2 w-full">
      {isArchived && onUnarchive && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onUnarchive();
              }}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground flex-shrink-0"
              aria-label="Unarchive metric"
            >
              <ArchiveRestore className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipPrimitive.Portal>
            <TooltipContent side="top" align="center" className="z-[100]">
              <p className="text-xs">Unarchive metric</p>
            </TooltipContent>
          </TooltipPrimitive.Portal>
        </Tooltip>
      )}
      <button 
        type="button"
        className={`text-left flex items-center gap-2 flex-1 transition-colors duration-150 rounded-[5px] px-2 py-1 ${
          isArchived
            ? 'cursor-default opacity-60'
            : 'cursor-pointer group hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1'
        }`}
        onClick={() => onMetricConfiguration(metric)}
        disabled={isArchived}
      >
        <span className="text-[13px] font-semibold text-foreground flex-1 group-hover:text-primary">
          {metric.metric_name}
        </span>
        {metric.is_formula && !hasBrokenFormula && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Zap className="h-3.5 w-3.5 text-warning ml-1 flex-shrink-0" />
            </TooltipTrigger>
            <TooltipPrimitive.Portal>
              <TooltipContent side="top" align="center" className="z-[100]" collisionPadding={{ top: 80, bottom: 20 }}>
                <p className="text-xs">Formula-calculated metric</p>
              </TooltipContent>
            </TooltipPrimitive.Portal>
          </Tooltip>
        )}
        {hasBrokenFormula && (
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground ml-1 flex-shrink-0" />
            </TooltipTrigger>
            <TooltipPrimitive.Portal>
              <TooltipContent side="top" align="center" className="z-[100] max-w-[250px]" collisionPadding={{ top: 80, bottom: 20 }}>
                <p className="text-xs font-medium text-destructive">Broken Formula</p>
                <p className="text-xs mt-1">{metric.formula_error || 'A metric used in this formula was deleted.'}</p>
                <p className="text-xs mt-1 text-muted-foreground">Click to edit the formula and fix.</p>
              </TooltipContent>
            </TooltipPrimitive.Portal>
          </Tooltip>
        )}
      </button>
    </div>
  );
};

export const MetricNameCell = memo(MetricNameCellComponent, (prevProps, nextProps) => {
  return (
    prevProps.metric.id === nextProps.metric.id &&
    prevProps.metric.metric_name === nextProps.metric.metric_name &&
    prevProps.metric.is_formula === nextProps.metric.is_formula &&
    prevProps.metric.formula_error_type === nextProps.metric.formula_error_type &&
    prevProps.isArchived === nextProps.isArchived
  );
});
