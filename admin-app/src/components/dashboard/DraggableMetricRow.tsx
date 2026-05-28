
import React, { memo } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MetricRow } from './MetricRow';
import { MetricNameCell } from './MetricNameCell';
import { MetricOwnerCell } from './MetricOwnerCell';
import { MetricActionsCell } from './MetricActionsCell';
import { MetricTargetCell } from './MetricTargetCell';
import { MetricWeekCell } from './MetricWeekCell';

interface DraggableMetricRowProps {
  metric: any;
  weekStarts: string[];
  editingCell: string | null;
  editValue: string;
  onCellEdit: (metricId: string, weekStart: string, currentValue: number | null) => void;
  onCellSave: (metricId: string, weekStart: string) => void;
  onCellCancel: () => void;
  onEditValueChange: (value: string) => void;
  onMetricConfiguration: (metric: any) => void;
  formatValue: (value: number | null, unit: string) => string;
  formatWeekDate: (weekStart: string) => string;
  getValueColor: (value: number | null, metric: any) => string;
  getOwnerInitials: (fullName: string) => string;
  selectedTeam?: string;
  showCurrentWeek: boolean;
  highlightCurrentWeek: boolean;
  weekStartDay: 'monday' | 'sunday';
  highlightedWeek: string | null;
  managementMode: boolean;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onDelete: () => void;
  canReorder?: boolean;
}

const DraggableMetricRowComponent: React.FC<DraggableMetricRowProps> = ({
  metric,
  managementMode,
  selectedTeam,
  weekStarts,
  editingCell,
  editValue,
  onCellEdit,
  onCellSave,
  onCellCancel,
  onEditValueChange,
  onMetricConfiguration,
  formatValue,
  getValueColor,
  getOwnerInitials,
  highlightedWeek,
  isSelected,
  onDelete,
  canReorder = false,
  ...otherProps
}) => {
  // Since drag and drop is removed, always render the regular MetricRow
  return (
    <MetricRow
      metric={metric}
      managementMode={managementMode}
      selectedTeam={selectedTeam}
      weekStarts={weekStarts}
      editingCell={editingCell}
      editValue={editValue}
      onCellEdit={onCellEdit}
      onCellSave={onCellSave}
      onCellCancel={onCellCancel}
      onEditValueChange={onEditValueChange}
      onMetricConfiguration={onMetricConfiguration}
      formatValue={formatValue}
      getValueColor={getValueColor}
      getOwnerInitials={getOwnerInitials}
      highlightedWeek={highlightedWeek}
      isSelected={isSelected}
      onDelete={onDelete}
      {...otherProps}
    />
  );
};

// Memoize to prevent re-renders when parent state changes but this row's props are stable
export const DraggableMetricRow = memo(DraggableMetricRowComponent, (prevProps, nextProps) => {
  // Compare stable props - skip function references as they're typically stable via useCallback
  return (
    prevProps.metric === nextProps.metric &&
    prevProps.weekStarts === nextProps.weekStarts &&
    prevProps.editingCell === nextProps.editingCell &&
    prevProps.editValue === nextProps.editValue &&
    prevProps.highlightedWeek === nextProps.highlightedWeek &&
    prevProps.managementMode === nextProps.managementMode &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.selectedTeam === nextProps.selectedTeam
  );
});
