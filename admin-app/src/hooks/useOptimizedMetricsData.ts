
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/SettingsContext';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { getWeekStartsForPeriod } from '@/lib/weekUtils';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { fetchMetricsData } from '@/services/metricDataService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface MetricsCache {
  [companyTeamKey: string]: {
    data: WeeklyMetricWithOwner[];
    timestamp: number;
    weekStartDay: string;
  };
}

const CACHE_DURATION = 15 * 60 * 1000; // Increased from 2 minutes to 15 minutes
const metricsCache: MetricsCache = {};

export const useOptimizedMetricsData = (
  teamId?: string, 
  timePeriod: string = 'last_13_weeks', 
  customRange?: { start: Date; end: Date }
) => {
  const { user } = useAuth();
  const { currentCompany, loading: companyLoading } = useMultiCompany();
  const { settings } = useSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isVisible: isPageVisible } = usePageVisibility();
  
  const [error, setError] = useState<string | null>(null);
  const deletionInProgress = useRef(false);
  const previousCompanyIdRef = useRef<string | null>(null);
  // ✅ DEPRECATED: Real-time channel removed - useMetricsRealtime handles all sync
  
  // Get user's preferred week start day
  const weekStartDay = settings?.week_start_day || 'sunday';
  
  // Generate cache key with timestamp for better cache invalidation
  const cacheKey = `${currentCompany?.id || 'no-company'}-${teamId || 'no-team'}-${timePeriod}-${weekStartDay}`;
  
  const getLast13WeeksStartDates = useCallback((overrideWeekStartDay?: 'monday' | 'sunday') => {
    const effectiveWeekStartDay = overrideWeekStartDay || weekStartDay;
    return getWeekStartsForPeriod(timePeriod, customRange, effectiveWeekStartDay);
  }, [timePeriod, customRange, weekStartDay]);

  // Check cache for existing data
  const getCachedData = useCallback(() => {
    const cached = metricsCache[cacheKey];
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
      logger.debug('Using cached metrics data');
      return cached.data;
    }
    return null;
  }, [cacheKey]);

  // Enhanced company change handling to ensure metrics refresh
  useEffect(() => {
    const currentCompanyId = currentCompany?.id || null;
    const previousCompanyId = previousCompanyIdRef.current;
    
    if (previousCompanyId !== null && previousCompanyId !== currentCompanyId) {
      logger.debug('Company changed - clearing cache and refreshing metrics');
      
      // Clear cache for both previous and current company to ensure fresh data
      const keysToDelete = Object.keys(metricsCache).filter(key => 
        key.startsWith(previousCompanyId) || key.startsWith(currentCompanyId || 'no-company')
      );
      
      keysToDelete.forEach(key => {
        delete metricsCache[key];
      });
      
      // Clear React Query cache for both companies
      queryClient.removeQueries({ 
        queryKey: ['metrics', previousCompanyId] 
      });
      queryClient.removeQueries({ 
        queryKey: ['metrics', currentCompanyId] 
      });
      
      // Force refetch for the new company by invalidating all metrics queries
      queryClient.invalidateQueries({ 
        queryKey: ['metrics'] 
      });
      
      setError(null);
      logger.debug('Cache cleared and queries invalidated for company switch');
    }
    
    previousCompanyIdRef.current = currentCompanyId;
  }, [currentCompany?.id, queryClient]);

  // Create more specific query key for better cache management
  const queryKey = ['metrics', currentCompany?.id, teamId, timePeriod, weekStartDay, customRange?.start?.toISOString(), customRange?.end?.toISOString()];

  // Use React Query with optimized configuration for better performance
  const {
    data: metrics = [],
    isLoading,
    error: queryError,
    refetch
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!user || !currentCompany) {
        logger.debug('No user or company context for metrics fetch');
        return [];
      }

      // Check cache first with extended duration
      const cachedData = getCachedData();
      if (cachedData) {
        return cachedData;
      }

      try {
        logger.debug('Fetching fresh metrics data');
        const fetchedMetrics = await fetchMetricsData(
          user.id,
          teamId,
          timePeriod,
          customRange,
          getLast13WeeksStartDates
        );
        
        // Cache the result with extended duration
        metricsCache[cacheKey] = {
          data: fetchedMetrics,
          timestamp: Date.now(),
          weekStartDay
        };
        
        logger.debug('Metrics data cached successfully', { count: fetchedMetrics.length });
        return fetchedMetrics;
      } catch (err) {
        logger.error('Error fetching metrics:', err);
        throw err;
      }
    },
    enabled: !!user && !!currentCompany && !companyLoading, // Removed isPageVisible - let staleTime handle freshness
    staleTime: 15 * 60 * 1000, // 15 minutes instead of 1 minute
    gcTime: 60 * 60 * 1000, // 1 hour instead of 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // Don't refetch on reconnect
    refetchInterval: false, // Disable automatic polling
    retry: 1 // Reduce retries from 3 to 1
  });

  // ✅ OPTIMIZATION: Removed duplicate real-time subscription
  // This hook is deprecated in favor of useSimplifiedMetrics which already uses useMetricsRealtime
  // The duplicate subscription here caused WebSocket overhead and competing cache invalidations
  // If this hook is still used, it will rely on React Query cache invalidation instead

  // Handle query errors
  useEffect(() => {
    if (queryError) {
      const errorMessage = queryError instanceof Error ? queryError.message : 'An error occurred';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } else {
      setError(null);
    }
  }, [queryError, toast]);

  // Optimized setMetrics function for external updates with cache invalidation
  const setMetrics = useCallback((newMetrics: WeeklyMetricWithOwner[] | ((prev: WeeklyMetricWithOwner[]) => WeeklyMetricWithOwner[])) => {
    const updatedMetrics = typeof newMetrics === 'function' ? newMetrics(metrics) : newMetrics;
    
    logger.debug('setMetrics called', { count: updatedMetrics.length });
    
    // Clear local cache to force fresh data
    delete metricsCache[cacheKey];
    
    // Update React Query cache with optimistic update
    queryClient.setQueryData(queryKey, updatedMetrics);
    
  }, [metrics, cacheKey, queryClient, queryKey]);

  // Enhanced fetchMetrics function with better cache management
  const fetchMetrics = useCallback(async () => {
    logger.debug('Manual metrics refetch triggered, clearing cache first');
    
    // Clear local cache
    delete metricsCache[cacheKey];
    
    // Invalidate React Query cache to force fresh fetch
    await queryClient.invalidateQueries({ queryKey });
    
    // Trigger refetch
    const result = await refetch();
    
    logger.debug('Manual metrics refetch completed');
    return result;
  }, [refetch, cacheKey, queryClient, queryKey]);

  // ✅ OPTIMIZATION: Removed cleanup for deprecated real-time subscription

  return {
    metrics,
    setMetrics,
    loading: isLoading,
    error,
    fetchMetrics,
    getLast13WeeksStartDates,
    deletionInProgress
  };
};
