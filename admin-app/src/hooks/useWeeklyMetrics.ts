import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import { getCurrentWeekStart, WeekStartDay } from '@/lib/weekUtils';
import { formatWeekDate, getOwnerInitials, checkTargetCondition } from '@/utils/metricUtils';
import { useMetricsOperations } from '@/hooks/useMetricsOperations';
import { useMetricsFormatting } from '@/hooks/useMetricsFormatting';
import { useSimplifiedMetrics } from '@/hooks/useSimplifiedMetrics';
import { logger } from '@/utils/logger';

export type { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';

export const useWeeklyMetrics = (teamId?: string, timePeriod: string = 'last_13_weeks', customRange?: { start: Date; end: Date }, userWeekStartDay?: 'monday' | 'sunday', isInMeeting?: boolean, publishMetricCreated?: (metric: any) => void) => {
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousTeamIdRef = useRef<string | undefined>(undefined);
  const deletionInProgressRef = useRef(false);
  const beingDeletedRef = useRef(new Set<string>());
  
  // STABLE refetch reference that NEVER changes - prevents circular dependencies
  const stableRefetchRef = useRef<((force?: boolean) => Promise<void>) | null>(null);

  // Stable fallback functions — created once, never change
  const noopSetMetrics = useCallback(() => {}, []);
  const noopGetWeekStarts = useCallback(() => [] as string[], []);
  const noopSetDeletion = useCallback(() => {}, []);

  // Enhanced team change detection with reduced logging
  useEffect(() => {
    const hasTeamChanged = previousTeamIdRef.current !== undefined && previousTeamIdRef.current !== teamId;
    
    if (hasTeamChanged) {
      logger.debug('🔄 Team changed from', previousTeamIdRef.current, 'to', teamId);
      
      // Clear any pending cleanup
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
        cleanupTimeoutRef.current = null;
      }
    }
    
    previousTeamIdRef.current = teamId;
  }, [teamId]);

  // 🎯 MEMOIZED: Always call all hooks in the same order - but with proper team validation
  const dataManager = useSimplifiedMetrics({
    teamId: teamId && teamId.trim() ? teamId : null, // Ensure valid teamId
    timePeriod,
    customRange,
    isInMeeting // ✅ MEETING FIX: Pass isInMeeting flag to optimize real-time behavior
  });
  const formatting = useMetricsFormatting();

  // Cleanup effect
  React.useEffect(() => {
    return () => {
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
    };
  }, []);

  // Get safe defaults from data manager
  const {
    metrics = [],
    setMetrics,
    loading = false,
    error = null,
    fetchMetrics,
    getWeekStarts,
    deletionInProgress = false,
    setDeletionInProgress,
    weekStartDay = 'sunday',
    userId = '',
    retryCount = 0,
    canRetry = false
  } = dataManager || {};

  // Keep refetch ref in sync with latest fetchMetrics to avoid stale closures
  if (fetchMetrics) {
    stableRefetchRef.current = fetchMetrics;
  }

  // Keep refs in sync with latest values
  deletionInProgressRef.current = deletionInProgress;

  const operations = useMetricsOperations(
    metrics,
    setMetrics || noopSetMetrics,
    teamId || '',
    getWeekStarts || noopGetWeekStarts,
    stableRefetchRef.current || (async () => {}),
    deletionInProgressRef,
    beingDeletedRef,
    setDeletionInProgress || noopSetDeletion,
    userId,
    weekStartDay,
    publishMetricCreated
  );

  // Get safe defaults from formatting
  const { getValueColor, formatValue } = formatting || { 
    getValueColor: () => 'text-foreground', 
    formatValue: (val: number) => val?.toString() || '' 
  };

  // Get safe defaults from operations
  const {
    updateMetric,
    updateMetricConfiguration,
    addMetric,
    removeMetric,
    bulkRemoveMetrics,
    reorderMetrics,
    deleteMetricFromAllTeams
  } = operations || {
    updateMetric: async () => {},
    updateMetricConfiguration: async () => {},
    addMetric: async () => {},
    removeMetric: async () => {},
    bulkRemoveMetrics: async () => {},
    reorderMetrics: async () => {},
    deleteMetricFromAllTeams: async () => {}
  };

  // 🎯 MEMOIZED: Create STABLE week starts function
  const getLast13WeeksStartDates = useCallback((overrideWeekStartDay?: 'monday' | 'sunday') => {
    if (!getWeekStarts) {
      return [];
    }
    try {
      return getWeekStarts();
    } catch (err) {
      logger.error('Error getting week starts:', err);
      return [];
    }
  }, [getWeekStarts]);

  // 🎯 MEMOIZED: Calculate current week start
  const currentWeekStart = useMemo(() => getCurrentWeekStart(weekStartDay), [weekStartDay]);

  // Handle missing teamId in return value, not hook execution
  const isValidTeamId = !!teamId;
  const hasValidData = !!dataManager && isValidTeamId;

  // Create a more stable refetch function with better error handling
  const stableRefetch = useCallback(async (force?: boolean): Promise<void> => {
    if (!hasValidData || !stableRefetchRef.current) {
      return;
    }

    try {
      await stableRefetchRef.current(force);
    } catch (err) {
      logger.error('❌ Refetch failed for team:', teamId, err);
      throw err;
    }
  }, [hasValidData, teamId]);

  // Create a memoized formatWeekDate function that's bound to the correct weekStartDay
  const boundFormatWeekDate = useMemo(() => {
    const effectiveWeekStartDay = userWeekStartDay || weekStartDay;
    return (weekStart: string) => formatWeekDate(weekStart, effectiveWeekStartDay);
  }, [userWeekStartDay, weekStartDay]);

  const effectiveWeekStartDay = userWeekStartDay || weekStartDay;

  return useMemo(() => ({
    metrics,
    setMetrics,
    loading,
    error,
    updateMetric,
    updateMetricConfiguration,
    addMetric,
    removeMetric,
    bulkRemoveMetrics,
    reorderMetrics,
    deleteMetricFromAllTeams,
    getLast13WeeksStartDates,
    formatWeekDate: boundFormatWeekDate,
    getValueColor,
    formatValue,
    refetch: stableRefetch,
    weekStartDay: effectiveWeekStartDay,
    userId,
    retryCount,
    canRetry,
    currentWeekStart,
    getOwnerInitials,
    checkTargetCondition
  }), [
    metrics, setMetrics, loading, error,
    updateMetric, updateMetricConfiguration, addMetric, removeMetric,
    bulkRemoveMetrics, reorderMetrics, deleteMetricFromAllTeams,
    getLast13WeeksStartDates, boundFormatWeekDate, getValueColor, formatValue,
    stableRefetch, effectiveWeekStartDay, userId, retryCount, canRetry, currentWeekStart
  ]);
};