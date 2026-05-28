
import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { useMetricsUpdater } from '@/hooks/useMetricsUpdater';
import { useProfiles } from '@/hooks/useProfiles';
import { logger } from '@/utils/logger';

interface OwnershipChange {
  id: string;
  metricId: string;
  originalOwnerId: string | null;
  originalOwnerName: string;
  newOwnerId: string | null;
  newOwnerName: string;
  timestamp: number;
}

export const useConsolidatedOwnership = (updateMetricConfiguration: any, refreshCallback?: () => Promise<void>) => {
  const [ownershipChanges, setOwnershipChanges] = useState<Map<string, OwnershipChange>>(new Map());
  const [syncingMetrics, setSyncingMetrics] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const rollbackTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const { updateMetricOwner } = useMetricsUpdater();
  const { profiles } = useProfiles();

  const handleOwnershipChange = useCallback(async (
    metricId: string,
    currentOwnerId: string | null,
    currentOwnerName: string,
    newOwnerId: string | null,
    newOwnerName: string
  ): Promise<boolean> => {
    // SAFETY: Validate that this is actually an ownership change, not metric creation
    if (!metricId || metricId.startsWith('optimistic-')) {
      logger.error('🚨 SAFETY: Attempted to change ownership of optimistic/invalid metric', {
        metricId,
        action: 'BLOCKED'
      });
      return false;
    }

    // Clear any existing timeout
    const existingTimeout = rollbackTimeouts.current.get(metricId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Create optimistic change immediately
    const change: OwnershipChange = {
      id: `${metricId}-${Date.now()}`,
      metricId,
      originalOwnerId: currentOwnerId,
      originalOwnerName: currentOwnerName,
      newOwnerId,
      newOwnerName,
      timestamp: Date.now()
    };

    // Apply optimistic change
    setOwnershipChanges(prev => new Map(prev).set(metricId, change));
    setSyncingMetrics(prev => new Set(prev).add(metricId));

    // Set rollback timeout
    const rollbackTimeout = setTimeout(() => {
      rollbackChange(metricId, new Error('Network timeout'));
    }, 15000);

    rollbackTimeouts.current.set(metricId, rollbackTimeout);

    try {
      // CRITICAL: Update backend using proper metric updater that handles all weekly entries
      await updateMetricOwner(metricId, newOwnerId);

      // Success - confirm change and refresh data
      confirmChange(metricId);
      
      // Auto-refresh data after successful ownership change
      if (refreshCallback) {
        try {
          await refreshCallback();
        } catch (refreshError) {
          logger.error('❌ useConsolidatedOwnership: Data refresh failed:', refreshError);
          // Don't fail the ownership change if refresh fails
        }
      }
      
      return true;

    } catch (error) {
      logger.error('❌ useConsolidatedOwnership: Backend update failed:', error);
      rollbackChange(metricId, error as Error);
      return false;
    }
  }, [updateMetricOwner, refreshCallback]);

  const confirmChange = useCallback((metricId: string) => {
    setOwnershipChanges(prev => {
      const newMap = new Map(prev);
      newMap.delete(metricId);
      return newMap;
    });

    setSyncingMetrics(prev => {
      const newSet = new Set(prev);
      newSet.delete(metricId);
      return newSet;
    });

    // Clear timeout
    const timeout = rollbackTimeouts.current.get(metricId);
    if (timeout) {
      clearTimeout(timeout);
      rollbackTimeouts.current.delete(metricId);
    }
  }, []);

  const rollbackChange = useCallback((metricId: string, error: Error) => {
    const change = ownershipChanges.get(metricId);
    if (change) {
      toastRef.current({
        title: "Ownership Change Failed",
        description: `Could not update owner. ${error.message}`,
        variant: "destructive"
      });
    }

    setOwnershipChanges(prev => {
      const newMap = new Map(prev);
      newMap.delete(metricId);
      return newMap;
    });

    setSyncingMetrics(prev => {
      const newSet = new Set(prev);
      newSet.delete(metricId);
      return newSet;
    });

    // Clear timeout
    const timeout = rollbackTimeouts.current.get(metricId);
    if (timeout) {
      clearTimeout(timeout);
      rollbackTimeouts.current.delete(metricId);
    }
  }, [ownershipChanges]);

  // ENHANCED: Apply ownership changes with strict validation (READ-ONLY - never creates new metrics)
  const applyOwnershipChanges = useCallback((metrics: WeeklyMetricWithOwner[]): WeeklyMetricWithOwner[] => {
    if (ownershipChanges.size === 0) return metrics;

    const result = metrics.map(metric => {
      const change = ownershipChanges.get(metric.id);
      if (!change) return metric;

      // Look up the new owner's profile to get their avatar URL
      const newOwnerProfile = profiles.find(p => p.id === change.newOwnerId);
      
      return {
        ...metric,
        owner_id: change.newOwnerId,
        owner: change.newOwnerName,
        owner_avatar_url: newOwnerProfile?.avatar_url || null
      };
    });

    // CRITICAL SAFETY CHECK: Ensure we never change the count of metrics
    if (result.length !== metrics.length) {
      logger.error('🚨 CRITICAL SAFETY VIOLATION: Ownership changes modified metric count!', {
        before: metrics.length,
        after: result.length,
        action: 'RETURNING_ORIGINAL_METRICS'
      });
      return metrics; // Return original metrics to prevent corruption
    }

    return result;
  }, [ownershipChanges, profiles]);

  const isMetricSyncing = useCallback((metricId: string) => {
    return syncingMetrics.has(metricId);
  }, [syncingMetrics]);

  const clearOwnershipChanges = useCallback(() => {
    // Clear all timeouts
    rollbackTimeouts.current.forEach(timeout => clearTimeout(timeout));
    rollbackTimeouts.current.clear();
    
    setOwnershipChanges(new Map());
    setSyncingMetrics(new Set());
  }, []);

  const getHealthStatus = useCallback(() => {
    return {
      pendingChanges: ownershipChanges.size,
      syncingMetrics: syncingMetrics.size,
      activeTimeouts: rollbackTimeouts.current.size,
      isHealthy: ownershipChanges.size === syncingMetrics.size
    };
  }, [ownershipChanges.size, syncingMetrics.size]);

  return {
    handleOwnershipChange,
    applyOwnershipChanges,
    isMetricSyncing,
    clearOwnershipChanges,
    getHealthStatus
  };
};
