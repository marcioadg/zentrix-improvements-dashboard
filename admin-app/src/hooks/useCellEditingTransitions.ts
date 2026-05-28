import { useCallback, useRef } from 'react';
import { logger } from '@/utils/logger';

interface PendingCellEdit {
  metricId: string;
  weekStart: string;
  value: number | null;
  timestamp: number;
}

/**
 * Hook to manage smooth cell editing transitions without losing selection
 */
export const useCellEditingTransitions = (
  editingCell: string | null,
  setEditingCell: (cell: string | null) => void,
  setEditValue: (value: string) => void
) => {
  const pendingEditRef = useRef<PendingCellEdit | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCellEditTransition = useCallback((metricId: string, weekStart: string, currentValue: number | null) => {
    const newCellKey = `${metricId}-${weekStart}`;
    
    logger.log('🔄 useCellEditingTransitions: Transition request:', {
      from: editingCell,
      to: newCellKey,
      hasCurrentEdit: !!editingCell,
      timestamp: Date.now()
    });
    
    // If we're already editing this exact cell, do nothing
    if (editingCell === newCellKey) {
      return;
    }
    
    // Clear any pending transitions
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    
    // If we're currently editing another cell, store this as a pending edit
    if (editingCell && editingCell !== newCellKey) {
      logger.log('🔄 useCellEditingTransitions: Storing pending edit for transition');
      pendingEditRef.current = {
        metricId,
        weekStart,
        value: currentValue,
        timestamp: Date.now()
      };
      
      // Set a timeout to execute the pending edit if the current save takes too long
      transitionTimeoutRef.current = setTimeout(() => {
        if (pendingEditRef.current) {
          logger.log('🔄 useCellEditingTransitions: Executing delayed transition');
          const pending = pendingEditRef.current;
          setEditingCell(`${pending.metricId}-${pending.weekStart}`);
          setEditValue(pending.value?.toString() || '');
          pendingEditRef.current = null;
        }
      }, 200); // Small delay to allow current save to complete
      
      return;
    }
    
    // Direct transition if no current editing cell
    setEditingCell(newCellKey);
    setEditValue(currentValue?.toString() || '');
  }, [editingCell, setEditingCell, setEditValue]);

  const handleSaveComplete = useCallback((metricId: string, weekStart: string) => {
    const completedCellKey = `${metricId}-${weekStart}`;
    
    logger.log('🔄 useCellEditingTransitions: Save completed for:', completedCellKey);
    
    // Clear any transition timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    
    // If there's a pending edit, execute it now
    if (pendingEditRef.current) {
      logger.log('🔄 useCellEditingTransitions: Executing pending transition after save');
      const pending = pendingEditRef.current;
      setEditingCell(`${pending.metricId}-${pending.weekStart}`);
      setEditValue(pending.value?.toString() || '');
      pendingEditRef.current = null;
    } else if (editingCell === completedCellKey) {
      // Only clear if this was the active editing cell and no pending edit
      setEditingCell(null);
      setEditValue('');
    }
  }, [editingCell, setEditingCell, setEditValue]);

  const handleCancel = useCallback(() => {
    logger.log('🔄 useCellEditingTransitions: Cancel requested');
    
    // Clear any pending transitions
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    
    pendingEditRef.current = null;
    setEditingCell(null);
    setEditValue('');
  }, [setEditingCell, setEditValue]);

  return {
    handleCellEditTransition,
    handleSaveComplete,
    handleCancel,
    hasPendingEdit: !!pendingEditRef.current
  };
};