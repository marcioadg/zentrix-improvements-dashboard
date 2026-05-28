
import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { logger } from '@/utils/logger';

interface MetricsSectionHandlersProps {
  metrics: WeeklyMetricWithOwner[];
  updateMetric: (metricId: string, weekStart: string, value: number | null) => Promise<void>; // FIXED: Accept null
  editingCell: string | null;
  setEditingCell: (cellKey: string | null) => void;
  editValue: string;
  setEditValue: (value: string) => void;
}

export const useMetricsSectionHandlers = ({
  metrics,
  updateMetric,
  editingCell,
  setEditingCell,
  editValue,
  setEditValue,
}: MetricsSectionHandlersProps) => {
  const { toast } = useToast();

  const handleCellEdit = useCallback((metricId: string, weekStart: string, currentValue: number | null) => {
    // FIXED: Use dash format consistently - changed from pipe (|) to dash (-)
    const cellKey = `${metricId}-${weekStart}`;
    logger.log('🔧 MetricsSectionHandlers - handleCellEdit:', { cellKey, metricId, weekStart, currentValue });
    
    setEditingCell(cellKey);
    setEditValue(currentValue?.toString() || '');
  }, [setEditingCell, setEditValue]);

  const handleCellSave = useCallback(async (metricId: string, weekStart: string) => {
    // FIXED: Use dash format consistently - changed from pipe (|) to dash (-)
    const cellKey = `${metricId}-${weekStart}`;
    logger.log('🔧 MetricsSectionHandlers - handleCellSave:', { cellKey, metricId, weekStart, editValue });

    try {
      // FIXED: Proper handling of zero values - only treat truly empty strings as null
      const trimmedValue = editValue.trim();
      let finalValue: number | null;

      if (trimmedValue === '') {
        // Only empty string should be treated as null (delete record)
        finalValue = null;
        logger.log('🔧 MetricsSectionHandlers - Empty input, setting to null to delete record');
      } else {
        const numericValue = parseFloat(trimmedValue);
        if (isNaN(numericValue)) {
          logger.warn('🔧 MetricsSectionHandlers - Invalid numeric value:', trimmedValue);
          toast({
            title: "Invalid Value",
            description: "Please enter a valid number",
            variant: "destructive",
          });
          return;
        }
        // CRITICAL FIX: Accept zero as a valid value (don't convert to null)
        finalValue = numericValue; // This includes 0, 0.0, negative numbers, etc.
        logger.log('🔧 MetricsSectionHandlers - Valid numeric value:', { originalInput: trimmedValue, finalValue });
      }

      logger.log('🔧 MetricsSectionHandlers - Calling updateMetric with:', { metricId, weekStart, finalValue });
      
      await updateMetric(metricId, weekStart, finalValue);
      
      setEditingCell(null);
      setEditValue('');
      
      logger.log('🔧 MetricsSectionHandlers - Metric updated successfully');
      toast({
        title: "Success",
        description: "Metric updated successfully",
      });
    } catch (error) {
      logger.error('🔧 MetricsSectionHandlers - Error updating metric:', error);
      
      // ✅ LAYER 3: Handle METRIC_RECENTLY_DELETED error gracefully
      // This prevents race conditions where User B tries to save to a metric User A just deleted
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('METRIC_RECENTLY_DELETED')) {
        toast({
          title: "Metric Deleted",
          description: "This metric was deleted by another user. Refreshing...",
          variant: "destructive",
        });
        // The realtime subscription will automatically remove the metric from state
        // Just clear the editing state
        setEditingCell(null);
        setEditValue('');
        return;
      }
      
      const detail = (error as any)?.message || 'An unexpected error occurred';
      toast({
        title: "Failed to update metric value",
        description: `${detail}. Please check your connection and try again.`,
        variant: "destructive",
      });
    }
  }, [editValue, updateMetric, setEditingCell, setEditValue, toast]);

  const handleCellCancel = useCallback(() => {
    logger.log('🔧 MetricsSectionHandlers - handleCellCancel');
    setEditingCell(null);
    setEditValue('');
  }, [setEditingCell, setEditValue]);

  const handleEditValueChange = useCallback((value: string) => {
    logger.log('🔧 MetricsSectionHandlers - handleEditValueChange:', value);
    setEditValue(value);
  }, [setEditValue]);

  return {
    handleCellEdit,
    handleCellSave,
    handleCellCancel,
    handleEditValueChange,
  };
};
