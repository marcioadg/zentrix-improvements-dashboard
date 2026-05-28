import React, { useMemo } from 'react';
import { WeeklyMetricCell } from './WeeklyMetricCell';
import { useMetricsPermissions } from '@/hooks/useMetricsPermissions';

interface OptimizedPermissionAwareWeeklyMetricCellProps {
  metric: any;
  weekStart: string;
  editingCell: string | null;
  editValue: string;
  onCellEdit: (metricId: string, weekStart: string, currentValue: number | null) => void;
  onCellSave: (metricId: string, weekStart: string) => void;
  onCellCancel: () => void;
  onEditValueChange: (value: string) => void;
  formatValue: (value: number, unit: string) => string;
  getValueColor: (value: number, metric: any) => string;
  highlightedWeek?: string;
  onCreateIssue?: (title: string, description: string, ownerId?: string) => void;
  // Pre-computed permissions passed from parent
  canEdit: boolean;
}

export const OptimizedPermissionAwareWeeklyMetricCell: React.FC<OptimizedPermissionAwareWeeklyMetricCellProps> = ({
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
  canEdit,
}) => {
  // Create a permission-aware wrapper for onCellEdit
  const handleCellEdit = (metricId: string, weekStart: string, currentValue: number | null) => {
    if (canEdit) {
      onCellEdit(metricId, weekStart, currentValue);
    }
  };

  const cellKey = `${metric.id}-${weekStart}`;
  const isHighlighted = highlightedWeek === weekStart;
  
  return (
    <div 
      className={`${isHighlighted ? 'bg-primary/10 border-l-4 border-l-primary' : ''}`}
      style={{ cursor: canEdit ? 'pointer' : 'default' }}
    >
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
    </div>
  );
};