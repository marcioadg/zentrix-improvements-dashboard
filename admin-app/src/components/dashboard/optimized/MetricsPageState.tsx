import { useState, useCallback } from 'react';
import { debugLogger } from '@/utils/debugLogger';
import { logger } from '@/utils/logger';

export const useMetricsPageState = (userSettings: any) => {
  const [timePeriod, setTimePeriod] = useState('last_13_weeks');
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date } | undefined>(undefined);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [managementMode, setManagementMode] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  
  // Modal state management
  const [showMetricConfigModal, setShowMetricConfigModal] = useState(false);
  const [selectedMetricForConfig, setSelectedMetricForConfig] = useState<any>(null);

  // Stabilized management mode change handler
  const handleManagementModeChange = useCallback((enabled: boolean) => {
    setManagementMode(enabled);
    if (!enabled) {
      setSelectedMetrics([]);
    }
  }, []);

  // Stabilized modal handlers to prevent recreation
  const openMetricConfigModal = useCallback((metric: any) => {
    debugLogger.debug('Opening metric config modal for:', metric.metric_name);
    setSelectedMetricForConfig(metric);
    setShowMetricConfigModal(true);
  }, []);

  const closeMetricConfigModal = useCallback(() => {
    debugLogger.debug('Closing metric config modal');
    setShowMetricConfigModal(false);
    setSelectedMetricForConfig(null);
  }, []);

  // Handle metric configuration save/delete actions
  const handleMetricConfigSave = useCallback(async (config: any) => {
    if (config.action === 'delete_from_team') {
      // Handle delete from current team
      logger.log('Deleting metric from current team:', config.metric);
      // This will be handled by the parent component's delete logic
      return;
    } else if (config.action === 'delete_from_all_teams') {
      // Handle delete from all teams
      logger.log('Deleting metric from all teams:', config.metric);
      // This will be handled by the parent component's delete logic
      return;
    }
    
    // Handle normal save
    logger.log('Saving metric configuration:', config);
  }, []);

  return {
    timePeriod,
    setTimePeriod,
    customRange,
    setCustomRange,
    editingCell,
    setEditingCell,
    editValue,
    setEditValue,
    managementMode,
    setManagementMode: handleManagementModeChange,
    selectedMetrics,
    setSelectedMetrics,
    searchText,
    setSearchText,
    // Modal state
    showMetricConfigModal,
    selectedMetricForConfig,
    openMetricConfigModal,
    closeMetricConfigModal,
    handleMetricConfigSave,
  };
};
