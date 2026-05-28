import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp } from 'lucide-react';
import { NewDraggableMetricRow } from '@/components/dashboard/metrics/NewDraggableMetricRow';
import { formatWeekDateMultiLine } from '@/utils/metricUtils';
import { cn } from '@/lib/utils';
import { useMetricsPermissions } from '@/hooks/useMetricsPermissions';
import { useUserCapabilities } from '@/hooks/useUserCapabilities';
import { getCurrentWeekStart } from '@/lib/dateUtils';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { logger } from '@/utils/logger';

// --- Resizable column config ---
interface ColumnDef {
  key: string;
  label: string;
  defaultWidth: number;
  minWidth: number;
  sticky: true;
}

const STICKY_COLUMNS: ColumnDef[] = [
  { key: 'checkbox', label: '', defaultWidth: 40, minWidth: 32, sticky: true },
  { key: 'metricName', label: 'Metric Name', defaultWidth: 200, minWidth: 120, sticky: true },
  { key: 'chart', label: 'Chart', defaultWidth: 50, minWidth: 40, sticky: true },
  { key: 'owner', label: 'Owner', defaultWidth: 70, minWidth: 50, sticky: true },
  { key: 'actions', label: 'Actions', defaultWidth: 60, minWidth: 40, sticky: true },
  { key: 'target', label: 'Target', defaultWidth: 80, minWidth: 60, sticky: true },
];

const DEFAULT_WEEK_WIDTH = 80;
const MIN_WEEK_WIDTH = 60;

// --- Props (same interface as WeeklyMetricsTable, the outermost layer) ---
export interface NewWeeklyMetricsTableProps {
  filteredMetrics: WeeklyMetricWithOwner[];
  weekStarts: string[];
  weeklyWeekStarts?: string[];
  editingCell: string | null;
  editValue: string;
  onCellEdit: (metricId: string, weekStart: string, currentValue: number | null) => void;
  onCellSave: (metricId: string, weekStart: string) => void;
  onCellCancel: () => void;
  onEditValueChange: (value: string) => void;
  onMetricConfiguration: (metric: WeeklyMetricWithOwner) => void;
  formatValue: (value: number | null, unit: string) => string;
  formatWeekDate: (weekStart: string) => string;
  getValueColor: (value: number | null, metric: WeeklyMetricWithOwner) => string;
  getOwnerInitials: (fullName: string) => string;
  selectedTeam?: string;
  showCurrentWeek: boolean;
  highlightCurrentWeek: boolean;
  overrideHighlightedWeek?: string;
  weekStartDay: 'monday' | 'sunday';
  managementMode: boolean;
  selectedMetrics: string[];
  onMetricSelect: (metricId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onDeleteMetric: (metric: WeeklyMetricWithOwner) => void;
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
  periodMapping?: { [periodLabel: string]: string[] };
  onAddMetric?: () => void;
  updateMetricDirect?: (metricId: string, weekStart: string, newValue: number | null) => Promise<void>;
  permissions?: ReturnType<typeof useMetricsPermissions>;
  archivedMetrics?: WeeklyMetricWithOwner[];
  onUnarchiveMetric?: (metricId: string) => Promise<void>;
  onOptimisticCellUpdate?: (metricId: string, weekStart: string, patch: { custom_target_value?: number | null; target_note?: string | null }) => void;
}

// --- Resize handle component ---
const ResizeHandle: React.FC<{
  onMouseDown: (e: React.MouseEvent) => void;
}> = ({ onMouseDown }) => (
  <div
    onMouseDown={onMouseDown}
    className="absolute right-[-2px] top-0 bottom-0 w-[5px] cursor-col-resize hover:bg-primary/40 active:bg-primary/60 z-[60] select-none"
    style={{ touchAction: 'none', height: '100%' }}
  />
);

// === MAIN COMPONENT ===
export const NewWeeklyMetricsTable: React.FC<NewWeeklyMetricsTableProps> = React.memo(({
  filteredMetrics,
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
  overrideHighlightedWeek,
  weekStartDay,
  managementMode,
  selectedMetrics,
  onMetricSelect,
  onSelectAll,
  onDeleteMetric,
  optimisticOwnershipHandler,
  isMetricSyncing,
  onCreateIssue,
  onReorderMetrics,
  periodMapping,
  onAddMetric,
  updateMetricDirect,
  onOptimisticCellUpdate,
  permissions: preComputedPermissions,
  archivedMetrics = [],
  onUnarchiveMetric,
}) => {
  // ---- Permissions (from old WeeklyMetricsTable) ----
  const localPermissions = useMetricsPermissions(selectedTeam);
  const permissions = preComputedPermissions || localPermissions;
  const { permissionLevel, hasCapability } = useUserCapabilities();
  const canCreateMetrics = hasCapability('create_metrics') || hasCapability('manage_metrics');

  // ---- Sort metrics (from old WeeklyMetricsTable) ----
  const sortedMetrics = useMemo(() => {
    return [...filteredMetrics].sort((a, b) => {
      const aOrder = a.display_order ?? 999999;
      const bOrder = b.display_order ?? 999999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.metric_name.localeCompare(b.metric_name);
    });
  }, [filteredMetrics]);

  // ---- Highlighted week (from old WeeklyMetricsTable) ----
  const highlightedWeek = useMemo(() => {
    if (!highlightCurrentWeek) return null;
    if (overrideHighlightedWeek) return overrideHighlightedWeek;
    const currentWeekStart = getCurrentWeekStart(weekStartDay);
    const match = weekStarts.find(ws => ws === currentWeekStart);
    if (match) return match;
    const sorted = [...weekStarts].sort((a, b) => b.localeCompare(a));
    return sorted.length > 0 ? sorted[0] : null;
  }, [highlightCurrentWeek, weekStarts, weekStartDay, overrideHighlightedWeek]);

  // ---- Selection state (from old Wrapper) ----
  const allSelected = useMemo(() => {
    return sortedMetrics.length > 0 && sortedMetrics.every(m => selectedMetrics.includes(m.id));
  }, [sortedMetrics, selectedMetrics]);

  const someSelected = useMemo(() => {
    return selectedMetrics.length > 0 && !allSelected;
  }, [selectedMetrics, allSelected]);

  // ---- Optimistic drag state (from old TableContent) ----
  const [optimisticMetrics, setOptimisticMetrics] = useState(sortedMetrics);
  useEffect(() => { setOptimisticMetrics(sortedMetrics); }, [sortedMetrics]);

  // ---- Resizable column widths ----
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    STICKY_COLUMNS.forEach(col => { initial[col.key] = col.defaultWidth; });
    return initial;
  });
  const [weekColumnWidths, setWeekColumnWidths] = useState<Record<string, number>>({});

  const getWeekColumnWidth = useCallback((weekStart: string) => {
    return weekColumnWidths[weekStart] ?? DEFAULT_WEEK_WIDTH;
  }, [weekColumnWidths]);

  const handleResizeStart = useCallback((colKey: string, minWidth: number, currentWidth: number, isWeek: boolean) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(minWidth, currentWidth + delta);

      if (isWeek) {
        setWeekColumnWidths(prev => ({ ...prev, [colKey]: newWidth }));
      } else {
        setColumnWidths(prev => ({ ...prev, [colKey]: newWidth }));
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  // ---- Compute sticky left offsets ----
  const stickyOffsets = useMemo(() => {
    const offsets: Record<string, number> = {};
    let left = 0;
    const cols = managementMode ? STICKY_COLUMNS : STICKY_COLUMNS.filter(c => c.key !== 'checkbox');
    for (const col of cols) {
      offsets[col.key] = left;
      left += columnWidths[col.key] ?? col.defaultWidth;
    }
    return offsets;
  }, [columnWidths, managementMode]);

  // ---- DnD sensors ----
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorderMetrics) return;

    const oldIndex = optimisticMetrics.findIndex(m => m.id === active.id);
    const newIndex = optimisticMetrics.findIndex(m => m.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(optimisticMetrics, oldIndex, newIndex);
    setOptimisticMetrics(reordered);

    const minIdx = Math.min(oldIndex, newIndex);
    const maxIdx = Math.max(oldIndex, newIndex);
    const affected = reordered.slice(minIdx, maxIdx + 1);

    try {
      await onReorderMetrics(
        affected.map(m => m.id),
        affected.map((_, i) => minIdx + i + 1)
      );
    } catch (error) {
      logger.error('Failed to reorder metrics:', error);
      setOptimisticMetrics(sortedMetrics);
    }
  }, [optimisticMetrics, sortedMetrics, onReorderMetrics]);

  // ---- Empty state (from old Wrapper) ----
  if (sortedMetrics.length === 0 && archivedMetrics.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-[6px]">
        <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-[16px] font-semibold mb-2">No metrics yet</h3>
        {permissionLevel === 'view-only' ? (
          <p className="text-muted-foreground mb-6">
            Metrics created by users with higher permission levels will appear here.
          </p>
        ) : (
          <p className="text-muted-foreground mb-6">
            Get started by creating your first metric to track team performance.
          </p>
        )}
        {onAddMetric && canCreateMetrics && (
          <Button onClick={onAddMetric} className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create First Metric
          </Button>
        )}
      </div>
    );
  }

  // ---- Render header cell helper ----
  const renderStickyHeader = (col: ColumnDef) => {
    if (col.key === 'checkbox' && !managementMode) return null;

    const width = columnWidths[col.key] ?? col.defaultWidth;
    const left = stickyOffsets[col.key] ?? 0;
    const isLast = col.key === 'target';

    return (
      <th
        key={col.key}
        className={cn(
          "sticky bg-background z-50 py-3 align-middle font-normal text-muted-foreground h-11 overflow-hidden",
          col.key === 'metricName' ? 'text-left' : 'text-center',
          'border-r border-border/20'
        )}
        style={{
          width: `${width}px`,
          minWidth: `${width}px`,
          maxWidth: `${width}px`,
          left: `${left}px`,
        }}
      >
        <div className="relative px-2 overflow-hidden text-ellipsis whitespace-nowrap">
          {col.key === 'checkbox' ? (
            <Checkbox
              checked={allSelected}
              onCheckedChange={onSelectAll}
              aria-label="Select all metrics"
            />
          ) : (
            <span className={cn("font-medium", col.key === 'metricName' ? 'text-sm' : 'text-xs')}>
              {col.label}
            </span>
          )}
          <ResizeHandle onMouseDown={handleResizeStart(col.key, col.minWidth, width, false)} />
        </div>
      </th>
    );
  };

  // ---- Render week header cells ----
  const renderWeekHeaders = () =>
    weekStarts.map((weekStart, idx) => {
      const isPeriodLabel = weekStart.includes(' - ') && weekStart.split(' - ').length > 1;
      let displayContent: { start: string; end: string };

      if (isPeriodLabel) {
        const parts = weekStart.split(' - ');
        displayContent = parts.length >= 4
          ? { start: `${parts[0]} - ${parts[1]}`, end: `${parts[2]} - ${parts[3]}` }
          : { start: weekStart, end: '' };
      } else {
        try {
          displayContent = formatWeekDateMultiLine(weekStart, weekStartDay);
        } catch {
          displayContent = { start: weekStart, end: '' };
        }
      }

      const width = getWeekColumnWidth(weekStart);

      return (
        <th
          key={weekStart}
          className={cn(
            "px-1 py-3 text-center align-middle font-normal text-muted-foreground h-11 sticky top-0 bg-background/95 backdrop-blur-sm z-40 border-r border-border/30",
            highlightCurrentWeek && highlightedWeek === weekStart && "bg-muted/30"
          )}
          style={{ minWidth: `${width}px`, width: `${width}px` }}
        >
          <div className="relative whitespace-nowrap text-xs font-medium">
            <div className="flex flex-col leading-tight">
              <span className="text-xs">{displayContent.start}</span>
              {displayContent.end && <span className="text-xs">{displayContent.end}</span>}
            </div>
            <ResizeHandle onMouseDown={handleResizeStart(weekStart, MIN_WEEK_WIDTH, width, true)} />
          </div>
        </th>
      );
    });

  // ---- Render rows ----
  const renderRow = (metric: WeeklyMetricWithOwner, isArchived = false) => (
    <NewDraggableMetricRow
      key={isArchived ? `archived-${metric.id}` : metric.id}
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
      isSelected={isArchived ? false : selectedMetrics.includes(metric.id)}
      onSelect={isArchived ? () => {} : (selected) => onMetricSelect(metric.id, selected)}
      onDelete={isArchived ? () => {} : () => onDeleteMetric(metric)}
      optimisticOwnershipHandler={optimisticOwnershipHandler}
      isMetricSyncing={isMetricSyncing}
      onCreateIssue={onCreateIssue}
      periodMapping={periodMapping}
      updateMetricDirect={updateMetricDirect}
      onOptimisticCellUpdate={onOptimisticCellUpdate}
      permissions={permissions}
      isArchived={isArchived}
      onUnarchive={onUnarchiveMetric}
      columnWidths={columnWidths}
      stickyOffsets={stickyOffsets}
      weekColumnWidths={weekColumnWidths}
    />
  );

  // ---- The table ----
  const table = (
    <div className="max-h-[calc(100vh-300px)] overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-50 bg-background border-b border-border/50">
          <tr>
            {STICKY_COLUMNS.map(renderStickyHeader)}
            {renderWeekHeaders()}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {optimisticMetrics.map(m => renderRow(m, false))}
          {archivedMetrics.map(m => renderRow(m, true))}
        </tbody>
      </table>
    </div>
  );

  // ---- Wrap with DnD if needed ----
  if (!managementMode && onReorderMetrics) {
    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={optimisticMetrics.map(m => m.id)} strategy={verticalListSortingStrategy}>
          {table}
        </SortableContext>
      </DndContext>
    );
  }

  return table;
});
