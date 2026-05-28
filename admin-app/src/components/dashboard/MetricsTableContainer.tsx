
import React from 'react';
import { WeeklyMetricsTable } from './WeeklyMetricsTable';
import { EmptyMetricsState } from './EmptyMetricsState';
import { logger } from '@/utils/logger';

interface MetricsTableContainerProps {
  metrics: any[];
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
  managementMode: boolean;
  selectedMetrics: string[];
  onMetricSelect: (metricId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onDeleteMetric: (metric: any) => void;
}

export const MetricsTableContainer: React.FC<MetricsTableContainerProps> = ({
  metrics,
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
  managementMode,
  selectedMetrics,
  onMetricSelect,
  onSelectAll,
  onDeleteMetric,
}) => {
  // Add safety check for undefined metrics
  if (!metrics || metrics.length === 0) {
    return <EmptyMetricsState />;
  }

  logger.log('MetricsTableContainer - editingCell:', editingCell, 'editValue:', editValue);
  logger.log('MetricsTableContainer - onCellEdit type:', typeof onCellEdit);
  logger.log('MetricsTableContainer - weekStarts:', weekStarts);

  return (
    <WeeklyMetricsTable
      filteredMetrics={metrics}
      weekStarts={weekStarts}
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
    />
  );
};
