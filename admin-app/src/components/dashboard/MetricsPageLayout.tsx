
import React from 'react';
import { MetricsErrorRecovery } from '@/components/dashboard/MetricsErrorRecovery';
import { MetricsPageControls } from '@/components/dashboard/optimized/MetricsPageControls';
import { MetricsTableContainer } from '@/components/dashboard/MetricsTableContainer';
import { AddMetricModal } from '@/components/modals/AddMetricModal';
import { Team } from '@/lib/supabase';

interface MetricsPageLayoutProps {
  teams: Team[];
  selectedTeam: string;
  onTeamChange: (teamId: string) => void;
  timePeriod: string;
  onTimePeriodChange: (period: string) => void;
  managementMode: boolean;
  onManagementModeToggle: () => void;
  selectedMetrics: string[];
  onBulkDelete: () => void;
  searchText: string;
  onSearchChange: (text: string) => void;
  showCurrentWeek: boolean;
  highlightCurrentWeek: boolean;
  weekStartDay: 'monday' | 'sunday';
  onShowCurrentWeekChange: (show: boolean) => void;
  onHighlightCurrentWeekChange: (highlight: boolean) => void;
  onWeekStartDayChange: (weekStartDay: 'monday' | 'sunday') => void;
  onAddMetric: () => void;
  filteredMetrics: any[];
  weekStarts: string[];
  editingCell: string | null;
  editValue: string;
  onCellEdit: (metricId: string, weekStart: string, currentValue: number | null) => void;
  onCellSave: (metricId: string, weekStart: string) => void;
  onCellCancel: () => void;
  onEditValueChange: (value: string) => void;
  onMetricConfiguration: (metric: any) => void;
  formatValue: (value: number | null, unit: string) => string;
  formatWeekDate: (date: string) => string;
  getValueColor: (value: number | null, target: number | null, logic: string | null) => string;
  getOwnerInitials: (name: string) => string;
  onMetricSelect: (metricId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onDeleteMetric: (metric: any) => void;
  error: string | null;
  loading: boolean;
  onRetry: () => void;
  canRetry: boolean;
  retryCount: number;
  showAddMetricModal: boolean;
  onCloseAddMetricModal: (open: boolean) => void;
  onHandleAddMetric: (metricData: any) => void;
}

export const MetricsPageLayout: React.FC<MetricsPageLayoutProps> = ({
  teams,
  selectedTeam,
  onTeamChange,
  timePeriod,
  onTimePeriodChange,
  managementMode,
  onManagementModeToggle,
  selectedMetrics,
  onBulkDelete,
  searchText,
  onSearchChange,
  showCurrentWeek,
  highlightCurrentWeek,
  onShowCurrentWeekChange,
  onHighlightCurrentWeekChange,
  onWeekStartDayChange,
  onAddMetric,
  filteredMetrics,
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
  weekStartDay,
  onMetricSelect,
  onSelectAll,
  onDeleteMetric,
  error,
  loading,
  onRetry,
  canRetry,
  retryCount,
  showAddMetricModal,
  onCloseAddMetricModal,
  onHandleAddMetric,
}) => {
  // Create a wrapper function to match the expected signature for MetricsTableContainer
  const getValueColorWrapper = (value: number | null, metric: any) => {
    return getValueColor(value, metric?.target_value || null, metric?.target_logic || null);
  };

  // Create an async wrapper for the add metric handler
  const handleAddMetricAsync = async (metricData: any) => {
    onHandleAddMetric(metricData);
  };

  return (
    <div className="space-y-6">
      <MetricsErrorRecovery
        error={error}
        loading={loading}
        onRetry={onRetry}
        canRetry={canRetry}
        retryCount={retryCount}
      />

      <MetricsPageControls
        teams={teams}
        selectedTeam={selectedTeam}
        onTeamChange={onTeamChange}
        timePeriod={timePeriod}
        onTimePeriodChange={onTimePeriodChange}
        managementMode={managementMode}
        onManagementModeToggle={onManagementModeToggle}
        selectedMetrics={selectedMetrics}
        onBulkDelete={onBulkDelete}
        searchText={searchText}
        onSearchChange={onSearchChange}
        showCurrentWeek={showCurrentWeek}
        highlightCurrentWeek={highlightCurrentWeek}
        weekStartDay={weekStartDay}
        onShowCurrentWeekChange={onShowCurrentWeekChange}
        onHighlightCurrentWeekChange={onHighlightCurrentWeekChange}
        onWeekStartDayChange={onWeekStartDayChange}
        onAddMetric={onAddMetric}
      />

      <MetricsTableContainer
        metrics={filteredMetrics}
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
        getValueColor={getValueColorWrapper}
        getOwnerInitials={getOwnerInitials}
        selectedTeam={selectedTeam}
        showCurrentWeek={showCurrentWeek}
        highlightCurrentWeek={highlightCurrentWeek}
        weekStartDay={weekStartDay as 'monday' | 'sunday'}
        managementMode={managementMode}
        selectedMetrics={selectedMetrics}
        onMetricSelect={onMetricSelect}
        onSelectAll={onSelectAll}
        onDeleteMetric={onDeleteMetric}
      />

      <AddMetricModal
        open={showAddMetricModal}
        onOpenChange={onCloseAddMetricModal}
        onAdd={handleAddMetricAsync}
        defaultTeamId={selectedTeam}
      />
    </div>
  );
};
