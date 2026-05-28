
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { MetricOwnerCell } from '@/components/dashboard/MetricOwnerCell';
import { WeeklyMetricCell } from '@/components/dashboard/table/WeeklyMetricCell';
import { MetricIssueCell } from '@/components/dashboard/table/MetricIssueCell';
import { MetricTargetCell } from '@/components/dashboard/MetricTargetCell';
import { MetricNameCell } from '@/components/dashboard/MetricNameCell';
import { MetricChartCell } from '@/components/dashboard/MetricChartCell';
import { cn } from '@/lib/utils';
import { useMetricsPermissions } from '@/hooks/useMetricsPermissions';

interface DraggableMetricRowProps {
  metric: any;
  weekStarts: string[]; // Display week starts (might be aggregated periods)
  weeklyWeekStarts?: string[]; // Original weekly ISO dates for modals
  editingCell: string | null;
  editValue: string;
  onCellEdit: (metricId: string, weekStart: string, currentValue: number | null) => void;
  onCellSave: (metricId: string, weekStart: string) => void;
  onCellCancel: () => void;
  onEditValueChange: (value: string) => void;
  onMetricConfiguration: (metric: any) => void;
  formatValue: (value: number, unit: string) => string;
  formatWeekDate: (weekStart: string) => string;
  getValueColor: (value: number, metric: any) => string;
  getOwnerInitials: (fullName: string) => string;
  highlightedWeek?: string;
  managementMode: boolean;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onDelete: () => void;
  optimisticOwnershipHandler?: (
    metricId: string,
    currentOwnerId: string | null,
    currentOwnerName: string,
    newOwnerId: string | null,
    newOwnerName: string
  ) => Promise<boolean>;
  isMetricSyncing?: (metricId: string) => boolean;
  onCreateIssue?: (title: string, description: string, ownerId?: string) => void;
  periodMapping?: { [periodLabel: string]: string[] }; // Maps period labels to actual week dates
  updateMetricDirect?: (metricId: string, weekStart: string, newValue: number | null) => Promise<void>;
  onOptimisticCellUpdate?: (metricId: string, weekStart: string, patch: { custom_target_value?: number | null; target_note?: string | null }) => void;
  // 🚀 PHASE 1 OPTIMIZATION: Pre-computed permissions from parent
  permissions?: ReturnType<typeof useMetricsPermissions>;
  // Archived metrics props
  isArchived?: boolean;
  onUnarchive?: (metricId: string) => Promise<void>;
}

const DraggableMetricRowComponent: React.FC<DraggableMetricRowProps> = ({
  metric,
  weekStarts,
  weeklyWeekStarts,
  editingCell,
  editValue,
  onCellEdit,
  onCellSave,
  onCellCancel,
  onEditValueChange,
  onMetricConfiguration,
  formatValue,
  formatWeekDate,
  getValueColor,
  getOwnerInitials,
  highlightedWeek,
  managementMode,
  isSelected,
  onSelect,
  onDelete,
  optimisticOwnershipHandler,
  isMetricSyncing,
  onCreateIssue,
  periodMapping,
  updateMetricDirect,
  onOptimisticCellUpdate,
  permissions,
  isArchived = false,
  onUnarchive,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: metric.id,
    disabled: managementMode, // Disable drag in management mode
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Column positions calculation
  const checkboxWidth = 40;
  const metricNameWidth = 200;
  const chartWidth = 50;
  const ownerWidth = 70;
  const issueWidth = 60;
  const targetWidth = 80;

  const metricNameLeft = managementMode ? checkboxWidth : 0;
  const chartLeft = metricNameLeft + metricNameWidth;
  const ownerLeft = chartLeft + chartWidth;
  const issueLeft = ownerLeft + ownerWidth;
  const targetLeft = issueLeft + issueWidth;

  return (
    <tr 
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-b transition-colors hover:bg-muted/50 group relative",
        isSelected && "bg-muted",
        isDragging && "z-50 shadow-lg bg-background border-2 border-primary/20"
      )}
    >
      {managementMode && (
        <td 
          className="sticky left-0 py-1 px-2 align-middle border-r-0"
          style={{ 
            width: `${checkboxWidth}px`, 
            minWidth: `${checkboxWidth}px`,
            willChange: 'transform',
            transform: 'translateZ(0)',
            backgroundColor: 'hsl(var(--background))',
            zIndex: 40
          }}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            aria-label={`Select ${metric.metric_name}`}
          />
        </td>
      )}
      
      <td 
        className="sticky left-0 font-medium py-1 px-3 relative group shadow-[2px_0_4px_hsl(var(--border)/0.5)] align-middle border-r-0"
        style={{
          width: `${metricNameWidth}px`,
          minWidth: `${metricNameWidth}px`,
          maxWidth: `${metricNameWidth}px`,
          left: `${metricNameLeft}px`,
          willChange: 'transform',
          transform: 'translateZ(0)',
          backgroundColor: 'hsl(var(--background))',
          zIndex: 40,
          overflow: 'hidden',
        }}
      >
        <div className="flex items-center">
          {!managementMode && (
            <div
              {...attributes}
              {...listeners}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-grab active:cursor-grabbing p-1 hover:bg-muted/50 rounded z-30 mr-2"
              title="Drag to reorder metric"
            >
              <GripVertical className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <MetricNameCell
              metric={metric}
              onMetricConfiguration={onMetricConfiguration}
              isArchived={isArchived}
              onUnarchive={onUnarchive ? () => onUnarchive(metric.id) : undefined}
            />
          </div>
        </div>
      </td>
      
      <td 
        className="sticky left-0 py-1 px-1 align-middle border-r-0 text-center"
        style={{ 
          width: `${chartWidth}px`, 
          minWidth: `${chartWidth}px`,
          left: `${chartLeft}px`,
          willChange: 'transform',
          transform: 'translateZ(0)',
          backgroundColor: 'hsl(var(--background))',
          zIndex: 40
        }}
      >
        <MetricChartCell
          metric={metric}
          weekStarts={weekStarts}
          periodMapping={periodMapping}
        />
      </td>
      
      <td 
        className="sticky left-0 py-1 px-2 align-middle border-r-0"
        style={{ 
          width: `${ownerWidth}px`, 
          minWidth: `${ownerWidth}px`,
          left: `${ownerLeft}px`,
          willChange: 'transform',
          transform: 'translateZ(0)',
          backgroundColor: 'hsl(var(--background))',
          zIndex: 40
        }}
      >
        <MetricOwnerCell
          metric={metric}
          getOwnerInitials={getOwnerInitials}
          optimisticOwnershipHandler={optimisticOwnershipHandler}
          isMetricSyncing={isMetricSyncing}
          canChangeOwner={permissions ? permissions.canChangeMetricOwner(metric) : undefined}
        />
      </td>

      <td 
        className="sticky left-0 py-1 px-2 align-middle border-r-0"
        style={{ 
          width: `${issueWidth}px`, 
          minWidth: `${issueWidth}px`,
          left: `${issueLeft}px`,
          willChange: 'transform',
          transform: 'translateZ(0)',
          backgroundColor: 'hsl(var(--background))',
          zIndex: 40
        }}
      >
        {!isArchived && (
          <MetricIssueCell
            metric={metric}
            onCreateIssue={onCreateIssue}
          />
        )}
        {managementMode && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-5 w-5 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
            title="Delete metric"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </td>
      
      <td 
        className="sticky left-0 py-1 px-2 text-center align-middle border-r"
        style={{ 
          width: `${targetWidth}px`, 
          minWidth: `${targetWidth}px`,
          left: `${targetLeft}px`,
          willChange: 'transform',
          transform: 'translateZ(0)',
          backgroundColor: 'hsl(var(--background))',
          zIndex: 40
        }}
      >
        <MetricTargetCell
          metric={metric}
          formatValue={formatValue}
          weekStarts={weeklyWeekStarts || weekStarts}
          selectedTeam={metric.team_id}
          managementMode={managementMode}
          formatWeekDate={formatWeekDate}
        />
      </td>
      
      {weekStarts.map((weekStart) => {
        const canEdit = permissions ? permissions.canEditMetricValue(metric) : true;
        
        return (
          <td
            key={`${metric.id}-${weekStart}`}
            className={cn(
              "text-center py-1 px-1 align-middle",
              highlightedWeek === weekStart && "bg-muted"
            )}
            style={{ width: '75px', minWidth: '75px' }}
          >
            <WeeklyMetricCell
              metric={metric}
              weekStart={weekStart}
              editingCell={editingCell}
              onCellEdit={onCellEdit}
              onCellSave={onCellSave}
              onCellCancel={onCellCancel}
              formatValue={formatValue}
              getValueColor={getValueColor}
              periodMapping={periodMapping}
              formatWeekDate={formatWeekDate}
              updateMetricDirect={updateMetricDirect}
              onOptimisticCellUpdate={onOptimisticCellUpdate}
              canEdit={canEdit && !isArchived}
            />
          </td>
        );
      })}
    </tr>
  );
};

export const DraggableMetricRow = React.memo(DraggableMetricRowComponent, (prevProps, nextProps) => {
  if (prevProps.metric !== nextProps.metric) return false;
  if (prevProps.isSelected !== nextProps.isSelected) return false;
  if (prevProps.managementMode !== nextProps.managementMode) return false;
  if (prevProps.isArchived !== nextProps.isArchived) return false;

  const prevHasEditingCell = prevProps.editingCell?.startsWith(prevProps.metric.id + '-') ?? false;
  const nextHasEditingCell = nextProps.editingCell?.startsWith(nextProps.metric.id + '-') ?? false;
  if (prevHasEditingCell !== nextHasEditingCell) return false;

  if (prevProps.weekStarts !== nextProps.weekStarts) return false;
  if (prevProps.periodMapping !== nextProps.periodMapping) return false;
  if (prevProps.highlightedWeek !== nextProps.highlightedWeek) return false;

  // Re-render when edit permission changes (e.g. after async permission data loads on hard refresh)
  const prevCanEdit = prevProps.permissions ? prevProps.permissions.canEditMetricValue(prevProps.metric) : true;
  const nextCanEdit = nextProps.permissions ? nextProps.permissions.canEditMetricValue(nextProps.metric) : true;
  if (prevCanEdit !== nextCanEdit) return false;

  return true;
});
