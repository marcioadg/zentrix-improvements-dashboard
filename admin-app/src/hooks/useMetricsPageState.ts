import { useState, useCallback } from 'react';
import { logger } from '@/utils/logger';

export const useMetricsPageState = (userSettings: any) => {
  // Core page state
  const [timePeriod, setTimePeriod] = useState('last_13_weeks');
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date } | undefined>(undefined);
  const [searchText, setSearchText] = useState('');
  
  // Edit state
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // Management state
  const [managementMode, setManagementMode] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);

  // Modal state
  const [showMetricConfigModal, setShowMetricConfigModal] = useState(false);
  const [selectedMetricForConfig, setSelectedMetricForConfig] = useState<any>(null);

  // Enhanced management mode handler that clears selections when disabled
  const handleManagementModeChange = useCallback((enabled: boolean) => {
    logger.log('🔧 useMetricsPageState: Management mode change', { enabled });
    setManagementMode(enabled);
    if (!enabled) {
      setSelectedMetrics([]);
    }
  }, []);

  // Modal handlers
  const openMetricConfigModal = useCallback((metric: any) => {
    logger.log('🔧 useMetricsPageState: Opening metric config modal for:', metric.metric_name);
    setSelectedMetricForConfig(metric);
    setShowMetricConfigModal(true);
  }, []);

  const closeMetricConfigModal = useCallback(() => {
    logger.log('🔧 useMetricsPageState: Closing metric config modal');
    setShowMetricConfigModal(false);
    setSelectedMetricForConfig(null);
  }, []);

  // UNIFIED: Clear all transient state (used during team changes)
  const clearAllTransientState = useCallback(() => {
    logger.log('🧹 useMetricsPageState: Clearing all transient state');
    
    // Clear editing state
    setEditingCell(null);
    setEditValue('');
    
    // Clear management state
    setManagementMode(false);
    setSelectedMetrics([]);
    
    // Clear modal state
    setShowMetricConfigModal(false);
    setSelectedMetricForConfig(null);
    
    // Clear search (optional - keeping search across team changes might be desired)
    // setSearchText('');
  }, []);

  // Clear only editing state (used when canceling edits)
  const clearEditingState = useCallback(() => {
    logger.log('🧹 useMetricsPageState: Clearing editing state');
    setEditingCell(null);
    setEditValue('');
  }, []);

  // Clear only management state (used when exiting management mode)
  const clearManagementState = useCallback(() => {
    logger.log('🧹 useMetricsPageState: Clearing management state');
    setManagementMode(false);
    setSelectedMetrics([]);
  }, []);

  return {
    // Time period state
    timePeriod,
    setTimePeriod,
    customRange,
    setCustomRange,
    
    // Search state
    searchText,
    setSearchText,
    
    // Edit state
    editingCell,
    setEditingCell,
    editValue,
    setEditValue,
    clearEditingState,
    
    // Management state
    managementMode,
    setManagementMode: handleManagementModeChange,
    selectedMetrics,
    setSelectedMetrics,
    clearManagementState,
    
    // Modal state
    showMetricConfigModal,
    selectedMetricForConfig,
    openMetricConfigModal,
    closeMetricConfigModal,
    
    // Unified cleanup
    clearAllTransientState,
  };
};
