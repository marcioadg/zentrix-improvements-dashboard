
import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { logger } from '@/utils/logger';

interface OptimisticChange {
  id: string;
  metricId: string;
  originalOwnerId: string | null;
  originalOwnerName: string;
  newOwnerId: string | null;
  newOwnerName: string;
  timestamp: number;
}

export const usePageLevelOptimisticOwnership = () => {
  const [optimisticChanges, setOptimisticChanges] = useState<Map<string, OptimisticChange>>(new Map());
  const [syncingMetrics, setSyncingMetrics] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const rollbackTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Use refs to avoid stale closure issues
  const optimisticChangesRef = useRef(optimisticChanges);
  const syncingMetricsRef = useRef(syncingMetrics);
  
  // Update refs whenever state changes
  optimisticChangesRef.current = optimisticChanges;
  syncingMetricsRef.current = syncingMetrics;

  const addOptimisticChange = useCallback((
    metricId: string,
    originalOwnerId: string | null,
    originalOwnerName: string,
    newOwnerId: string | null,
    newOwnerName: string
  ) => {
    const changeId = `${metricId}-${Date.now()}`;
    const change: OptimisticChange = {
      id: changeId,
      metricId,
      originalOwnerId,
      originalOwnerName,
      newOwnerId,
      newOwnerName,
      timestamp: Date.now()
    };

    setOptimisticChanges(prev => new Map(prev).set(metricId, change));
    setSyncingMetrics(prev => new Set(prev).add(metricId));

    logger.log('🔧 Added page-level optimistic change:', change);
    return changeId;
  }, []);

  const confirmOptimisticChange = useCallback((metricId: string) => {
    setOptimisticChanges(prev => {
      const newMap = new Map(prev);
      newMap.delete(metricId);
      return newMap;
    });
    setSyncingMetrics(prev => {
      const newSet = new Set(prev);
      newSet.delete(metricId);
      return newSet;
    });

    // Clear any pending rollback timeout
    const timeout = rollbackTimeoutRef.current.get(metricId);
    if (timeout) {
      clearTimeout(timeout);
      rollbackTimeoutRef.current.delete(metricId);
    }

    logger.log('✅ Confirmed page-level optimistic change for metric:', metricId);
  }, []);

  const rollbackOptimisticChange = useCallback((metricId: string, error?: Error) => {
    const currentChanges = optimisticChangesRef.current;
    const change = currentChanges.get(metricId);
    
    if (!change) return;

    logger.log('🔄 Rolling back page-level optimistic change for metric:', metricId, error?.message);

    toast({
      title: "Ownership Change Failed",
      description: `Failed to update owner. ${error?.message || 'Please try again.'}`,
      variant: "destructive"
    });

    setOptimisticChanges(prev => {
      const newMap = new Map(prev);
      newMap.delete(metricId);
      return newMap;
    });

    setSyncingMetrics(prev => {
      const newSet = new Set(prev);
      newSet.delete(metricId);
      return newSet;
    });

    // Clear rollback timeout
    const timeout = rollbackTimeoutRef.current.get(metricId);
    if (timeout) {
      clearTimeout(timeout);
      rollbackTimeoutRef.current.delete(metricId);
    }
  }, [toast]);

  const scheduleRollback = useCallback((metricId: string, timeoutMs: number = 10000) => {
    // Clear existing timeout if any
    const existingTimeout = rollbackTimeoutRef.current.get(metricId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout for rollback
    const timeout = setTimeout(() => {
      rollbackOptimisticChange(metricId, new Error('Network timeout'));
    }, timeoutMs);

    rollbackTimeoutRef.current.set(metricId, timeout);
  }, [rollbackOptimisticChange]);

  // Handle real-time ownership changes from other users
  const handleRealtimeOwnershipChange = useCallback((
    metricId: string,
    newOwnerId: string | null,
    newOwnerName: string
  ) => {
    const currentChanges = optimisticChangesRef.current;
    const pendingChange = currentChanges.get(metricId);

    if (pendingChange) {
      // Check if real-time change matches our optimistic change
      if (pendingChange.newOwnerId === newOwnerId && pendingChange.newOwnerName === newOwnerName) {
        logger.log('✅ Real-time change matches optimistic change, confirming:', metricId);
        confirmOptimisticChange(metricId);
      } else {
        logger.log('⚠️ Real-time change conflicts with optimistic change, rolling back:', metricId);
        rollbackOptimisticChange(metricId, new Error('Change was overridden by another user'));
      }
    }
    // If no pending optimistic change, the real-time update will be handled by the data manager
  }, [confirmOptimisticChange, rollbackOptimisticChange]);

  // Apply optimistic changes to metrics data - use ref to avoid stale closure
  const applyOptimisticChanges = useCallback((metrics: WeeklyMetricWithOwner[]): WeeklyMetricWithOwner[] => {
    const currentChanges = optimisticChangesRef.current;
    
    return metrics.map(metric => {
      const change = currentChanges.get(metric.id);
      if (!change) return metric;

      return {
        ...metric,
        owner_id: change.newOwnerId,
        owner: change.newOwnerName
      };
    });
  }, []);

  const isMetricSyncing = useCallback((metricId: string) => {
    return syncingMetricsRef.current.has(metricId);
  }, []);

  const getPendingChanges = useCallback(() => {
    return Array.from(optimisticChangesRef.current.values());
  }, []);

  // Cleanup timeouts on unmount
  const cleanup = useCallback(() => {
    rollbackTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
    rollbackTimeoutRef.current.clear();
  }, []);

  return {
    addOptimisticChange,
    confirmOptimisticChange,
    rollbackOptimisticChange,
    scheduleRollback,
    handleRealtimeOwnershipChange,
    applyOptimisticChanges,
    isMetricSyncing,
    getPendingChanges,
    cleanup
  };
};
