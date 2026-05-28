
import React, { useState, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';
import { PeriodBreakdownDialog } from '@/components/dashboard/dialogs/PeriodBreakdownDialog';
import { MetricCustomTargetButton } from '@/components/metrics/MetricCustomTargetButton';
import { MetricValueNoteButton } from '@/components/metrics/MetricValueNoteButton';
import { useToast } from '@/hooks/use-toast';

interface WeeklyMetricCellProps {
  metric: any;
  weekStart: string;
  editingCell: string | null;
  editValue?: string;
  onCellEdit: (metricId: string, weekStart: string, currentValue: number | null) => void;
  onCellSave: (metricId: string, weekStart: string, value?: number | null) => void;
  onCellCancel: () => void;
  onEditValueChange?: (value: string) => void;
  formatValue: (value: number, unit: string) => string;
  getValueColor: (value: number, metric: any, weekStart?: string) => string;
  periodMapping?: { [periodLabel: string]: string[] };
  formatWeekDate?: (weekStart: string) => string;
  updateMetricDirect?: (metricId: string, weekStart: string, newValue: number | null) => Promise<void>;
  onOptimisticCellUpdate?: (metricId: string, weekStart: string, patch: { custom_target_value?: number | null; target_note?: string | null }) => void;
  canEdit?: boolean;
}

const WeeklyMetricCellComponent: React.FC<WeeklyMetricCellProps> = ({
  metric,
  weekStart,
  editingCell,
  onCellEdit,
  onCellSave,
  onCellCancel,
  formatValue,
  getValueColor,
  periodMapping,
  formatWeekDate,
  updateMetricDirect,
  onOptimisticCellUpdate,
  canEdit = true,
}) => {
  const { toast } = useToast();
  const [showBreakdownDialog, setShowBreakdownDialog] = useState(false);
  const [localEditValue, setLocalEditValue] = useState('');
  const cellKey = `${metric.id}-${weekStart}`;
  const isEditing = editingCell === cellKey;
  const currentValue = metric.weeklyValues?.[weekStart] ?? null;
  
  const isAggregatedPeriod = !!periodMapping?.[weekStart] || weekStart.includes(' - ') || /^\d+W\s/.test(weekStart);

  useEffect(() => {
    if (isEditing) {
      setLocalEditValue(currentValue !== null ? currentValue.toString() : '');
    }
  }, [isEditing]);

  const handleEdit = () => {
    if (!canEdit) return;
    if (isAggregatedPeriod) return;
    onCellEdit(metric.id, weekStart, currentValue);
  };

  const handleClick = (e: React.MouseEvent) => {
    handleEdit();
  };

  const saveLocalValue = () => {
    const trimmed = localEditValue.trim();
    if (trimmed === '') {
      onCellSave(metric.id, weekStart, null);
      return;
    }
    const parsed = parseFloat(trimmed);
    if (isNaN(parsed)) {
      toast({
        title: "Invalid value",
        description: "Please enter a valid number.",
        variant: "destructive",
      });
      return;
    }
    onCellSave(metric.id, weekStart, parsed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveLocalValue();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCellCancel();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalEditValue(e.target.value);
  };

  const handleBlur = () => {
    saveLocalValue();
  };

  const handleAggregatedClick = () => {
    if (!isAggregatedPeriod) return;
    setShowBreakdownDialog(true);
  };

  const getWeeklyBreakdown = () => {
    if (!isAggregatedPeriod || !periodMapping?.[weekStart]) {
      return [];
    }

    const weekDates = periodMapping[weekStart];
    return weekDates.map(weekDate => ({
      weekStart: weekDate,
      value: metric.originalWeeklyValues?.[weekDate] ?? metric.weeklyValues?.[weekDate] ?? null
    }));
  };

  if (isEditing) {
    return (
      <div className="flex justify-center">
        <input
          type="text"
          value={localEditValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="min-w-[120px] w-full px-3 py-2 text-center border rounded-[5px] focus:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1 bg-background text-foreground border-input"
          autoFocus
          placeholder="Enter value or leave empty to delete"
        />
      </div>
    );
  }

  // FIXED: Check for null/undefined explicitly instead of falsy check
  const displayValue = currentValue !== null && currentValue !== undefined ? formatValue(currentValue, metric.unit) : '-';
  
  const valueColor = currentValue !== null && currentValue !== undefined ? getValueColor(currentValue, metric, weekStart) : '';

  const isInteractive = isAggregatedPeriod || canEdit;
  const handleKeyActivate = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isAggregatedPeriod) handleAggregatedClick();
      else handleEdit();
    }
  };

  return (
    <>
      <div
        onClick={isAggregatedPeriod ? handleAggregatedClick : handleClick}
        onKeyDown={isInteractive ? handleKeyActivate : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        role={isInteractive ? "button" : undefined}
        aria-label={isInteractive ? (isAggregatedPeriod ? `View breakdown for ${metric.metric_name}` : `Edit ${metric.metric_name}`) : undefined}
        className={cn(
          "group/cell relative px-3 py-2 rounded transition-colors min-w-[80px] text-center",
          "border-2 border-transparent",
          isAggregatedPeriod
            ? "cursor-pointer hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
            : canEdit
              ? "cursor-pointer hover:bg-muted/50 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
              : "cursor-not-allowed opacity-70",
          valueColor
        )}
        style={{
          boxShadow: 'inset 0 0 0 1px hsl(var(--border))'
        }}
      >
        {displayValue}
        {!isAggregatedPeriod && (
          <>
            <div className="absolute top-0.5 left-0.5 transition-opacity duration-200" onClick={(e) => e.stopPropagation()}>
              <MetricCustomTargetButton
                metricId={metric.id}
                teamId={metric.team_id}
                weekStart={weekStart}
                defaultTarget={metric.target_value}
                defaultLogic={metric.target_logic}
                metric={metric}
              />
            </div>
            <div className="absolute top-0.5 right-0.5 transition-opacity duration-200" onClick={(e) => e.stopPropagation()}>
              <MetricValueNoteButton
                metricId={metric.id}
                teamId={metric.team_id}
                weekStart={weekStart}
                metric={metric}
                onOptimisticCellUpdate={onOptimisticCellUpdate}
              />
            </div>
          </>
        )}
      </div>

      {isAggregatedPeriod && showBreakdownDialog && (
        <PeriodBreakdownDialog
          open={showBreakdownDialog}
          onOpenChange={setShowBreakdownDialog}
          periodLabel={weekStart}
          metricName={metric.metric_name}
          unit={metric.unit}
          weeklyBreakdown={getWeeklyBreakdown()}
          formatValue={formatValue}
          formatWeekDate={formatWeekDate || ((date) => date)}
          getValueColor={getValueColor}
          metric={metric}
          allowEditing={!!updateMetricDirect}
          onSaveWeekValue={updateMetricDirect}
          metricId={metric.id}
        />
      )}

    </>
  );
};

export const WeeklyMetricCell = memo(WeeklyMetricCellComponent, (prevProps, nextProps) => {
  const prevCellKey = `${prevProps.metric.id}-${prevProps.weekStart}`;
  const nextCellKey = `${nextProps.metric.id}-${nextProps.weekStart}`;
  const prevIsEditing = prevProps.editingCell === prevCellKey;
  const nextIsEditing = nextProps.editingCell === nextCellKey;
  
  if (prevIsEditing !== nextIsEditing) return false;
  
  return (
    prevProps.metric.id === nextProps.metric.id &&
    prevProps.weekStart === nextProps.weekStart &&
    prevProps.metric.weeklyValues?.[prevProps.weekStart] === nextProps.metric.weeklyValues?.[nextProps.weekStart] &&
    prevProps.metric.weeklyCustomTargets?.[prevProps.weekStart]?.custom_target_value === 
      nextProps.metric.weeklyCustomTargets?.[nextProps.weekStart]?.custom_target_value &&
    prevProps.metric.weeklyCustomTargets?.[prevProps.weekStart]?.target_note === 
      nextProps.metric.weeklyCustomTargets?.[nextProps.weekStart]?.target_note &&
    prevProps.canEdit === nextProps.canEdit &&
    prevProps.periodMapping === nextProps.periodMapping
  );
});
