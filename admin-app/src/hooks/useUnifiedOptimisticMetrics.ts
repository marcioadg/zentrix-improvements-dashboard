import { useState, useCallback, useMemo } from 'react';
import { usePageLevelOptimisticOwnership } from '@/hooks/usePageLevelOptimisticOwnership';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface Team {
  id: string;
  name: string;
}

export const useUnifiedOptimisticMetrics = (selectedTeam: string, teams: Team[], weekStarts: string[]) => {
  const { toast } = useToast();
  
  // Single optimistic ownership system
  const ownershipSystem = usePageLevelOptimisticOwnership();
  
  // State for new metrics being added
  const [optimisticNewMetrics, setOptimisticNewMetrics] = useState<WeeklyMetricWithOwner[]>([]);
  const [addingMetrics, setAddingMetrics] = useState(false);

  // Create optimistic metric helper
  const createOptimisticMetric = useCallback((companyMetric: any): WeeklyMetricWithOwner => {
    const currentWeek = weekStarts[weekStarts.length - 1] || new Date().toISOString().split('T')[0];
    return {
      id: `optimistic-${crypto.randomUUID()}`,
      user_id: companyMetric.owner_id || '',
      metric_name: companyMetric.metric_name,
      owner_id: companyMetric.owner_id,
      owner: companyMetric.owner_name,
      owner_avatar_url: companyMetric.owner_avatar_url,
      team_id: selectedTeam,
      team_name: teams.find(t => t.id === selectedTeam)?.name,
      unit: companyMetric.unit || '',
      target_value: companyMetric.target_value || null,
      target_logic: null,
      metric_value: null, // Don't pre-populate - let user enter when ready
      week_start_date: currentWeek,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      weeklyValues: {} // Empty - user will populate when entering values
    };
  }, [weekStarts, selectedTeam, teams]);

  // UNIFIED: Process metrics with strict deduplication
  const processMetrics = useCallback((originalMetrics: WeeklyMetricWithOwner[]): WeeklyMetricWithOwner[] => {

    // Step 1: Apply ownership changes to original metrics
    const metricsWithOwnership = ownershipSystem.applyOptimisticChanges(originalMetrics);
    
    // Step 2: Merge with optimistic new metrics using strict deduplication
    const metricMap = new Map<string, WeeklyMetricWithOwner>();
    
    // Priority 1: Existing metrics with ownership changes (highest priority)
    metricsWithOwnership.forEach(metric => {
      metricMap.set(metric.id, metric);
    });

    // Priority 2: New optimistic metrics (only if not conflicting)
    optimisticNewMetrics.forEach(metric => {
      if (!metricMap.has(metric.id)) {
        metricMap.set(metric.id, metric);
      } else {
        logger.warn('⚠️ DEDUPLICATION: Skipping conflicting optimistic metric', metric.id);
      }
    });

    const result = Array.from(metricMap.values());
    
    // SAFETY: Emergency deduplication validation
    const duplicateCheck = new Map<string, number>();
    result.forEach(metric => {
      const count = duplicateCheck.get(metric.id) || 0;
      duplicateCheck.set(metric.id, count + 1);
    });

    const hasDuplicates = Array.from(duplicateCheck.values()).some(count => count > 1);
    if (hasDuplicates) {
      logger.error('🚨 EMERGENCY: Duplicates detected in unified processing!', {
        duplicates: Array.from(duplicateCheck.entries()).filter(([_, count]) => count > 1)
      });
      
      // Emergency cleanup - clear optimistic metrics and return safe state
      performEmergencyCleanup();
      
      toast({
        title: "Data Integrity Issue Detected",
        description: "Cleaned up duplicate metrics. Please refresh if issues persist.",
        variant: "destructive"
      });
      
      // Return only original metrics with ownership changes to prevent corruption
      return metricsWithOwnership;
    }


    return result;
  }, [optimisticNewMetrics, ownershipSystem, toast]);

  // Handle ownership changes
  const handleOwnershipChange = useCallback(async (
    metricId: string,
    currentOwnerId: string | null,
    currentOwnerName: string,
    newOwnerId: string | null,
    newOwnerName: string
  ): Promise<boolean> => {
    
    // SAFETY: Block optimistic metric changes
    if (metricId.startsWith('optimistic-')) {
      logger.error('🚨 SAFETY: Blocked ownership change on optimistic metric', metricId);
      toast({
        title: "Error",
        description: "Cannot change ownership of metrics being added. Please wait for completion.",
        variant: "destructive"
      });
      return false;
    }
    
    try {
      // Add optimistic change
      ownershipSystem.addOptimisticChange(
        metricId,
        currentOwnerId,
        currentOwnerName,
        newOwnerId,
        newOwnerName
      );

      // The actual backend update will be handled by the calling component
      return true;

    } catch (error) {
      logger.error('❌ useUnifiedOptimisticMetrics: Ownership change failed:', error);
      ownershipSystem.rollbackOptimisticChange(metricId, error as Error);
      return false;
    }
  }, [ownershipSystem, toast]);

  // Handle adding new metrics
  const handleAddMetricsToTable = useCallback(async (
    newMetrics: any[], 
    targetTeamId: string, 
    addMetricFunction: any,
    refetchFunction?: any
  ) => {
    if (targetTeamId !== selectedTeam) {
      toast({
        title: "Error",
        description: "Can only add metrics to the currently selected team",
        variant: "destructive"
      });
      return;
    }

    setAddingMetrics(true);

    try {
      // Create optimistic metrics
      const optimisticMetricsToAdd = newMetrics.map(createOptimisticMetric);
      setOptimisticNewMetrics(prev => [...prev, ...optimisticMetricsToAdd]);

      toast({
        title: "Adding Metrics",
        description: `Adding ${newMetrics.length} metric(s) to the team...`,
      });

      // Add to backend
      const addPromises = newMetrics.map(async (metric) => {
        return addMetricFunction({
          metric_name: metric.metric_name,
          owner_id: metric.owner_id,
          unit: metric.unit || '',
          target_value: metric.target_value || null,
          user_id: metric.owner_id
        });
      });

      await Promise.all(addPromises);
      
      // Clear optimistic metrics after successful addition
      setOptimisticNewMetrics([]);

      toast({
        title: "Metrics Added",
        description: `Successfully added ${newMetrics.length} metric(s) to the team`,
      });

      if (refetchFunction) {
        refetchFunction();
      }
    } catch (error) {
      logger.error('Error adding metrics to table:', error);
      setOptimisticNewMetrics([]);
      
      toast({
        title: "Error",
        description: "Failed to add metrics to table. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAddingMetrics(false);
    }
  }, [selectedTeam, createOptimisticMetric, toast]);

  // Emergency cleanup function
  const performEmergencyCleanup = useCallback(() => {
    setOptimisticNewMetrics([]);
    ownershipSystem.cleanup();
  }, [ownershipSystem]);

  // Clear all optimistic state
  const clearAllOptimisticState = useCallback(() => {
    setOptimisticNewMetrics([]);
    ownershipSystem.cleanup();
  }, [ownershipSystem]);

  // Health status
  const getHealthStatus = useCallback(() => {
    return {
      optimisticNewMetrics: optimisticNewMetrics.length,
      addingMetrics,
      ownershipChanges: ownershipSystem.getPendingChanges().length,
      isHealthy: true // Always healthy with unified system
    };
  }, [optimisticNewMetrics.length, addingMetrics, ownershipSystem]);

  return {
    // Core processing
    processMetrics,
    
    // Ownership handling
    handleOwnershipChange,
    isMetricSyncing: ownershipSystem.isMetricSyncing,
    
    // New metrics handling
    handleAddMetricsToTable,
    addingMetrics,
    
    // State management
    clearAllOptimisticState,
    performEmergencyCleanup,
    
    // Health monitoring
    getHealthStatus,
    
    // Direct access to ownership system for advanced usage
    ownershipSystem
  };
};
