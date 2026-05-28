
import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { useWeeklyMetrics } from '@/hooks/useWeeklyMetrics';
import { useMetricsPageState } from '@/hooks/useMetricsPageState';
import { useMetricsPageHandlers } from '@/components/dashboard/optimized/MetricsPageHandlers';
import { useUnifiedOptimisticMetrics } from '@/hooks/useUnifiedOptimisticMetrics';
import { MetricsPageControls } from '@/components/dashboard/optimized/MetricsPageControls';
import { WeeklyMetricsTable } from '@/components/dashboard/WeeklyMetricsTable';
import { MetricConfigurationModal } from '@/components/modals/MetricConfigurationModal';
import { MinimalAddMetricsModal } from '@/components/modals/MetricManagementModal';
import { EmptyMetricsState } from '@/components/dashboard/EmptyMetricsState';
import { useToast } from '@/hooks/use-toast';
import { useSimpleIssues } from '@/hooks/useSimpleIssues';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { getCurrentWeekStart } from '@/lib/weekUtils';
import { useWeekStartMigration } from '@/hooks/useWeekStartMigration';
import { logger } from '@/utils/logger';

interface Team {
  id: string;
  name: string;
  company_id: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface OptimizedMetricsPageContentProps {
  teams: Team[];
  selectedTeam: string;
  setSelectedTeam: (teamId: string) => void;
  userSettings: any;
  updateMetricsSettings: (settings: any) => Promise<void>;
  settingsLoading: boolean;
}

export const OptimizedMetricsPageContent: React.FC<OptimizedMetricsPageContentProps> = memo(({
  teams,
  selectedTeam,
  setSelectedTeam,
  userSettings,
  updateMetricsSettings,
  settingsLoading,
}) => {
  const { toast } = useToast();

  logger.log('🚀 OptimizedMetricsPageContent: Rendering with unified optimistic system', {
    selectedTeam,
    teamsCount: teams.length,
    timestamp: new Date().toISOString()
  });

  // Initialize page state with unified cleanup
  const pageState = useMetricsPageState(userSettings);

  // Get base metrics data
  const metricsResult = useWeeklyMetrics(selectedTeam, pageState.timePeriod, pageState.customRange, userSettings?.week_start_day);
  const {
    metrics = [],
    loading = false,
    error = null,
    updateMetric,
    updateMetricConfiguration,
    addMetric,
    removeMetric,
    bulkRemoveMetrics,
    getLast13WeeksStartDates,
    formatWeekDate,
    getValueColor,
    formatValue,
    refetch,
    // 🎯 FIX: Remove 'sunday' default - let it be undefined until settings load
    weekStartDay,
    retryCount = 0,
    canRetry = false,
    setMetrics
  } = metricsResult || {};

  // Get all week starts (13 weeks including current)
  const allWeekStarts = useMemo(() => {
    if (getLast13WeeksStartDates) {
      const weeks = getLast13WeeksStartDates();
      
      // Enhanced debugging for week calculation
      const currentWeekFromLib = getCurrentWeekStart(weekStartDay);
      const currentDate = new Date().toISOString().split('T')[0];
      
      // Week analysis complete
      
      return weeks;
    }
    return [];
  }, [getLast13WeeksStartDates, weekStartDay]);

  // Filter out current week if user setting is disabled
  const weekStarts = useMemo(() => {
    const showCurrentWeek = userSettings?.show_current_week;
    const filteredWeeks = showCurrentWeek ? allWeekStarts : allWeekStarts.slice(1);
    
    // Week filtering applied
    
    // Log the specific week that should be hidden
    if (!showCurrentWeek && allWeekStarts.length > 0) {
      const hiddenWeek = allWeekStarts[0];
      const hiddenWeekFormatted = formatWeekDate ? formatWeekDate(hiddenWeek) : 'Unknown format';
      logger.log('🔧 Week Being Hidden:', {
        hiddenWeekDate: hiddenWeek,
        hiddenWeekFormatted,
        shouldBeHidden: !showCurrentWeek
      });
    }
    
    return filteredWeeks;
  }, [userSettings?.show_current_week, allWeekStarts, formatWeekDate, weekStartDay, settingsLoading]);

  // UNIFIED: Single unified optimistic metrics system
  const {
    processMetrics,
    handleOwnershipChange,
    isMetricSyncing,
    handleAddMetricsToTable,
    addingMetrics,
    clearAllOptimisticState,
    performEmergencyCleanup,
    getHealthStatus
  } = useUnifiedOptimisticMetrics(selectedTeam, teams, weekStarts);

  // Issue creation system
  const { addIssue } = useSimpleIssues(selectedTeam, undefined, undefined, undefined, { silent: true });

  // Modal state
  const [showMetricManagementModal, setShowMetricManagementModal] = React.useState(false);

  // UNIFIED: Process metrics with strict deduplication
  const processedMetrics = useMemo(() => {
    logger.log('🔧 OptimizedMetricsPageContent: Processing metrics with unified system', {
      originalCount: metrics.length,
      healthStatus: getHealthStatus()
    });

    const result = processMetrics(metrics);
    
    logger.log('✅ OptimizedMetricsPageContent: Metrics processed successfully', {
      finalCount: result.length,
      noDuplicates: true
    });

    return result;
  }, [metrics, processMetrics, getHealthStatus]);

  // UNIFIED: Team change handler with comprehensive state cleanup
  const handleTeamChange = useCallback((teamId: string) => {
    logger.log('🔄 OptimizedMetricsPageContent: Team change with unified cleanup', {
      from: selectedTeam,
      to: teamId
    });

    // Clear all optimistic state
    clearAllOptimisticState();
    pageState.clearAllTransientState();
    
    // Clear modals
    pageState.closeMetricConfigModal();
    setShowMetricManagementModal(false);
    
    // Change team
    setSelectedTeam(teamId);

    logger.log('✅ OptimizedMetricsPageContent: Team change completed with unified cleanup');
  }, [selectedTeam, setSelectedTeam, clearAllOptimisticState, pageState]);

  // UNIFIED: Optimistic ownership change handler
  const handleOwnershipChangeWithBackend = useCallback(async (
    metricId: string,
    currentOwnerId: string | null,
    currentOwnerName: string,
    newOwnerId: string | null,
    newOwnerName: string
  ): Promise<boolean> => {
    logger.log('🔧 OptimizedMetricsPageContent: Unified ownership change', {
      metricId,
      from: { id: currentOwnerId, name: currentOwnerName },
      to: { id: newOwnerId, name: newOwnerName }
    });
    
    try {
      const success = await handleOwnershipChange(
        metricId,
        currentOwnerId,
        currentOwnerName,
        newOwnerId,
        newOwnerName
      );

      if (success) {
        // Update backend
        await updateMetricConfiguration(metricId, {
          owner_id: newOwnerId
        });
      }

      return success;
    } catch (error) {
      logger.error('❌ OptimizedMetricsPageContent: Unified ownership change failed:', error);
      return false;
    }
  }, [handleOwnershipChange, updateMetricConfiguration]);

  // Issue creation handler
  const handleCreateIssue = useCallback(async (title: string, description: string, ownerId?: string) => {
    logger.log('🔧 OptimizedMetricsPageContent: Creating issue with metric owner', { title, description, ownerId });
    
    try {
      const success = await addIssue(title, description, 'short_term', ownerId);
      
      if (success) {
        toast({
          title: "Issue Created",
          description: `Issue "${title}" has been created successfully.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create issue. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      logger.error('Error creating issue:', error);
      toast({
        title: "Error",
        description: "Failed to create issue. Please try again.",
        variant: "destructive"
      });
    }
  }, [addIssue, toast]);

  // Modal handlers
  const handleMetricConfigSave = useCallback(async (config: any) => {
    if (pageState.selectedMetricForConfig) {
      await updateMetricConfiguration(pageState.selectedMetricForConfig.id, config);
    }
  }, [updateMetricConfiguration, pageState.selectedMetricForConfig]);

  // Management mode toggle handler
  const handleManagementModeToggle = useCallback(() => {
    pageState.setManagementMode(!pageState.managementMode);
  }, [pageState]);

  // Initialize handlers with processed metrics (without drag reorder)
  const handlers = useMetricsPageHandlers(
    updateMetric,
    removeMetric,
    bulkRemoveMetrics,
    updateMetricConfiguration,
    pageState.editingCell,
    pageState.editValue,
    pageState.setEditingCell,
    pageState.setEditValue,
    pageState.selectedMetrics,
    pageState.setSelectedMetrics,
    processedMetrics, // Use processed metrics instead of raw metrics
    setMetrics,
    pageState.openMetricConfigModal,
    refetch
  );

  // Migration hook with refetch callback
  const { isMigrating, changeWeekStartDay } = useWeekStartMigration(() => {
    // Trigger data refetch after migration
    refetch();
  });

  // Apply search filter to processed metrics
  const filteredMetrics = useMemo(() => {
    if (!pageState.searchText) return processedMetrics;
    
    const searchLower = pageState.searchText.toLowerCase();
    return processedMetrics.filter(metric => 
      metric.metric_name.toLowerCase().includes(searchLower) ||
      (metric.owner && metric.owner.toLowerCase().includes(searchLower))
    );
  }, [processedMetrics, pageState.searchText]);

  // Convert metrics for modal compatibility
  const currentTableMetricsForModal = useMemo(() => {
    return filteredMetrics.map(metric => ({
      id: metric.id,
      metric_name: metric.metric_name,
      owner_id: metric.owner_id,
      owner_name: metric.owner || 'Unknown',
      owner_avatar_url: metric.owner_avatar_url || '',
      team_id: metric.team_id || selectedTeam,
      team_name: teams.find(t => t.id === (metric.team_id || selectedTeam))?.name || 'Unknown Team',
      company_id: teams.find(t => t.id === (metric.team_id || selectedTeam))?.company_id || '',
      unit: metric.unit || '',
      target_value: metric.target_value || 0,
      latest_value: metric.metric_value || 0,
      updated_at: metric.updated_at || new Date().toISOString()
    }));
  }, [filteredMetrics, selectedTeam, teams]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      logger.log('🧹 OptimizedMetricsPageContent: Component unmounting, unified cleanup');
      clearAllOptimisticState();
    };
  }, [clearAllOptimisticState]);

  // Enhanced logging for settings changes
  useEffect(() => {
    logger.log('🔧 Settings Update Debug:', {
      userSettings,
      showCurrentWeek: userSettings?.show_current_week,
      weekStartDay: userSettings?.week_start_day,
      settingsLoading,
      timestamp: new Date().toISOString()
    });
  }, [userSettings, settingsLoading]);

  // Show empty state if no metrics
  if (!loading && filteredMetrics.length === 0 && !error) {
    return <EmptyMetricsState />;
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <MetricsPageControls
        teams={teams}
        selectedTeam={selectedTeam}
        onTeamChange={handleTeamChange}
        timePeriod={pageState.timePeriod}
        onTimePeriodChange={pageState.setTimePeriod}
        managementMode={pageState.managementMode}
        onManagementModeToggle={handleManagementModeToggle}
        selectedMetrics={pageState.selectedMetrics}
        onBulkDelete={handlers.handleBulkDelete}
        searchText={pageState.searchText}
        onSearchChange={pageState.setSearchText}
        showCurrentWeek={userSettings?.show_current_week || false}
        highlightCurrentWeek={userSettings?.highlight_current_week || false}
        weekStartDay={userSettings?.week_start_day || 'sunday'}
        onShowCurrentWeekChange={(show: boolean) => updateMetricsSettings({ show_current_week: show })}
        onHighlightCurrentWeekChange={(highlight: boolean) => updateMetricsSettings({ highlight_current_week: highlight })}
        onWeekStartDayChange={changeWeekStartDay}
        onAddMetric={() => setShowMetricManagementModal(true)}
      />

      {/* Loading indicator for new metrics */}
      {addingMetrics && (
        <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-primary">Adding metrics to team...</span>
          </div>
        </div>
      )}

      {/* Metrics table */}
      {(!error || filteredMetrics.length > 0) && (
        <WeeklyMetricsTable
          filteredMetrics={filteredMetrics}
          weekStarts={weekStarts}
          formatWeekDate={formatWeekDate}
          getValueColor={getValueColor}
          formatValue={formatValue}
          editingCell={pageState.editingCell}
          editValue={pageState.editValue}
          managementMode={pageState.managementMode}
          selectedMetrics={pageState.selectedMetrics}
          onCellEdit={handlers.handleCellEdit}
          onCellSave={handlers.handleCellSave}
          onCellCancel={handlers.handleCellCancel}
          onEditValueChange={handlers.handleEditValueChange}
          onDeleteMetric={handlers.handleDeleteMetric}
          onMetricSelect={handlers.handleMetricSelect}
          onSelectAll={handlers.handleSelectAll}
          onMetricConfiguration={handlers.handleMetricConfiguration}
          weekStartDay={weekStartDay}
          showCurrentWeek={userSettings?.show_current_week || false}
          highlightCurrentWeek={userSettings?.highlight_current_week || false}
          getOwnerInitials={(name: string) => name.split(' ').map(part => part[0]).join('').toUpperCase()}
          selectedTeam={selectedTeam}
          optimisticOwnershipHandler={handleOwnershipChangeWithBackend}
          isMetricSyncing={isMetricSyncing}
          onCreateIssue={handleCreateIssue}
        />
      )}

      {/* Modals - conditionally rendered to prevent expensive hook calls when closed */}
      {pageState.showMetricConfigModal && (
        <MetricConfigurationModal
          open={pageState.showMetricConfigModal}
          onOpenChange={pageState.closeMetricConfigModal}
          metric={pageState.selectedMetricForConfig}
          onSave={handleMetricConfigSave}
        />
      )}

      {showMetricManagementModal && (
        <MinimalAddMetricsModal
          open={showMetricManagementModal}
          onOpenChange={setShowMetricManagementModal}
          onMetricsChanged={(targetTeamIds) => {
            if (targetTeamIds.includes(selectedTeam)) {
              refetch();
            }
          }}
          currentTableMetrics={currentTableMetricsForModal}
          teams={teams}
        />
      )}
    </div>
  );
});

OptimizedMetricsPageContent.displayName = 'OptimizedMetricsPageContent';
