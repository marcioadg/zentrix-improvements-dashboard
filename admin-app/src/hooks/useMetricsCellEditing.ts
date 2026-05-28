
import { useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export const useMetricsCellEditing = (
  editingCell: string | null,
  editValue: string,
  setEditingCell: (cell: string | null) => void,
  setEditValue: (value: string) => void,
  updateMetric: (metricId: string, weekStart: string, value: number | null) => Promise<void>,
  onValueChanged?: (metricId: string, weekStart: string, value: number | null) => void
) => {
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const pendingClearRef = useRef<NodeJS.Timeout | null>(null);

  const formatCellKey = useCallback((metricId: string, weekStart: string) => {
    return `${metricId}-${weekStart}`;
  }, []);

  const handleCellEdit = useCallback((metricId: string, weekStart: string, _currentValue: number | null) => {
    if (pendingClearRef.current) {
      clearTimeout(pendingClearRef.current);
      pendingClearRef.current = null;
    }
    
    const cellKey = formatCellKey(metricId, weekStart);
    setEditingCell(cellKey);
  }, [formatCellKey, setEditingCell]);

  const handleCellSave = useCallback(async (metricId: string, weekStart: string, value?: number | null) => {
    const isAggregatedPeriod = weekStart.includes(' - ') || /^\d+W\s/.test(weekStart);
    if (isAggregatedPeriod) {
      toastRef.current({
        title: "Editing disabled in aggregated views",
        description: "Switch to Weekly view to edit metric values",
      });
      setEditingCell(null);
      return;
    }
    
    const cellKey = formatCellKey(metricId, weekStart);
    
    if (!editingCell || editingCell !== cellKey) {
      return;
    }

    const parsedValue = value !== undefined ? value : null;

    // Exit edit mode immediately so the colored display renders
    // while the DB write happens in the background.
    // updateMetric handles optimistic update + rollback on error.
    setEditingCell(null);

    try {
      await updateMetric(metricId, weekStart, parsedValue);
      
      try {
        onValueChanged?.(metricId, weekStart, parsedValue);
      } catch (broadcastError) {
        logger.warn('Broadcast failed (save was successful):', broadcastError);
      }
    } catch (error) {
      logger.error('Cell save failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to save metric value. Please try again.';
      toastRef.current({
        title: "Save Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [editingCell, formatCellKey, updateMetric, setEditingCell, onValueChanged]);

  const handleCellCancel = useCallback(() => {
    if (pendingClearRef.current) {
      clearTimeout(pendingClearRef.current);
      pendingClearRef.current = null;
    }
    
    if (editingCell) {
      setEditingCell(null);
    }
  }, [editingCell, setEditingCell]);

  const handleEditValueChange = useCallback((value: string) => {
    setEditValue(value);
  }, [setEditValue]);

  return {
    handleCellEdit,
    handleCellSave,
    handleCellCancel,
    handleEditValueChange,
  };
};
