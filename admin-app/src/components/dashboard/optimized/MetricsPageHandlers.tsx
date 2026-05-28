import { useCallback } from 'react';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { useToast } from '@/hooks/use-toast';
import { useCellEditingTransitions } from '@/hooks/useCellEditingTransitions';
import { logger } from '@/utils/logger';

export const useMetricsPageHandlers = (
  updateMetric: (metricId: string, weekStart: string, value: number | null) => Promise<void>,
  removeMetric: (metricId: string) => Promise<void>,
  bulkRemoveMetrics: (metricIds: string[]) => Promise<void>,
  updateMetricConfiguration: (metricId: string, config: any) => Promise<void>,
  editingCell: string | null,
  editValue: string,
  setEditingCell: (cell: string | null) => void,
  setEditValue: (value: string) => void,
  selectedMetrics: string[],
  setSelectedMetrics: (metrics: string[]) => void,
  metrics: WeeklyMetricWithOwner[],
  setMetrics: (metrics: WeeklyMetricWithOwner[] | ((prev: WeeklyMetricWithOwner[]) => WeeklyMetricWithOwner[])) => void,
  openMetricConfigModal: (metric: WeeklyMetricWithOwner) => void,
  refetchMetrics?: () => Promise<void>
) => {
  const { toast } = useToast();
  
  // Use the cell editing transitions hook for smooth state management
  const { handleCellEditTransition, handleSaveComplete, handleCancel } = useCellEditingTransitions(
    editingCell,
    setEditingCell,
    setEditValue
  );


  // Cell editing handlers with smooth transitions
  const handleCellEdit = useCallback((metricId: string, weekStart: string, currentValue: number | null) => {
    handleCellEditTransition(metricId, weekStart, currentValue);
  }, [handleCellEditTransition]);

  const handleCellSave = useCallback(async (metricId: string, weekStart: string) => {
    if (!updateMetric) return;
    
    const trimmedValue = editValue.trim();
    let finalValue: number | null;

    if (trimmedValue === '') {
      finalValue = null;
    } else {
      const numericValue = parseFloat(trimmedValue);

      if (isNaN(numericValue)) {
        toast({
          title: "Invalid value",
          description: "Please enter a valid number",
          variant: "destructive",
        });
        return;
      }
      finalValue = numericValue;
    }
    
    // Only clear editing state if this is the current editing cell
    const currentCellKey = `${metricId}-${weekStart}`;
    const shouldClearState = editingCell === currentCellKey;
    
    if (shouldClearState) {
      setEditingCell(null);
      setEditValue('');
    }
    
    try {
      logger.debug('Calling updateMetric', { metricId, weekStart, finalValue });
      await updateMetric(metricId, weekStart, finalValue);
      
      // Handle save completion for smooth transitions
      handleSaveComplete(metricId, weekStart);
      
      // Show success feedback for non-null values (reduced noise)
      if (finalValue !== null) {
        toast({
          title: "Updated",
          description: "Metric value saved",
          duration: 2000,
        });
      }
    } catch (error) {
      logger.error('Metric save failed', { error });
      
      // Enhanced error handling with user-friendly messages
      const errorMessage = error instanceof Error ? error.message : 'Failed to save metric value';
      
      toast({
        title: "Save Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      // On error, restore editing state only if we cleared it
      if (shouldClearState) {
        setEditingCell(currentCellKey);
        setEditValue(trimmedValue);
      }
    }
  }, [editValue, updateMetric, editingCell, setEditingCell, setEditValue, toast, handleSaveComplete]);

  const handleCellCancel = useCallback(() => {
    handleCancel();
  }, [handleCancel]);

  const handleEditValueChange = useCallback((value: string) => {
    setEditValue(value);
  }, [setEditValue]);

  // Management mode handlers with improved error handling
  const handleDeleteMetric = useCallback(async (metric: WeeklyMetricWithOwner) => {
    if (!removeMetric) return;
    
    try {
      logger.debug('Delete metric', { metricName: metric.metric_name });
      await removeMetric(metric.id);
      
      toast({
        title: "Success",
        description: `${metric.metric_name} has been deleted`,
      });
    } catch (error) {
      logger.error('Delete failed', { error });
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete metric';
      toast({
        title: "Delete Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [removeMetric, toast]);

  const handleBulkDelete = useCallback(async () => {
    if (!bulkRemoveMetrics || selectedMetrics.length === 0) return;
    
    try {
      logger.debug('Bulk delete', { count: selectedMetrics.length });
      await bulkRemoveMetrics(selectedMetrics);
      setSelectedMetrics([]);
      
      toast({
        title: "Success",
        description: `${selectedMetrics.length} metrics have been deleted`,
      });
    } catch (error) {
      logger.error('Bulk delete failed', { error });
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete metrics';
      toast({
        title: "Bulk Delete Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [selectedMetrics, bulkRemoveMetrics, setSelectedMetrics, toast]);

  const handleMetricSelect = useCallback((metricId: string, selected: boolean) => {
    if (selected) {
      setSelectedMetrics([...selectedMetrics, metricId]);
    } else {
      setSelectedMetrics(selectedMetrics.filter(id => id !== metricId));
    }
  }, [selectedMetrics, setSelectedMetrics]);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedMetrics(metrics.map(m => m.id));
    } else {
      setSelectedMetrics([]);
    }
  }, [metrics, setSelectedMetrics]);

  const handleMetricConfiguration = useCallback((metric: WeeklyMetricWithOwner) => {
    logger.debug('Configure metric', { metricName: metric.metric_name });
    openMetricConfigModal(metric);
  }, [openMetricConfigModal]);

  const handleOwnershipChange = useCallback(async () => {
    logger.debug('Ownership change completed, triggering refresh');
    if (refetchMetrics) {
      await refetchMetrics();
    }
  }, [refetchMetrics]);

  return {
    handleCellEdit,
    handleCellSave,
    handleCellCancel,
    handleEditValueChange,
    handleDeleteMetric,
    handleBulkDelete,
    handleMetricSelect,
    handleSelectAll,
    handleMetricConfiguration,
    handleOwnershipChange,
  };
};
