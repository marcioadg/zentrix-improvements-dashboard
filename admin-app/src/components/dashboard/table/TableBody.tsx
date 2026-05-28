
import React from 'react';
import { MetricRow } from '../MetricRow';
import { DraggableMetricRow } from '../DraggableMetricRow';

interface TableBodyProps {
  localMetrics: any[];
  managementMode: boolean;
  selectedMetrics: string[];
  onMetricSelect: (metricId: string, selected: boolean) => void;
  onDeleteMetric: (metric: any) => void;
  weekStarts: string[];
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
  highlightedWeek: string | null;
  onEditTarget?: (metricId: string, weekStart: string) => void;
  canReorder?: boolean;
  onOwnershipChange?: () => void;
}

export const TableBody: React.FC<TableBodyProps> = ({
  localMetrics,
  managementMode,
  selectedMetrics,
  onMetricSelect,
  onDeleteMetric,
  weekStarts,
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
  highlightedWeek,
  onEditTarget,
  canReorder = false,
  onOwnershipChange,
}) => {
  return (
    <tbody className="[&_tr:last-child]:border-0">
      {localMetrics.map((metric, index) => {
        const uniqueKey = `${metric.metric_name}-${metric.owner_id}`;
        
        const commonProps = {
          metric,
          weekStarts,
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
          highlightedWeek,
          managementMode,
          isSelected: selectedMetrics.includes(metric.id),
          onSelect: (selected: boolean) => onMetricSelect(metric.id, selected),
          onDelete: () => onDeleteMetric(metric),
          canReorder,
          onOwnershipChange,
        };

        return managementMode ? (
          <MetricRow key={uniqueKey} {...commonProps} />
        ) : (
          <DraggableMetricRow key={uniqueKey} {...commonProps} />
        );
      })}
    </tbody>
  );
};
