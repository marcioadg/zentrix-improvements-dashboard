
import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface OptimisticChange {
  id: string;
  metricId: string;
  originalOwnerId: string | null;
  originalOwnerName: string;
  newOwnerId: string | null;
  newOwnerName: string;
  timestamp: number;
  syncing: boolean;
}

export const useOptimisticOwnership = () => {
  const [optimisticChanges, setOptimisticChanges] = useState<Map<string, OptimisticChange>>(new Map());
  const [syncingMetrics, setSyncingMetrics] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const rollbackTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

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
      timestamp: Date.now(),
      syncing: true
    };

    setOptimisticChanges(prev => new Map(prev).set(metricId, change));
    setSyncingMetrics(prev => new Set(prev).add(metricId));

    logger.log('🔧 Added optimistic change:', change);
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

    logger.log('✅ Confirmed optimistic change for metric:', metricId);
  }, []);

  const rollbackOptimisticChange = useCallback((metricId: string, error?: Error) => {
    const change = optimisticChanges.get(metricId);
    if (!change) return;

    logger.log('🔄 Rolling back optimistic change for metric:', metricId, error?.message);

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

    toast({
      title: "Ownership Change Failed",
      description: `Failed to update owner for ${change.originalOwnerName || 'metric'}. ${error?.message || 'Please try again.'}`,
      variant: "destructive"
    });
  }, [optimisticChanges, toast]);

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

  const getOptimisticOwner = useCallback((metricId: string, currentOwnerId: string | null, currentOwnerName: string) => {
    const change = optimisticChanges.get(metricId);
    if (!change) return { ownerId: currentOwnerId, ownerName: currentOwnerName };

    return {
      ownerId: change.newOwnerId,
      ownerName: change.newOwnerName
    };
  }, [optimisticChanges]);

  const isMetricSyncing = useCallback((metricId: string) => {
    return syncingMetrics.has(metricId);
  }, [syncingMetrics]);

  const getPendingChanges = useCallback(() => {
    return Array.from(optimisticChanges.values());
  }, [optimisticChanges]);

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
    getOptimisticOwner,
    isMetricSyncing,
    getPendingChanges,
    cleanup
  };
};
