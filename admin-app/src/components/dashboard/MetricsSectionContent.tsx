
import React from 'react';
import { WeeklyMetricsTable } from './WeeklyMetricsTable';
import { useMetricsSectionHandlers } from './MetricsSectionHandlers';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { logger } from '@/utils/logger';

interface MetricsSectionContentProps {
  filteredMetrics: WeeklyMetricWithOwner[];
  weekStarts: string[];
  editingCell: string | null;
  setEditingCell: (cellKey: string | null) => void;
  editValue: string;
  setEditValue: (value: string) => void;
  updateMetric: (metricId: string, weekStart: string, value: number | null) => Promise<void>;
  onMetricConfiguration: (metric: any) => void;
  formatValue: (value: number | null, unit: string) => string;
  formatWeekDate: (weekStart: string) => string;
  getValueColor: (value: number | null, metric: any) => string;
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

export const MetricsSectionContent: React.FC<MetricsSectionContentProps> = ({
  filteredMetrics,
  weekStarts,
  editingCell,
  setEditingCell,
  editValue,
  setEditValue,
  updateMetric,
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
  logger.log('🔧 MetricsSectionContent - Rendering with handlers:', {
    hasUpdateMetric: !!updateMetric,
    editingCell,
    editValue,
    metricsCount: filteredMetrics.length,
    weekStarts
  });

  const {
    handleCellEdit,
    handleCellSave,
    handleCellCancel,
    handleEditValueChange,
  } = useMetricsSectionHandlers({
    metrics: filteredMetrics,
    updateMetric,
    editingCell,
    setEditingCell,
    editValue,
    setEditValue,
  });

  return (
    <WeeklyMetricsTable
      filteredMetrics={filteredMetrics}
      weekStarts={weekStarts}
      editingCell={editingCell}
      editValue={editValue}
      onCellEdit={handleCellEdit}
      onCellSave={handleCellSave}
      onCellCancel={handleCellCancel}
      onEditValueChange={handleEditValueChange}
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
