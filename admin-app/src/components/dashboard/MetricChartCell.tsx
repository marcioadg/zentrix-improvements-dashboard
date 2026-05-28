
import React, { useState, memo } from 'react';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { MetricChartModal } from './MetricChartModal';

interface MetricChartCellProps {
  metric: any;
  weekStarts: string[];
  periodMapping?: { [periodLabel: string]: string[] };
}

const MetricChartCellComponent: React.FC<MetricChartCellProps> = ({
  metric,
  weekStarts,
  periodMapping,
}) => {
  const [showChart, setShowChart] = useState(false);

  const handleChartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowChart(true);
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleChartClick}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors duration-150"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipPrimitive.Portal>
          <TooltipContent side="top" className="z-[100]">
            <p className="text-xs">View trend chart</p>
          </TooltipContent>
        </TooltipPrimitive.Portal>
      </Tooltip>

      <MetricChartModal
        open={showChart}
        onOpenChange={setShowChart}
        metric={metric}
        weekStarts={weekStarts}
        periodMapping={periodMapping}
      />
    </>
  );
};

export const MetricChartCell = memo(MetricChartCellComponent, (prevProps, nextProps) => {
  return (
    prevProps.metric.id === nextProps.metric.id &&
    prevProps.weekStarts === nextProps.weekStarts &&
    prevProps.periodMapping === nextProps.periodMapping
  );
});
