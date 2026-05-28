
import React from 'react';
import { TableHeader } from './TableHeader';
import { TableBody } from './TableBody';

interface TableContainerProps {
  localMetrics: any[];
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
  highlightedWeek: string | null;
  allSelected: boolean;
  someSelected: boolean;
  onEditTarget?: (metricId: string, weekStart: string) => void;
  canReorder?: boolean;
  onOwnershipChange?: () => void;
}

export const TableContainer: React.FC<TableContainerProps> = ({
  localMetrics,
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
  highlightedWeek,
  allSelected,
  someSelected,
  onEditTarget,
  canReorder = false,
  onOwnershipChange,
}) => {
  return (
    <>
      <TableHeader
        managementMode={managementMode}
        weekStarts={weekStarts}
        formatWeekDate={formatWeekDate}
        highlightedWeek={highlightedWeek}
        allSelected={allSelected}
        someSelected={someSelected}
        onSelectAll={onSelectAll}
      />
      <TableBody
        localMetrics={localMetrics}
        managementMode={managementMode}
        selectedMetrics={selectedMetrics}
        onMetricSelect={onMetricSelect}
        onDeleteMetric={onDeleteMetric}
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
        highlightedWeek={highlightedWeek}
        onEditTarget={onEditTarget}
        canReorder={canReorder}
        onOwnershipChange={onOwnershipChange}
      />
    </>
  );
};
