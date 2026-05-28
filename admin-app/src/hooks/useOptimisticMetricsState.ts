
import { useState, useCallback } from 'react';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export const useOptimisticMetricsState = (selectedTeam: string, teams: any[], weekStarts: string[]) => {
  const [optimisticMetrics, setOptimisticMetrics] = useState<WeeklyMetricWithOwner[]>([]);
  const [addingMetrics, setAddingMetrics] = useState(false);
  const { toast } = useToast();

  logger.log('🔧 useOptimisticMetricsState: Initialized for team', selectedTeam);

  const createOptimisticMetric = useCallback((companyMetric: any): WeeklyMetricWithOwner => {
    const currentWeek = weekStarts[weekStarts.length - 1] || new Date().toISOString().split('T')[0];
    
    const uniqueId = `optimistic-${crypto.randomUUID()}`;
    
    const optimisticMetric: WeeklyMetricWithOwner = {
      id: uniqueId,
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
      display_order: null,
      weeklyValues: {} // Empty - user will populate when entering values
    };

    logger.log('✨ useOptimisticMetricsState: Created optimistic metric', {
      id: uniqueId,
      name: optimisticMetric.metric_name
    });
    
    return optimisticMetric;
  }, [weekStarts, selectedTeam, teams]);

  const handleAddMetricsToTable = useCallback(async (
    newMetrics: any[], 
    targetTeamId: string,
    addMetric: Function,
    refetch?: Function
  ) => {
    logger.log('🔧 useOptimisticMetricsState: Adding metrics to table', {
      count: newMetrics.length,
      targetTeamId,
      selectedTeam
    });

    // SAFETY: Validate team selection
    if (targetTeamId !== selectedTeam) {
      toast({
        title: "Error",
        description: "Can only add metrics to the currently selected team",
        variant: "destructive"
      });
      return;
    }

    // SAFETY: Validate metrics data
    if (!newMetrics || newMetrics.length === 0) {
      logger.warn('⚠️ useOptimisticMetricsState: No metrics to add');
      return;
    }

    setAddingMetrics(true);

    try {
      // Create optimistic metrics immediately for UI responsiveness
      const optimisticMetricsToAdd = newMetrics.map(createOptimisticMetric);
      setOptimisticMetrics(prev => {
        logger.log('📝 useOptimisticMetricsState: Adding optimistic metrics to state', {
          previous: prev.length,
          adding: optimisticMetricsToAdd.length,
          total: prev.length + optimisticMetricsToAdd.length
        });
        return [...prev, ...optimisticMetricsToAdd];
      });

      logger.log('✅ useOptimisticMetricsState: Added optimistic metrics to UI');

      toast({
        title: "Adding Metrics",
        description: `Adding ${newMetrics.length} metric(s) to the team...`,
      });

      // Add to backend sequentially to avoid race conditions
      const addPromises = newMetrics.map(async (metric) => {
        return addMetric({
          metric_name: metric.metric_name,
          owner_id: metric.owner_id,
          unit: metric.unit || '',
          target_value: metric.target_value || null,
          user_id: metric.owner_id
        });
      });

      await Promise.all(addPromises);

      // IMPORTANT: Clear optimistic state AFTER successful backend addition
      logger.log('🧹 useOptimisticMetricsState: Clearing optimistic state after successful backend addition');
      setOptimisticMetrics([]);

      logger.log('✅ useOptimisticMetricsState: Backend addition successful');

      toast({
        title: "Metrics Added",
        description: `Successfully added ${newMetrics.length} metric(s) to the team`,
      });

      // Refetch to get real data
      if (refetch) {
        refetch();
      }

    } catch (error) {
      logger.error('❌ useOptimisticMetricsState: Failed to add metrics:', error);
      
      // IMPORTANT: Clear optimistic state on error to prevent phantom metrics
      logger.log('🧹 useOptimisticMetricsState: Clearing optimistic state due to error');
      setOptimisticMetrics([]);
      
      // Don't show generic error for specific cases that are already handled by addMetric
      const isHandledError = error && typeof error === 'object' && 'code' in error && 
        (error as { code: string }).code === '23505'; // Duplicate constraint violation
      
      if (!isHandledError) {
        toast({
          title: "Error",
          description: "Failed to add metrics to table. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setAddingMetrics(false);
    }
  }, [selectedTeam, createOptimisticMetric, toast]);

  const clearNewMetrics = useCallback(() => {
    logger.log('🧹 useOptimisticMetricsState: Clearing new metrics state');
    setOptimisticMetrics([]);
    setAddingMetrics(false);
  }, []);

  // ENHANCED: Emergency cleanup function
  const performEmergencyCleanup = useCallback(() => {
    logger.log('🚨 useOptimisticMetricsState: Emergency cleanup triggered');
    setOptimisticMetrics([]);
    setAddingMetrics(false);
  }, []);

  const getHealthStatus = useCallback(() => {
    return {
      optimisticMetricsCount: optimisticMetrics.length,
      isAdding: addingMetrics,
      isHealthy: true,
      hasOptimisticMetrics: optimisticMetrics.length > 0
    };
  }, [optimisticMetrics.length, addingMetrics]);

  return {
    optimisticMetrics,
    addingMetrics,
    handleAddMetricsToTable,
    clearNewMetrics,
    performEmergencyCleanup,
    getHealthStatus
  };
};
