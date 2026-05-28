
import React, { useMemo, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WeeklyMetricsTable } from '@/components/dashboard/WeeklyMetricsTable';
import { useWeeklyMetrics } from '@/hooks/useWeeklyMetrics';
import { useMetricsCellEditing } from '@/hooks/useMetricsCellEditing';
import { useMetricsPermissions } from '@/hooks/useMetricsPermissions';
import { useTeamMembersCacheInvalidation } from '@/hooks/useTeamMembersCache';
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';
import { MetricConfigurationModal } from '@/components/modals/MetricConfigurationModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { markMetricArchiving } from '@/hooks/useMetricsRealtime';
import { logger } from '@/utils/logger';
import { getOwnerInitials } from '@/utils/metricUtils';

interface OptimizedMeetingMetricsProps {
  teamId: string;
  userSettings: any;
}

const getOwnerInitialsStable = getOwnerInitials;

const noopAsync = async () => {};
const noop = () => {};

export const OptimizedMeetingMetrics: React.FC<OptimizedMeetingMetricsProps> = ({
  teamId,
  userSettings
}) => {
  // Add state management for editing and configuration
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [configMetric, setConfigMetric] = useState<WeeklyMetricWithOwner | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // 🚀 PHASE 2 OPTIMIZATION: Enable real-time cache invalidation for team members
  useTeamMembersCacheInvalidation();

  // ✅ MEETING FIX: Detect if we're in a meeting to optimize real-time behavior
  const { meetingId, currentRole } = useNewMeetingTimer();
  const isInMeeting = !!meetingId;

  // Get metrics data with simplified hook usage
  // ✅ Pass isInMeeting flag to optimize real-time behavior during meetings
  const metricsResult = useWeeklyMetrics(teamId, 'last_13_weeks', undefined, undefined, isInMeeting);
  
  // Pass meetingRole so useMetricsPermissions doesn't subscribe to timer context itself
  const permissions = useMetricsPermissions(teamId, currentRole);
  
  const {
    metrics = [],
    setMetrics,
    loading = false,
    error = null,
    updateMetric,
    updateMetricConfiguration,
    removeMetric,
    deleteMetricFromAllTeams,
    getLast13WeeksStartDates,
    formatWeekDate,
    getValueColor,
    formatValue,
    weekStartDay,
    refetch
  } = metricsResult || {};

  // ✅ SIMPLIFIED: All metric cell sync (value, custom_target, note) is now handled by
  // Postgres Changes via useMetricsRealtime. No broadcast layer needed.
  // This provides guaranteed consistency from the database as single source of truth.


  // Create a safe updateMetric wrapper that adds comprehensive logging
  const safeUpdateMetric = useCallback(async (metricId: string, weekStart: string, value: number | null) => {
    if (!updateMetric) {
      logger.error('❌ OptimizedMeetingMetrics - updateMetric is undefined! Cannot save metric.');
      throw new Error('updateMetric function is not available');
    }

    try {
      await updateMetric(metricId, weekStart, value);
    } catch (error) {
      logger.error('❌ Metric update failed:', error);
      throw error;
    }
  }, [updateMetric, teamId]);

  // Get week start dates with memoization
  const weekStarts = useMemo(() => {
    try {
      return getLast13WeeksStartDates ? getLast13WeeksStartDates() : [];
    } catch (err) {
      logger.error('Error getting week starts:', err);
      return [];
    }
  }, [getLast13WeeksStartDates]);

  // Cell editing hook - no broadcast needed, Postgres Changes handles sync via useMetricsRealtime
  const {
    handleCellEdit,
    handleCellSave,
    handleCellCancel,
    handleEditValueChange,
  } = useMetricsCellEditing(
    editingCell,
    editValue,
    setEditingCell,
    setEditValue,
    safeUpdateMetric
    // ✅ REMOVED: publishValueChange - Postgres Changes handles sync
  );

  // Configuration modal handlers
  const handleCloseConfigModal = useCallback(() => {
    setShowConfigModal(false);
    setConfigMetric(null);
  }, []);

  const handleSaveConfigModal = useCallback(async (config: any) => {
    // Handle archive action - optimistically remove from local state immediately
    if (config.action === 'archive') {
      const archivedMetricId = configMetric!.id;
      // ✅ FIX: Mark as pending to prevent duplicate removal from realtime listener
      markMetricArchiving(archivedMetricId);
      // Optimistically remove from local state for instant UI feedback
      setMetrics((prev: WeeklyMetricWithOwner[]) => 
        prev.filter(m => m.id !== archivedMetricId)
      );
      handleCloseConfigModal();
      return;
    }
    
    // Handle delete actions - close modal, delete in background
    if (config.action === 'delete_from_team') {
      handleCloseConfigModal();
      removeMetric(configMetric!.id);
      return;
    }
    
    if (config.action === 'delete_from_all_teams') {
      handleCloseConfigModal();
      deleteMetricFromAllTeams(configMetric!.metric_name, configMetric!.owner_id);
      return;
    }
    
    // Normal configuration updates - close modal IMMEDIATELY, save in background
    // Postgres Changes listener in useMetricsRealtime will sync the update to all users
    const metricId = configMetric!.id;
    handleCloseConfigModal();
    
    updateMetricConfiguration(metricId, config).catch(err => {
      logger.error('❌ Failed to save metric config:', err);
    });
  }, [configMetric?.id, configMetric?.metric_name, configMetric?.owner_id, updateMetricConfiguration, removeMetric, deleteMetricFromAllTeams, handleCloseConfigModal]);

  const emptySelection = useMemo(() => [] as string[], []);
  const handleMetricConfiguration = useCallback((metric: WeeklyMetricWithOwner) => {
    setConfigMetric(metric);
    setShowConfigModal(true);
  }, []);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Error loading metrics: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-lg mb-2">No metrics found</p>
          <p className="text-muted-foreground">Add metrics to track your team's performance</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Team Metrics Review</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="md:overflow-x-auto">
            <div className="min-w-full md:min-w-[800px]">
              <WeeklyMetricsTable
                filteredMetrics={metrics}
                weekStarts={weekStarts}
                formatWeekDate={formatWeekDate}
                getValueColor={getValueColor}
                formatValue={formatValue}
                editingCell={editingCell}
                editValue={editValue}
                managementMode={false}
                selectedMetrics={emptySelection}
                onCellEdit={handleCellEdit}
                onCellSave={handleCellSave}
                onCellCancel={handleCellCancel}
                onEditValueChange={handleEditValueChange}
                onDeleteMetric={noopAsync}
                onMetricSelect={noop}
                onSelectAll={noop}
                onMetricConfiguration={handleMetricConfiguration}
                weekStartDay={weekStartDay}
                showCurrentWeek={userSettings?.show_current_week || false}
                highlightCurrentWeek={userSettings?.highlight_current_week || false}
                getOwnerInitials={getOwnerInitialsStable}
                selectedTeam={teamId}
                permissions={permissions}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metric Configuration Modal */}
      {showConfigModal && configMetric && (
        <MetricConfigurationModal
          metric={configMetric}
          open={showConfigModal}
          onOpenChange={setShowConfigModal}
          onSave={handleSaveConfigModal}
          updateMetricConfiguration={updateMetricConfiguration}
        />
      )}
    </div>
  );
};
