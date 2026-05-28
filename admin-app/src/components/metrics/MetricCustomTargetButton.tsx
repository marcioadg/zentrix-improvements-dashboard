import * as React from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { useMetricCustomTarget } from "@/hooks/useMetricCustomTarget";
import { WeeklyMetricWithOwner } from "@/types/weeklyMetrics";

interface Props {
  metricId: string;
  teamId: string;
  weekStart: string;
  defaultTarget?: number | null;
  defaultLogic?: string | null;
  metric?: WeeklyMetricWithOwner;
}

export const MetricCustomTargetButton: React.FC<Props> = ({ 
  metricId, 
  teamId, 
  weekStart,
  defaultTarget,
  defaultLogic,
  metric
}) => {
  const [open, setOpen] = React.useState(false);
  
  // ✅ SIMPLIFIED: No broadcast - Postgres Changes handles sync via useMetricsRealtime
  const { customTarget, hasCustomTarget, isLoading, isSaving, save, saveTargetOnly, clear } = useMetricCustomTarget(
    metricId, 
    teamId, 
    weekStart, 
    true,
    undefined, // No broadcast callback needed
    metric
  );
  
  const [targetValue, setTargetValue] = React.useState<string>("");

  React.useEffect(() => {
    if (open) {
      if (customTarget) {
        setTargetValue(customTarget.custom_target_value?.toString() || "");
      } else {
        setTargetValue("");
      }
    }
  }, [open, customTarget]);

  const onSave = async () => {
    const numValue = targetValue ? parseFloat(targetValue) : null;
    await saveTargetOnly(numValue);
    setOpen(false);
  };

  const onClear = async () => {
    await clear();
    setOpen(false);
  };

  const displayTarget = hasCustomTarget && customTarget
    ? `${defaultLogic || '≥'} ${customTarget.custom_target_value}`
    : defaultTarget !== null && defaultTarget !== undefined
    ? `${defaultLogic || '≥'} ${defaultTarget}`
    : "No target";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-3 w-3 p-0 hover:bg-transparent rounded-none transition-all focus-visible:opacity-100 focus-visible:ring-0 ${hasCustomTarget ? 'opacity-60' : 'opacity-0 group-hover/cell:opacity-40'} transition-opacity duration-200`}
              onClick={(e) => { e.stopPropagation(); }}
              onPointerDown={(e) => { e.stopPropagation(); }}
              aria-label={hasCustomTarget ? "Edit custom target" : "Set custom target"}
              title={hasCustomTarget ? "Edit custom target" : "Set custom target"}
            >
              <Star className="h-2.5 w-2.5 text-muted-foreground" strokeWidth={1.5} />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipPrimitive.Portal>
          <TooltipContent 
            sideOffset={6} 
            className="z-[100] max-w-xs"
            collisionPadding={{ top: 80 }}
            side="bottom"
            align="center"
          >
            {hasCustomTarget ? (
              <div className="font-medium">Custom Target: {displayTarget}</div>
            ) : (
              <div>Default: {displayTarget}</div>
            )}
          </TooltipContent>
        </TooltipPrimitive.Portal>
      </Tooltip>
      <PopoverContent align="end" className="z-50 bg-popover text-popover-foreground border shadow-md p-4 w-80" onKeyDown={(e) => e.stopPropagation()}>
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium mb-2">Custom Target for This Week</div>
            <div className="text-xs text-muted-foreground mb-3">
              Default: {defaultTarget !== null && defaultTarget !== undefined ? `${defaultLogic || '≥'} ${defaultTarget}` : 'None'}
            </div>
          </div>

          <Input
            type="number"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && targetValue) {
                e.preventDefault();
                onSave();
              }
            }}
            placeholder="Target value"
            className="h-9"
            autoFocus
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {isLoading ? "Loading..." : isSaving ? "Saving..." : hasCustomTarget ? "Custom target set" : "Using default"}
            </span>
            <div className="space-x-2">
              {hasCustomTarget && (
                <Button variant="outline" size="sm" onClick={onClear} disabled={isSaving}>
                  Clear
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={onSave} disabled={isSaving || !targetValue}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
