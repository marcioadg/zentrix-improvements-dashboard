
import React, { memo } from 'react';
import { Team } from '@/lib/supabase';
import { UserSettings } from '@/hooks/useUserSettings';
import { useMetricsPageLogic } from '@/hooks/useMetricsPageLogic';
import { useMetricsPageHandlers } from '@/hooks/useMetricsPageHandlers';
import { useMetricsPageData } from '@/hooks/useMetricsPageData';
import { MetricsPageLayout } from '@/components/dashboard/MetricsPageLayout';
import { filterMetrics } from '@/utils/metricsPageHelpers';
import { useWeekStartMigration } from '@/hooks/useWeekStartMigration';
import { logger } from '@/utils/logger';

interface MetricsPageContentProps {
  teams: Team[];
  selectedTeam: string;
  setSelectedTeam: (teamId: string) => void;
  userSettings: UserSettings;
  updateMetricsSettings: (updates: Partial<UserSettings>) => Promise<boolean>;
}

export const MetricsPageContent: React.FC<MetricsPageContentProps> = memo(({
  teams,
  selectedTeam,
  setSelectedTeam,
  userSettings,
  updateMetricsSettings,
}) => {
  logger.debug('MetricsPageContent render', { 
    hasSelectedTeam: !!selectedTeam
  });

  const {
    timePeriod,
    setTimePeriod,
    customRange,
    editingCell,
    setEditingCell,
    editValue,
    setEditValue,
    managementMode,
    setManagementMode,
    selectedMetrics,
    setSelectedMetrics,
    searchText,
    setSearchText,
    showCurrentWeek,
    setShowCurrentWeek,
    highlightCurrentWeek,
    setHighlightCurrentWeek,
    showAddMetricModal,
    setShowAddMetricModal,
    clearAllTransientState,
  } = useMetricsPageLogic(userSettings);

  const {
    handleAddMetric,
    handleOpenAddMetricModal,
    handleCloseAddMetricModal,
    handleTeamChange,
    handleTimePeriodChange,
    handleShowCurrentWeekChange,
    handleHighlightCurrentWeekChange,
  } = useMetricsPageHandlers({
    addMetric: () => Promise.resolve(), // Will be replaced by actual addMetric from data hook
    setShowAddMetricModal,
    setSelectedTeam,
    clearAllTransientState,
    setTimePeriod,
    updateMetricsSettings,
    showCurrentWeek,
    setShowCurrentWeek,
    highlightCurrentWeek,
    setHighlightCurrentWeek,
  });

  const {
    metrics,
    loading,
    error,
    weekStarts,
    retryCount,
    canRetry,
    weekStartDay,
    addMetric,
    handleCellEdit,
    handleCellSave,
    handleCellCancel,
    handleEditValueChange,
    handleMetricSelect,
    handleSelectAll,
    handleDeleteMetric,
    handleBulkDelete,
    handleRetry,
    handleMetricConfiguration,
    formatValue,
    formatWeekDate,
    getValueColor,
    getOwnerInitials,
  } = useMetricsPageData(
    selectedTeam,
    timePeriod,
    customRange,
    editingCell,
    editValue,
    setEditingCell,
    setEditValue,
    selectedMetrics,
    setSelectedMetrics
  );

  // Pass refetch function to migration hook
  const { isMigrating, changeWeekStartDay } = useWeekStartMigration(() => {
    // Trigger data refetch after migration
    handleRetry();
  });

  // Update handlers with actual addMetric function
  const finalHandleAddMetric = React.useCallback(async (metricData: any) => {
    await handleAddMetric({ ...metricData, addMetric });
  }, [handleAddMetric, addMetric]);

  const filteredMetrics = filterMetrics(metrics, searchText);

  return (
    <MetricsPageLayout
      teams={teams}
      selectedTeam={selectedTeam}
      onTeamChange={handleTeamChange}
      timePeriod={timePeriod}
      onTimePeriodChange={handleTimePeriodChange}
      managementMode={managementMode}
      onManagementModeToggle={() => setManagementMode(!managementMode)}
      selectedMetrics={selectedMetrics}
      onBulkDelete={handleBulkDelete}
      searchText={searchText}
      onSearchChange={setSearchText}
      showCurrentWeek={showCurrentWeek}
      highlightCurrentWeek={highlightCurrentWeek}
      onShowCurrentWeekChange={handleShowCurrentWeekChange}
      onHighlightCurrentWeekChange={handleHighlightCurrentWeekChange}
      onWeekStartDayChange={changeWeekStartDay}
      onAddMetric={handleOpenAddMetricModal}
      filteredMetrics={filteredMetrics}
      weekStarts={weekStarts}
      editingCell={editingCell}
      editValue={editValue}
      onCellEdit={handleCellEdit}
      onCellSave={handleCellSave}
      onCellCancel={handleCellCancel}
      onEditValueChange={handleEditValueChange}
      onMetricConfiguration={handleMetricConfiguration}
      formatValue={formatValue}
      formatWeekDate={formatWeekDate}
      getValueColor={getValueColor}
      getOwnerInitials={getOwnerInitials}
      weekStartDay={weekStartDay}
      onMetricSelect={handleMetricSelect}
      onSelectAll={handleSelectAll}
      onDeleteMetric={handleDeleteMetric}
      error={error}
      loading={loading}
      onRetry={handleRetry}
      canRetry={canRetry}
      retryCount={retryCount}
      showAddMetricModal={showAddMetricModal}
      onCloseAddMetricModal={handleCloseAddMetricModal}
      onHandleAddMetric={finalHandleAddMetric}
    />
  );
});
