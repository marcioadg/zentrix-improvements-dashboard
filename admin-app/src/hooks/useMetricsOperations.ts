import { useCallback, useMemo, useRef } from 'react';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { logger } from '@/utils/logger';
import { 
  createMetric, 
  updateMetricValue, 
  updateMetricConfig, 
  deleteMetric, 
  deleteMetricFromAllTeams as deleteMetricFromAllTeamsService, 
  bulkDeleteMetrics 
} from '@/services/metricOperations';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getWeekStart, WeekStartDay } from '@/lib/weekUtils';
import { markCellPending, clearCellPending, markConfigPending, clearConfigPending, markReorderPending, clearReorderPending } from '@/hooks/useMetricsRealtime';

// Debounce utility for batching operations
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const useMetricsOperations = (
  metrics: WeeklyMetricWithOwner[],
  setMetrics: (metrics: WeeklyMetricWithOwner[] | ((prev: WeeklyMetricWithOwner[]) => WeeklyMetricWithOwner[])) => void,
  teamId: string,
  getWeekStarts: () => string[],
  refetch: (force?: boolean) => Promise<void>,
  deletionInProgressRef: { current: boolean },
  beingDeletedRef: { current: Set<string> },
  setDeletionInProgress: (inProgress: boolean) => void,
  userId: string,
  weekStartDay: WeekStartDay = 'monday',
  publishMetricCreated?: (metric: WeeklyMetricWithOwner) => void
) => {
  const { toast } = useToast();

  // Stable ref for metrics — callbacks read from ref instead of closing over the array
  const metricsRef = useRef(metrics);
  metricsRef.current = metrics;

  const updateMetric = useCallback(async (metricId: string, weekStart: string, value: number | null) => {
    const metric = metricsRef.current.find(m => m.id === metricId);
    if (!metric) {
      logger.error('❌ Metric not found:', metricId);
      return;
    }

    // Store original value for rollback on error
    // ✅ SAFETY: Use optional chaining to handle undefined weeklyValues (newly created metrics)
    const originalValue = metric.weeklyValues?.[weekStart] ?? null;
    
    logger.debug('🔧 Updating metric value:', { metricId, weekStart, value, originalValue });

    // ✅ FIX: Mark cell as pending to prevent realtime from overwriting optimistic update
    markCellPending(metricId, weekStart);

    // Apply optimistic update immediately for better UX
    // ✅ SAFETY: Ensure weeklyValues exists before spread (handles newly created metrics)
    setMetrics(prevMetrics => 
      prevMetrics.map(m => 
        m.id === metricId 
          ? { 
              ...m, 
              weeklyValues: { 
                ...(m.weeklyValues || {}), 
                [weekStart]: value 
              } 
            }
          : m
      )
    );

    try {
      // Perform the database update
      await updateMetricValue(metricId, weekStart, value, metric, userId);
      
      logger.debug('✅ Metric updated successfully');
      
      // Real-time subscription will handle the final state sync
      // No need to refetch manually as it causes duplicate displays
      
    } catch (error) {
      logger.error('❌ Update metric failed:', error);
      
      // Rollback optimistic update on error
      // ✅ SAFETY: Ensure weeklyValues exists before spread (handles newly created metrics)
      setMetrics(prevMetrics => 
        prevMetrics.map(m => 
          m.id === metricId 
            ? { 
                ...m, 
                weeklyValues: { 
                  ...(m.weeklyValues || {}), 
                  [weekStart]: originalValue 
                } 
              }
            : m
        )
      );
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update metric",
        variant: "destructive",
      });
      throw error;
    } finally {
      // ✅ FIX: Clear pending status after a short delay to allow realtime to process
      // The delay ensures the realtime event (which confirms the DB write) arrives after we clear
      setTimeout(() => {
        clearCellPending(metricId, weekStart);
      }, 500);
    }
  }, [setMetrics, userId, toast]);

  const updateMetricConfiguration = useCallback(async (metricId: string, config: any) => {
    const currentMetric = metricsRef.current.find(m => m.id === metricId);
    
    if (!currentMetric) {
      logger.error('❌ Metric not found for config update:', metricId);
      toast({
        title: "Error",
        description: "Metric not found. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }
    
    // Store original for rollback
    const originalMetric = { ...currentMetric };
    
    try {
      // Duplicate-name detection is handled server-side in updateMetricConfig and
      // surfaced as a thrown error here, so the catch block toasts the clean message.
      // A client-side check was previously here but only WARNED before letting the
      // write proceed, producing a misleading "both will be kept" toast followed by
      // a cryptic DB failure.

      // ✅ FIX: Mark as pending BEFORE optimistic update to prevent realtime from overwriting
      markConfigPending(metricId);
      
      // ✅ FIX: Apply optimistic update immediately for instant UI feedback
      setMetrics(prev => prev.map(m => {
        if (m.id === metricId) {
          return {
            ...m,
            metric_name: config.metric_name ?? m.metric_name,
            owner_id: config.owner_id ?? m.owner_id,
            unit: config.unit ?? m.unit,
            target_value: config.target_value !== undefined ? config.target_value : m.target_value,
            target_logic: config.target_logic ?? m.target_logic,
            description: config.description !== undefined ? config.description : m.description,
            assistant_id: config.assistant_id !== undefined ? config.assistant_id : m.assistant_id,
            is_formula: config.is_formula !== undefined ? config.is_formula : m.is_formula,
            formula_components: config.formula_components !== undefined ? config.formula_components : m.formula_components,
            aggregation_type: config.aggregation_type ?? m.aggregation_type,
            updated_at: new Date().toISOString(),
            // If owner changed, update owner name placeholder (refetch will get real name)
            ...(config.owner_id && config.owner_id !== m.owner_id ? { owner: 'Updating...' } : {})
          };
        }
        return m;
      }));
      
      logger.log('✅ Optimistic config update applied for metric:', metricId);
      
      // Perform database update
      await updateMetricConfig(metricId, config);
      
      logger.log('✅ Metric configuration saved to database');
      
      // ✅ FIX: Clear pending after successful save (with delay to skip our own realtime event)
      clearConfigPending(metricId);
      
      // If owner changed, refetch to get the new owner's profile name
      if (config.owner_id && config.owner_id !== originalMetric.owner_id) {
        logger.log('🔄 Owner changed, refetching for profile data');
        refetch();
      }
      
    } catch (error) {
      logger.error('❌ Update metric config failed:', error);
      
      // ✅ FIX: Rollback optimistic update on error
      setMetrics(prev => prev.map(m => 
        m.id === metricId ? originalMetric : m
      ));
      
      // Clear pending status
      clearConfigPending(metricId);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update metric configuration",
        variant: "destructive",
      });
      throw error;
    }
  }, [setMetrics, toast, refetch]);

  // Enhanced addMetric with better validation and error handling
  const addMetric = useCallback(async (metricData: {
    metric_name: string;
    unit: string;
    owner_id: string;
    target_value?: number;
    target_logic?: string;
    is_formula?: boolean;
    formula_components?: any[];
    team_id?: string;
    initial_value?: number;
    aggregation_type?: string;
  }) => {
    try {
      // Validate required fields
      if (!metricData.metric_name?.trim()) {
        throw new Error('Metric name is required');
      }
      if (!metricData.unit?.trim()) {
        throw new Error('Unit is required');
      }
      if (!metricData.owner_id) {
        throw new Error('Owner is required');
      }

      const effectiveTeamId = metricData.team_id || teamId;
      
      logger.log('🔄 Adding optimistic metric to UI:', metricData.metric_name);
      logger.log('🔄 Current metrics count before add:', metricsRef.current.length);
      
      // Calculate proper week start date based on user settings
      // Use locale-safe formatting to prevent timezone shift issues (e.g., French midnight → UTC previous day)
      const weekStart = getWeekStart(new Date(), weekStartDay);
      const year = weekStart.getFullYear();
      const month = String(weekStart.getMonth() + 1).padStart(2, '0');
      const day = String(weekStart.getDate()).padStart(2, '0');
      const weekStartDate = `${year}-${month}-${day}`;
      logger.log('🔄 Using week start date:', weekStartDate, 'for weekStartDay:', weekStartDay);
      
      // Create optimistic metric entry for immediate UI update
      const optimisticMetric: WeeklyMetricWithOwner = {
        id: `temp-${Date.now()}`,
        metric_name: metricData.metric_name.trim(),
        unit: metricData.unit.trim(),
        owner_id: metricData.owner_id,
        user_id: userId, // Required field
        metric_value: null, // Don't pre-populate - let user enter when ready
        week_start_date: weekStartDate, // Use calculated week start
        owner: 'Loading...', // Will be updated with real data
        target_value: metricData.target_value || 0,
        target_logic: metricData.target_logic || 'greater_than_or_equal',
        team_id: effectiveTeamId,
        is_formula: metricData.is_formula || false,
        formula_components: metricData.formula_components || [],
        aggregation_type: metricData.aggregation_type || 'total',
        weeklyValues: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Add optimistic metric to UI immediately with detailed logging
      setMetrics(prev => {
        const newMetrics = [...prev, optimisticMetric];
        logger.log('🔄 setMetrics called - optimistic update:', {
          previousCount: prev.length,
          newCount: newMetrics.length,
          addedMetric: optimisticMetric.metric_name
        });
        return newMetrics;
      });

      // Create the actual metric in the backend
      logger.log('🔄 Creating metric in backend...');
      const createdMetric = await createMetric(
        metricData.metric_name.trim(),
        metricData.unit.trim(),
        metricData.owner_id,
        metricData.target_value,
        metricData.target_logic || 'greater_than_or_equal',
        userId,
        effectiveTeamId,
        metricData.is_formula,
        metricData.formula_components,
        metricData.aggregation_type || 'total',
        weekStartDay
      );
      
      logger.log('✅ Metric created in backend');
      
      // 1. IMMEDIATELY replace optimistic metric with real ID (no blocking refetch)
      setMetrics(prev => prev.map(m => 
        m.id === optimisticMetric.id 
          ? { ...m, id: createdMetric.id }
          : m
      ));
      
      // 2. IMMEDIATELY broadcast to other participants (before any refetch)
      if (publishMetricCreated && createdMetric) {
        const broadcastMetric: WeeklyMetricWithOwner = {
          id: createdMetric.id,
          metric_name: createdMetric.metric_name || metricData.metric_name.trim(),
          unit: metricData.unit.trim(),
          owner_id: createdMetric.owner_id || metricData.owner_id,
          user_id: userId,
          metric_value: createdMetric.metric_value ?? null,
          week_start_date: createdMetric.week_start_date || optimisticMetric.week_start_date,
          owner: optimisticMetric.owner,
          target_value: metricData.target_value || 0,
          target_logic: metricData.target_logic || 'greater_than_or_equal',
          team_id: effectiveTeamId,
          is_formula: metricData.is_formula || false,
          formula_components: metricData.formula_components || [],
          aggregation_type: metricData.aggregation_type || 'total',
          weeklyValues: {},
          created_at: createdMetric.created_at || new Date().toISOString(),
          updated_at: createdMetric.updated_at || new Date().toISOString(),
        };
        logger.log('📤 Broadcasting metric creation:', { metricId: broadcastMetric.id });
        publishMetricCreated(broadcastMetric);
      }
      
      // 🎯 Dispatch window event for cross-page synchronization (matches goal pattern)
      window.dispatchEvent(new CustomEvent('metric-created-success', {
        detail: {
          team_id: effectiveTeamId,
          metric_name: metricData.metric_name,
          metric_id: createdMetric.id
        }
      }));
      logger.log('📤 Dispatched metric-created-success event for cross-page sync');
      
      // 3. Show success immediately
      toast({
        title: "Success",
        description: `${metricData.metric_name} has been added successfully`,
      });
      
      // 4. Background refetch for eventual consistency (non-blocking)
      refetch().catch(err => logger.warn('Background refetch failed:', err));
      
      logger.log('✅ Metric added successfully');
    } catch (error) {
      logger.error('❌ Add metric failed:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add metric",
        variant: "destructive",
      });
      throw error;
    }
  }, [userId, teamId, refetch, toast, weekStartDay, setMetrics, publishMetricCreated]);

  // Optimistic removeMetric with immediate UI update
  const removeMetric = useCallback(async (metricId: string) => {
    logger.log('🗑️ removeMetric called with ID:', metricId);
    
    if (deletionInProgressRef.current || beingDeletedRef.current.has(metricId)) {
      logger.log('🔧 Deletion already in progress, skipping');
      return;
    }

    const metric = metricsRef.current.find(m => m.id === metricId);
    logger.log('🔍 Found metric to delete:', metric);
    
    if (!metric) {
      logger.error('❌ Metric not found for ID:', metricId);
      throw new Error('Metric not found');
    }

    try {
      beingDeletedRef.current.add(metricId);
      logger.log('🎯 Starting optimistic removal for metric:', metric.metric_name);
      
      // 1. Optimistically remove from UI immediately
      setMetrics(prevMetrics => {
        const newMetrics = prevMetrics.filter(m => m.id !== metricId);
        logger.log('📊 Metrics after optimistic removal:', newMetrics.length, 'from', prevMetrics.length);
        return newMetrics;
      });
      
      // 2. Show optimistic feedback with undo option
      toast({
        title: "Metric Deleted",
        description: `"${metric.metric_name}" has been deleted from this team`,
        action: {
          label: "Undo",
          onClick: () => {
            logger.log('🔄 Undoing deletion for:', metric.metric_name);
            // Restore metric on undo
            setMetrics(prevMetrics => [...prevMetrics, metric]);
          }
        }
      });
      
      // 3. Perform actual database deletion
      logger.log('🗂️ Calling deleteMetric service for:', metric.metric_name, 'teamId:', teamId);
      await deleteMetric(metric.metric_name, metric.owner_id, teamId);
      
      logger.log('✅ Metric removed successfully from backend');
    } catch (error) {
      logger.error('❌ Remove metric failed:', error);
      
      // 4. Rollback optimistic update on error
      logger.log('🔄 Rolling back optimistic removal');
      setMetrics(prevMetrics => [...prevMetrics, metric]);
      
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to remove metric",
        variant: "destructive",
      });
      throw error;
    } finally {
      beingDeletedRef.current.delete(metricId);
    }
  }, [teamId, setMetrics, deletionInProgressRef, beingDeletedRef, toast]);

  // Optimistic deleteMetricFromAllTeams with immediate UI update
  const deleteMetricFromAllTeams = useCallback(async (metricName: string, ownerId: string) => {
    if (deletionInProgressRef.current) {
      logger.log('🔧 Deletion already in progress, skipping');
      return;
    }

    const metricsToDelete = metricsRef.current.filter(m => m.metric_name === metricName && m.owner_id === ownerId);
    
    try {
      setDeletionInProgress(true);
      
      // 1. Optimistically remove from UI immediately
      setMetrics(prevMetrics => 
        prevMetrics.filter(m => !(m.metric_name === metricName && m.owner_id === ownerId))
      );
      
      // 2. Show optimistic feedback with undo option
      toast({
        title: "Metric Deleted",
        description: `"${metricName}" has been deleted from all teams`,
        action: {
          label: "Undo",
          onClick: () => {
            // Restore metrics on undo
            setMetrics(prevMetrics => [...prevMetrics, ...metricsToDelete]);
          }
        }
      });
      
      // 3. Perform actual database deletion
      await deleteMetricFromAllTeamsService(metricName, ownerId);
      
      logger.log('✅ Metric deleted from all teams');
    } catch (error) {
      logger.error('❌ Delete metric from all teams failed:', error);
      
      // 4. Rollback optimistic update on error
      setMetrics(prevMetrics => [...prevMetrics, ...metricsToDelete]);
      
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete metric from all teams",
        variant: "destructive",
      });
      throw error;
    } finally {
      setDeletionInProgress(false);
    }
  }, [setMetrics, refetch, deletionInProgressRef, setDeletionInProgress, toast]);

  // Optimistic bulk remove with immediate UI update
  const bulkRemoveMetrics = useCallback(async (metricIds: string[]) => {
    if (deletionInProgressRef.current) {
      logger.log('🔧 Bulk deletion already in progress, skipping');
      return;
    }

    if (metricIds.length === 0) {
      logger.log('🔧 No metrics to delete');
      return;
    }

    const metricsToDelete = metricIds.map(id => {
      const metric = metricsRef.current.find(m => m.id === id);
      if (!metric) throw new Error(`Metric with id ${id} not found`);
      return metric;
    });

    try {
      setDeletionInProgress(true);
      
      // 1. Optimistically remove from UI immediately
      setMetrics(prevMetrics => prevMetrics.filter(m => !metricIds.includes(m.id)));
      
      // 2. Show optimistic feedback with undo option
      toast({
        title: "Metrics Deleted",
        description: `${metricIds.length} metrics have been deleted`,
        action: {
          label: "Undo",
          onClick: () => {
            // Restore metrics on undo
            setMetrics(prevMetrics => [...prevMetrics, ...metricsToDelete]);
          }
        }
      });
      
      // 3. Prepare data for service call
      const metricsData = metricsToDelete.map(metric => ({
        metricName: metric.metric_name,
        ownerId: metric.owner_id,
        teamId: teamId
      }));
      
      // 4. Perform actual database deletion
      await bulkDeleteMetrics(metricsData);
      
      logger.log(`✅ Bulk deleted ${metricIds.length} metrics`);
    } catch (error) {
      logger.error('❌ Bulk remove metrics failed:', error);
      
      // 5. Rollback optimistic update on error
      setMetrics(prevMetrics => [...prevMetrics, ...metricsToDelete]);
      
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to remove metrics",
        variant: "destructive",
      });
      throw error;
    } finally {
      setDeletionInProgress(false);
    }
  }, [teamId, setMetrics, deletionInProgressRef, setDeletionInProgress, toast]);

  // Optimized reorderMetrics with better state management
  const reorderMetrics = useCallback(async (metricIds: string[], displayOrders: number[]) => {
    // ✅ FIX: Mark reorder as pending BEFORE optimistic update to prevent polling from overwriting
    markReorderPending();
    
    try {
      // Optimistically update local state with proper display_order values
      setMetrics(prevMetrics => {
        const updatedMetrics = prevMetrics.map(metric => {
          const affectedIndex = metricIds.indexOf(metric.id);
          if (affectedIndex !== -1) {
            return { ...metric, display_order: displayOrders[affectedIndex] };
          }
          return metric;
        });
        return updatedMetrics;
      });
      
      // Call Supabase RPC function with only affected metrics
      const { data, error } = await supabase.rpc('reorder_metrics', {
        p_metric_ids: metricIds,
        p_display_orders: displayOrders
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to reorder metrics');
      }

      logger.log(`✅ Reordered ${data.updated_count} metrics`);
      
      // ✅ Clear reorder pending after RPC success (with delay for realtime events to settle)
      clearReorderPending();
      
      toast({
        title: "Success",
        description: `Reordered ${data.updated_count} metrics`,
      });

    } catch (error) {
      logger.error('❌ Reorder metrics failed:', error);
      
      // ✅ Clear reorder pending immediately on error
      clearReorderPending();
      
      // Refresh data to restore correct order on error
      try {
        await refetch(true);
      } catch (refreshError) {
        logger.error('Failed to refresh data after reorder error:', refreshError);
      }
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reorder metrics",
        variant: "destructive",
      });
      throw error;
    }
  }, [setMetrics, refetch, toast]);

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    updateMetric,
    updateMetricConfiguration,
    addMetric,
    removeMetric,
    bulkRemoveMetrics,
    reorderMetrics,
    deleteMetricFromAllTeams
  }), [updateMetric, updateMetricConfiguration, addMetric, removeMetric, bulkRemoveMetrics, reorderMetrics, deleteMetricFromAllTeams]);
};