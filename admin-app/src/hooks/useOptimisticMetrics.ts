
import { useState, useCallback, useRef } from 'react';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface OptimisticMetricUpdate {
  metricId: string;
  originalTeamId: string;
  newTeamId: string;
  originalMetric: WeeklyMetricWithOwner;
}

export const useOptimisticMetrics = (
  metrics: WeeklyMetricWithOwner[],
  setMetrics: (metrics: WeeklyMetricWithOwner[]) => void,
  updateMetricConfiguration: (metricId: string, config: any) => Promise<void>
) => {
  const { toast } = useToast();
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, OptimisticMetricUpdate>>(new Map());
  const rollbackTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const applyOptimisticUpdate = useCallback((metricId: string, newConfig: any) => {
    const originalMetric = metrics.find(m => m.id === metricId);
    if (!originalMetric) return;

    logger.log('🔧 useOptimisticMetrics: Applying optimistic update', {
      metricId,
      originalTeamId: originalMetric.team_id,
      newTeamId: newConfig.team_id,
      metricName: originalMetric.metric_name,
      originalAggregationType: originalMetric.aggregation_type,
      newAggregationType: newConfig.aggregation_type,
      fullNewConfig: newConfig
    });

    // Create optimistic metric with new config
    const optimisticMetric = {
      ...originalMetric,
      ...newConfig,
      team_id: newConfig.team_id,
      owner_id: newConfig.owner_id,
      metric_name: newConfig.metric_name,
      description: newConfig.description,
      unit: newConfig.unit,
      target_value: newConfig.target_value,
      target_logic: newConfig.target_logic,
      is_formula: newConfig.is_formula,
      formula_components: newConfig.formula_components,
      aggregation_type: newConfig.aggregation_type,
    };

    // Update metrics array optimistically
    const updatedMetrics = metrics.map(metric => 
      metric.id === metricId ? optimisticMetric : metric
    );

    setMetrics(updatedMetrics);

    // Track the update for potential rollback
    const update: OptimisticMetricUpdate = {
      metricId,
      originalTeamId: originalMetric.team_id,
      newTeamId: newConfig.team_id,
      originalMetric
    };

    setPendingUpdates(prev => new Map(prev).set(metricId, update));

    // Set a rollback timeout in case the server update fails
    const timeoutId = setTimeout(() => {
      logger.log('⚠️ useOptimisticMetrics: Rollback timeout triggered for metric:', metricId);
      rollbackUpdate(metricId);
    }, 10000); // 10 second timeout

    rollbackTimeoutRef.current.set(metricId, timeoutId);

    return optimisticMetric;
  }, [metrics, setMetrics]);

  const confirmUpdate = useCallback((metricId: string) => {
    logger.log('✅ useOptimisticMetrics: Confirming update for metric:', metricId);
    
    // Clear the pending update and timeout
    setPendingUpdates(prev => {
      const newMap = new Map(prev);
      newMap.delete(metricId);
      return newMap;
    });

    const timeoutId = rollbackTimeoutRef.current.get(metricId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      rollbackTimeoutRef.current.delete(metricId);
    }
  }, []);

  const rollbackUpdate = useCallback((metricId: string) => {
    const update = pendingUpdates.get(metricId);
    if (!update) return;

    logger.log('🔄 useOptimisticMetrics: Rolling back update for metric:', metricId);

    // Restore original metric
    const restoredMetrics = metrics.map(metric => 
      metric.id === metricId ? update.originalMetric : metric
    );

    setMetrics(restoredMetrics);

    // Clean up
    setPendingUpdates(prev => {
      const newMap = new Map(prev);
      newMap.delete(metricId);
      return newMap;
    });

    const timeoutId = rollbackTimeoutRef.current.get(metricId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      rollbackTimeoutRef.current.delete(metricId);
    }

    toast({
      title: "Update Failed",
      description: "Metric configuration update failed. Changes have been reverted.",
      variant: "destructive",
    });
  }, [pendingUpdates, metrics, setMetrics, toast]);

  const saveMetricWithOptimisticUpdate = useCallback(async (metricId: string, config: any) => {
    // Apply optimistic update first
    const optimisticMetric = applyOptimisticUpdate(metricId, config);
    if (!optimisticMetric) return;

    try {
      // Perform the actual server update
      await updateMetricConfiguration(metricId, config);
      
      // Confirm the update was successful
      confirmUpdate(metricId);
      
      logger.log('✅ useOptimisticMetrics: Server update successful for metric:', metricId);

      toast({
        title: "Metric Updated",
        description: `${config.metric_name} has been updated successfully.`,
      });

    } catch (error) {
      logger.error('❌ useOptimisticMetrics: Server update failed:', error);
      rollbackUpdate(metricId);
    }
  }, [applyOptimisticUpdate, updateMetricConfiguration, confirmUpdate, rollbackUpdate, toast]);

  return {
    saveMetricWithOptimisticUpdate,
    pendingUpdates: Array.from(pendingUpdates.values()),
    hasPendingUpdates: pendingUpdates.size > 0
  };
};
