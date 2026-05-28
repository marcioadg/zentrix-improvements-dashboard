
import { useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useWeeklyMetrics } from '@/hooks/useWeeklyMetrics';
import { useMetricsCellEditing } from '@/hooks/useMetricsCellEditing';
import { useMetricsManagement } from '@/hooks/useMetricsManagement';
import { logger } from '@/utils/logger';

export const useMetricsPageData = (
  selectedTeam: string,
  timePeriod: string,
  customRange: { start: Date; end: Date } | undefined,
  editingCell: string | null,
  editValue: string,
  setEditingCell: (cell: string | null) => void,
  setEditValue: (value: string) => void,
  selectedMetrics: string[],
  setSelectedMetrics: (metrics: string[]) => void
) => {
  const { toast } = useToast();

  const {
    metrics,
    loading,
    error,
    updateMetric,
    updateMetricConfiguration,
    addMetric,
    removeMetric,
    bulkRemoveMetrics,
    currentWeekStart,
    getLast13WeeksStartDates,
    formatWeekDate,
    getOwnerInitials,
    checkTargetCondition,
    getValueColor,
    formatValue,
    refetch,
    weekStartDay,
    retryCount,
    canRetry,
  } = useWeeklyMetrics(selectedTeam, timePeriod, customRange);

  const {
    handleCellEdit,
    handleCellSave,
    handleCellCancel,
    handleEditValueChange,
  } = useMetricsCellEditing(editingCell, editValue, setEditingCell, setEditValue, updateMetric);

  const {
    handleMetricSelect,
    handleSelectAll,
    handleDeleteMetric,
    handleBulkDelete,
  } = useMetricsManagement(
    selectedMetrics,
    setSelectedMetrics,
    editingCell,
    setEditingCell,
    setEditValue,
    removeMetric,
    bulkRemoveMetrics,
    metrics
  );

  const weekStarts = getLast13WeeksStartDates();

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleRetry = useCallback(() => {
    if (refetch) {
      refetch(true);
    }
  }, [refetch]);

  const handleMetricConfiguration = useCallback((metric: any) => {
    logger.log('Configure metric:', metric);
  }, []);

  return {
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
  };
};
