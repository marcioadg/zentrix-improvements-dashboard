import React, { useState, useEffect, useCallback } from 'react';
import { 
  DndContext, 
  closestCenter, 
  DragEndEvent, 
  PointerSensor, 
  KeyboardSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Checkbox } from '@/components/ui/checkbox';
import { DraggableMetricRow } from '@/components/dashboard/metrics/DraggableMetricRow';
import { formatWeekDateMultiLine } from '@/utils/metricUtils';
import { cn } from '@/lib/utils';
import { useMetricsPermissions } from '@/hooks/useMetricsPermissions';
import { logger } from '@/utils/logger';

interface WeeklyMetricsTableContentProps {
  localMetrics: any[];
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
  selectedTeam?: string;
  showCurrentWeek: boolean;
  highlightCurrentWeek: boolean;
  weekStartDay: 'monday' | 'sunday';
  managementMode: boolean;
  selectedMetrics: string[];
  onMetricSelect: (metricId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onDeleteMetric: (metric: any) => void;
  highlightedWeek?: string;
  allSelected: boolean;
  someSelected: boolean;
  canReorderMetrics: boolean;
  optimisticOwnershipHandler?: (
    metricId: string,
    currentOwnerId: string | null,
    currentOwnerName: string,
    newOwnerId: string | null,
    newOwnerName: string
  ) => Promise<boolean>;
  isMetricSyncing?: (metricId: string) => boolean;
  onCreateIssue?: (title: string, description: string, ownerId?: string) => void;
  onReorderMetrics?: (metricIds: string[], displayOrders: number[]) => Promise<void>;
  periodMapping?: { [periodLabel: string]: string[] }; // Maps period labels to actual week dates
  updateMetricDirect?: (metricId: string, weekStart: string, newValue: number | null) => Promise<void>;
  // 🚀 PHASE 1 OPTIMIZATION: Pre-computed permissions from parent
  permissions?: ReturnType<typeof useMetricsPermissions>;
  // Archived metrics props
  archivedMetrics?: any[];
  onUnarchiveMetric?: (metricId: string) => Promise<void>;
  onOptimisticCellUpdate?: (metricId: string, weekStart: string, patch: { custom_target_value?: number | null; target_note?: string | null }) => void;
}

export const WeeklyMetricsTableContent: React.FC<WeeklyMetricsTableContentProps> = ({
  localMetrics,
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
  selectedTeam,
  showCurrentWeek,
  highlightCurrentWeek,
  weekStartDay,
  managementMode,
  selectedMetrics,
  onMetricSelect,
  onSelectAll,
  onDeleteMetric,
  highlightedWeek,
  allSelected,
  someSelected,
  canReorderMetrics,
  optimisticOwnershipHandler,
  isMetricSyncing,
  onCreateIssue,
  onReorderMetrics,
  periodMapping,
  updateMetricDirect,
  onOptimisticCellUpdate,
  permissions,
  archivedMetrics = [],
  onUnarchiveMetric,
}) => {
  // Local state for optimistic drag reorder - prevents revert flicker
  const [optimisticMetrics, setOptimisticMetrics] = useState(localMetrics);

  // Sync with parent when props change (but not during drag)
  useEffect(() => {
    setOptimisticMetrics(localMetrics);
  }, [localMetrics]);

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !onReorderMetrics) {
      return;
    }

    const oldIndex = optimisticMetrics.findIndex(metric => metric.id === active.id);
    const newIndex = optimisticMetrics.findIndex(metric => metric.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Optimistically reorder the local array immediately
    const reorderedMetrics = arrayMove(optimisticMetrics, oldIndex, newIndex);
    setOptimisticMetrics(reorderedMetrics);
    
    // Optimization: Only update metrics in the affected range
    const minIndex = Math.min(oldIndex, newIndex);
    const maxIndex = Math.max(oldIndex, newIndex);
    
    // Extract only affected metrics with their new display_orders
    const affectedMetrics = reorderedMetrics.slice(minIndex, maxIndex + 1);
    const affectedMetricIds = affectedMetrics.map(metric => metric.id);
    const affectedDisplayOrders = affectedMetrics.map((_, index) => minIndex + index + 1);

    logger.log(`🎯 Drag optimization: Updating ${affectedMetricIds.length} of ${reorderedMetrics.length} metrics`);

    try {
      await onReorderMetrics(affectedMetricIds, affectedDisplayOrders);
    } catch (error) {
      logger.error('❌ Drag & Drop - Failed to reorder metrics:', error);
      // Rollback to original order on error
      setOptimisticMetrics(localMetrics);
    }
  }, [optimisticMetrics, localMetrics, onReorderMetrics]);

  // Single scrollable table with sticky header
  const mainContent = (
    <div className="max-h-[calc(100vh-300px)] overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-50 bg-background border-b border-border/50">
          <tr>
            {managementMode && (
              <th 
                className="sticky left-0 bg-background z-50 px-2 py-3 text-left align-middle font-normal text-muted-foreground h-11 border-r border-border/20"
                style={{ width: '40px', minWidth: '40px' }}
              >
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={onSelectAll}
                  aria-label="Select all metrics"
                />
              </th>
            )}
            <th 
              className="sticky left-0 bg-background z-50 px-3 py-3 text-left align-middle font-normal text-muted-foreground h-11 border-r border-border/20"
              style={{ 
                width: '200px', 
                minWidth: '200px',
                left: managementMode ? '40px' : '0px'
              }}
            >
              <span className="text-sm font-medium">Metric Name</span>
            </th>
            <th 
              className="sticky left-0 bg-background z-50 px-2 py-3 text-center align-middle font-normal text-muted-foreground h-11 border-r border-border/20"
              style={{ 
                width: '50px', 
                minWidth: '50px',
                left: managementMode ? '240px' : '200px'
              }}
            >
              <span className="text-xs font-medium">Chart</span>
            </th>
            <th 
              className="sticky left-0 bg-background z-50 px-2 py-3 text-center align-middle font-normal text-muted-foreground h-11 border-r border-border/20"
              style={{ 
                width: '70px', 
                minWidth: '70px',
                left: managementMode ? '290px' : '250px'
              }}
            >
              <span className="text-xs font-medium">Owner</span>
            </th>
            <th 
              className="sticky left-0 bg-background z-50 px-2 py-3 text-center align-middle font-normal text-muted-foreground h-11 border-r border-border/20"
              style={{ 
                width: '60px', 
                minWidth: '60px',
                left: managementMode ? '360px' : '320px'
              }}
            >
              <span className="text-xs font-medium">Actions</span>
            </th>
            <th 
              className="sticky left-0 bg-background z-50 px-2 py-3 text-center align-middle font-normal text-muted-foreground h-11 border-r border-border/20"
              style={{ 
                width: '80px', 
                minWidth: '80px',
                left: managementMode ? '420px' : '380px'
              }}
            >
              <span className="text-xs font-medium">Target</span>
            </th>
            {weekStarts.map((weekStart) => {
              // Check if this is a period label (contains multiple date ranges) or a single week
              const isPeriodLabel = weekStart.includes(' - ') && weekStart.split(' - ').length > 1;
              
              let displayContent;
              if (isPeriodLabel) {
                // This is a period label, display as-is but split for better formatting
                const parts = weekStart.split(' - ');
                if (parts.length >= 4) {
                  // Format as "start - end" over two lines for better readability
                  displayContent = {
                    start: `${parts[0]} - ${parts[1]}`,
                    end: `${parts[2]} - ${parts[3]}`
                  };
                } else {
                  // Fallback to single line
                  displayContent = {
                    start: weekStart,
                    end: ''
                  };
                }
              } else {
                // This is a regular week date, use the formatting function
                try {
                  displayContent = formatWeekDateMultiLine(weekStart, weekStartDay);
                } catch (error) {
                  logger.error('Error formatting week date:', weekStart, error);
                  displayContent = { start: weekStart, end: '' };
                }
              }
              
              return (
                <th
                  key={weekStart}
                  className={cn(
                    "px-1 py-3 text-center align-middle font-normal text-muted-foreground h-11 sticky top-0 bg-background/95 backdrop-blur-sm z-40",
                    highlightCurrentWeek && highlightedWeek === weekStart && "bg-muted/30"
                  )}
                  style={{ minWidth: '80px' }}
                >
                  <div className="whitespace-nowrap text-xs font-medium">
                    <div className="flex flex-col leading-tight">
                      <span className="text-xs">{displayContent.start}</span>
                      {displayContent.end && <span className="text-xs">{displayContent.end}</span>}
                    </div>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {optimisticMetrics.map((metric) => {
            const isSelected = selectedMetrics.includes(metric.id);
            
            return (
              <DraggableMetricRow
                key={metric.id}
                metric={metric}
                weekStarts={weekStarts}
                weeklyWeekStarts={weeklyWeekStarts}
                editingCell={editingCell}
                editValue={editValue}
                onCellEdit={onCellEdit}
                onCellSave={onCellSave}
                onCellCancel={onCellCancel}
                onEditValueChange={onEditValueChange}
                onMetricConfiguration={onMetricConfiguration}
                formatValue={formatValue}
                formatWeekDate={formatWeekDate}
                getValueColor={getValueColor}
                getOwnerInitials={getOwnerInitials}
                highlightedWeek={highlightedWeek}
                managementMode={managementMode}
                isSelected={isSelected}
                onSelect={(selected) => onMetricSelect(metric.id, selected)}
                onDelete={() => onDeleteMetric(metric)}
                optimisticOwnershipHandler={optimisticOwnershipHandler}
                isMetricSyncing={isMetricSyncing}
                onCreateIssue={onCreateIssue}
                periodMapping={periodMapping}
                updateMetricDirect={updateMetricDirect}
                onOptimisticCellUpdate={onOptimisticCellUpdate}
                permissions={permissions}
              />
            );
          })}
          {/* Archived metrics section */}
          {archivedMetrics.length > 0 && archivedMetrics.map((metric) => {
            return (
              <DraggableMetricRow
                key={`archived-${metric.id}`}
                metric={metric}
                weekStarts={weekStarts}
                weeklyWeekStarts={weeklyWeekStarts}
                editingCell={editingCell}
                editValue={editValue}
                onCellEdit={onCellEdit}
                onCellSave={onCellSave}
                onCellCancel={onCellCancel}
                onEditValueChange={onEditValueChange}
                onMetricConfiguration={onMetricConfiguration}
                formatValue={formatValue}
                formatWeekDate={formatWeekDate}
                getValueColor={getValueColor}
                getOwnerInitials={getOwnerInitials}
                highlightedWeek={highlightedWeek}
                managementMode={managementMode}
                isSelected={false}
                onSelect={() => {}}
                onDelete={() => {}}
                optimisticOwnershipHandler={optimisticOwnershipHandler}
                isMetricSyncing={isMetricSyncing}
                onCreateIssue={onCreateIssue}
                periodMapping={periodMapping}
                updateMetricDirect={updateMetricDirect}
                onOptimisticCellUpdate={onOptimisticCellUpdate}
                permissions={permissions}
                isArchived={true}
                onUnarchive={onUnarchiveMetric}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // Always wrap with drag and drop context if reordering is enabled and not in management mode
  if (canReorderMetrics && !managementMode && onReorderMetrics) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={optimisticMetrics.map(metric => metric.id)}
          strategy={verticalListSortingStrategy}
        >
          {mainContent}
        </SortableContext>
      </DndContext>
    );
  }

  return mainContent;
};