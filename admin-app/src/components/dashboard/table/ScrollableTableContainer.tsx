
import React from 'react';
import { TableContainer } from './TableContainer';

interface ScrollableTableContainerProps {
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
  canReorder?: boolean;
  onOwnershipChange?: () => void;
}

export const ScrollableTableContainer: React.FC<ScrollableTableContainerProps> = ({
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
  canReorder = false,
  onOwnershipChange,
}) => {
  return (
    <div className="overflow-auto max-h-[calc(100vh-300px)] border rounded-lg">
      <table className="w-full border-collapse">
        <TableContainer
          localMetrics={localMetrics}
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
          highlightedWeek={highlightedWeek}
          allSelected={allSelected}
          someSelected={someSelected}
          canReorder={canReorder}
          onOwnershipChange={onOwnershipChange}
        />
      </table>
    </div>
  );
};
