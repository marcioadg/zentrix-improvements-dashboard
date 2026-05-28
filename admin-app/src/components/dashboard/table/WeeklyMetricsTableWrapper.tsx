
import React, { useMemo } from 'react';
import { WeeklyMetricsTableContent } from './WeeklyMetricsTableContent';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp } from 'lucide-react';
import { useUserCapabilities } from '@/hooks/useUserCapabilities';
import { useMetricsPermissions } from '@/hooks/useMetricsPermissions';

export interface WeeklyMetricsTableWrapperProps {
  filteredMetrics: WeeklyMetricWithOwner[];
  weekStarts: string[]; // Display week starts (might be aggregated periods)
  weeklyWeekStarts?: string[]; // Original weekly ISO dates for modals
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
  weekStartDay: 'monday' | 'sunday';
  managementMode: boolean;
  selectedMetrics: string[];
  onMetricSelect: (metricId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onDeleteMetric: (metric: WeeklyMetricWithOwner) => void;
  highlightedWeek: string | null;
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
  onAddMetric?: () => void;
  updateMetricDirect?: (metricId: string, weekStart: string, newValue: number | null) => Promise<void>;
  // 🚀 PHASE 1 OPTIMIZATION: Pre-computed permissions from parent
  permissions?: ReturnType<typeof useMetricsPermissions>;
  // Archived metrics props
  archivedMetrics?: WeeklyMetricWithOwner[];
  onUnarchiveMetric?: (metricId: string) => Promise<void>;
  onOptimisticCellUpdate?: (metricId: string, weekStart: string, patch: { custom_target_value?: number | null; target_note?: string | null }) => void;
}

export const WeeklyMetricsTableWrapper: React.FC<WeeklyMetricsTableWrapperProps> = ({
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
  weekStartDay,
  managementMode,
  selectedMetrics,
  onMetricSelect,
  onSelectAll,
  onDeleteMetric,
  highlightedWeek,
  optimisticOwnershipHandler,
  isMetricSyncing,
  onCreateIssue,
  onReorderMetrics,
  periodMapping,
  onAddMetric,
  updateMetricDirect,
  onOptimisticCellUpdate,
  permissions,
  archivedMetrics = [],
  onUnarchiveMetric,
}) => {
  const { permissionLevel, hasCapability } = useUserCapabilities();

  // Selection state calculations
  const allSelected = useMemo(() => {
    return filteredMetrics.length > 0 && filteredMetrics.every(metric => selectedMetrics.includes(metric.id));
  }, [filteredMetrics, selectedMetrics]);

  const someSelected = useMemo(() => {
    return selectedMetrics.length > 0 && !allSelected;
  }, [selectedMetrics, allSelected]);

  // Check if user has permission to create metrics
  const canCreateMetrics = hasCapability('create_metrics') || hasCapability('manage_metrics');
  
  // Show empty state when no active metrics
  if (filteredMetrics.length === 0) {
    return (
      <div className="space-y-6">
        {/* Empty state message */}
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
        
        {/* Show archived metrics below empty state if they exist */}
        {archivedMetrics.length > 0 && (
          <WeeklyMetricsTableContent
            localMetrics={[]}
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
            selectedTeam={selectedTeam}
            showCurrentWeek={showCurrentWeek}
            highlightCurrentWeek={highlightCurrentWeek}
            weekStartDay={weekStartDay}
            managementMode={managementMode}
            selectedMetrics={selectedMetrics}
            onMetricSelect={onMetricSelect}
            onSelectAll={onSelectAll}
            onDeleteMetric={onDeleteMetric}
            highlightedWeek={highlightedWeek}
            allSelected={false}
            someSelected={false}
            canReorderMetrics={false}
            optimisticOwnershipHandler={optimisticOwnershipHandler}
            isMetricSyncing={isMetricSyncing}
            onCreateIssue={onCreateIssue}
            periodMapping={periodMapping}
            updateMetricDirect={updateMetricDirect}
            onOptimisticCellUpdate={onOptimisticCellUpdate}
            permissions={permissions}
            archivedMetrics={archivedMetrics}
            onUnarchiveMetric={onUnarchiveMetric}
          />
        )}
      </div>
    );
  }

  return (
      <WeeklyMetricsTableContent
        localMetrics={filteredMetrics}
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
      selectedTeam={selectedTeam}
      showCurrentWeek={showCurrentWeek}
      highlightCurrentWeek={highlightCurrentWeek}
      weekStartDay={weekStartDay}
      managementMode={managementMode}
      selectedMetrics={selectedMetrics}
      onMetricSelect={onMetricSelect}
      onSelectAll={onSelectAll}
      onDeleteMetric={onDeleteMetric}
      highlightedWeek={highlightedWeek}
      allSelected={allSelected}
      someSelected={someSelected}
      canReorderMetrics={true}
      optimisticOwnershipHandler={optimisticOwnershipHandler}
      isMetricSyncing={isMetricSyncing}
      onCreateIssue={onCreateIssue}
      onReorderMetrics={onReorderMetrics}
      periodMapping={periodMapping}
      updateMetricDirect={updateMetricDirect}
      onOptimisticCellUpdate={onOptimisticCellUpdate}
      permissions={permissions}
      archivedMetrics={archivedMetrics}
      onUnarchiveMetric={onUnarchiveMetric}
    />
  );
};
