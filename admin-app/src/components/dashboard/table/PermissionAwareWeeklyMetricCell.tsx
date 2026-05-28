
import React from 'react';
import { WeeklyMetricCell } from './WeeklyMetricCell';
import { useMetricsPermissions } from '@/hooks/useMetricsPermissions';

interface PermissionAwareWeeklyMetricCellProps {
  metric: any;
  weekStart: string;
  editingCell: string | null;
  editValue: string;
  onCellEdit: (metricId: string, weekStart: string, currentValue: number | null) => void;
  onCellSave: (metricId: string, weekStart: string) => void;
  onCellCancel: () => void;
  onEditValueChange: (value: string) => void;
  formatValue: (value: number, unit: string) => string;
  getValueColor: (value: number, metric: any, weekStart?: string) => string;
  highlightedWeek?: string;
  onCreateIssue?: (title: string, description: string, ownerId?: string) => void;
}

export const PermissionAwareWeeklyMetricCell: React.FC<PermissionAwareWeeklyMetricCellProps> = ({
  metric,
  weekStart,
  editingCell,
  editValue,
  onCellEdit,
  onCellSave,
  onCellCancel,
  onEditValueChange,
  formatValue,
  getValueColor,
  highlightedWeek,
  onCreateIssue,
}) => {
  const { canEditMetricValue } = useMetricsPermissions(metric.team_id);
  const canEdit = canEditMetricValue(metric);

  // Create a permission-aware wrapper for onCellEdit
  const handleCellEdit = (metricId: string, weekStart: string, currentValue: number | null) => {
    if (!canEdit) {
      return;
    }
    onCellEdit(metricId, weekStart, currentValue);
  };

  if (!canEdit) {
    // If user can't edit, show a read-only cell
    const currentValue = metric.weeklyValues?.[weekStart] ?? null;
    const displayValue = currentValue !== null && currentValue !== undefined ? formatValue(currentValue, metric.unit) : '-';
    const valueColor = currentValue !== null && currentValue !== undefined ? getValueColor(currentValue, metric, weekStart) : '';
    
    return (
      <div 
        className={`px-3 py-2 rounded min-w-[120px] text-center ${valueColor}`}
        title="Read-only: Insufficient permissions to edit"
      >
        {displayValue}
      </div>
    );
  }

  // If user can edit, render the normal WeeklyMetricCell
  return (
    <WeeklyMetricCell
      metric={metric}
      weekStart={weekStart}
      editingCell={editingCell}
      editValue={editValue}
      onCellEdit={handleCellEdit}
      onCellSave={onCellSave}
      onCellCancel={onCellCancel}
      onEditValueChange={onEditValueChange}
      formatValue={formatValue}
      getValueColor={getValueColor}
    />
  );
};
