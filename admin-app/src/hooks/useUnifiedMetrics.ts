import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import { fetchMetricsData } from '@/services/metricDataService';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface UseUnifiedMetricsOptions {
  teamId?: string;
  timePeriod?: string;
  customRange?: { start: Date; end: Date };
  enabled?: boolean;
}

interface UseUnifiedMetricsReturn {
  // Data
  metrics: WeeklyMetricWithOwner[];
  loading: boolean;
  error: string | null;
  
  // Debugging & Status
  debugInfo: {
    userId: string | null;
    currentCompanyId: string | null;
    teamId: string | null;
    hasUserSettings: boolean;
    hasTeamMembership: boolean;
    queryEnabled: boolean;
    lastFetched: Date | null;
  };
  
  // Actions
  refetch: () => Promise<void>;
  clearError: () => void;
  
  // Week utilities (for compatibility)
  getWeekStarts: () => string[];
  weekStartDay: 'monday' | 'sunday';
}

export const useUnifiedMetrics = (options: UseUnifiedMetricsOptions = {}): UseUnifiedMetricsReturn => {
  const { teamId, timePeriod = 'last_13_weeks', customRange, enabled = true } = options;
  
  
  
  const { user } = useAuth();
  const { settings } = useSettings();
  const { toast } = useToast();
  
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  // Debug info for troubleshooting
  const debugInfo = useMemo(() => ({
    userId: user?.id || null,
    currentCompanyId: null, // settings doesn't have current_company_id
    teamId: teamId || null,
    hasUserSettings: !!settings,
    hasTeamMembership: false, // Will be updated by query
    queryEnabled: enabled && !!user && !!teamId,
    lastFetched
  }), [user?.id, teamId, settings, enabled, lastFetched]);

  // Week starts calculation
  const getWeekStarts = useCallback(() => {
    // 🎯 FIX: Use 'monday' as fallback to prevent flip-flop when settings load
    const weekStartDay = settings?.week_start_day ?? 'monday';
    const weeks: string[] = [];
    const now = new Date();
    
    for (let i = 12; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - (i * 7));
      
      // Adjust to the start of the week
      const dayOfWeek = date.getDay();
      const daysToSubtract = weekStartDay === 'monday' 
        ? (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
        : dayOfWeek;
      
      date.setDate(date.getDate() - daysToSubtract);
      weeks.push(date.toISOString().split('T')[0]);
    }
    
    return weeks;
  }, [settings?.week_start_day]);

  // Main data query
  const query = useQuery({
    queryKey: ['unified-metrics', user?.id, teamId, timePeriod, customRange],
    queryFn: async (): Promise<WeeklyMetricWithOwner[]> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      if (!teamId) {
        throw new Error('No team selected');
      }


      try {
        const weekStarts = getWeekStarts();
        const data = await fetchMetricsData(
          user.id,
          teamId,
          timePeriod,
          customRange,
          () => weekStarts
        );


        setLastFetched(new Date());
        setError(null);
        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch metrics';
        logger.error('🔧 useUnifiedMetrics: Fetch error', err);
        setError(errorMessage);
        throw err;
      }
    },
    enabled: enabled && !!user && !!teamId,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error.message.includes('authenticated') || error.message.includes('No team')) {
        return false;
      }
      // Retry other errors up to 2 times
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: 'always'
  });

  // Handle errors and show toast notifications
  useEffect(() => {
    if (query.error && enabled) {
      const errorMessage = query.error instanceof Error ? query.error.message : 'Failed to load metrics';
      setError(errorMessage);
      
      // Only show toast for non-auth errors to avoid spam
      if (!errorMessage.includes('authenticated') && !errorMessage.includes('No team')) {
        toast({
          title: "Metrics Loading Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
    }
  }, [query.error, enabled, toast]);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Manual refetch function
  const refetch = useCallback(async () => {
    setError(null);
    await query.refetch();
  }, [query]);

  return {
    metrics: query.data || [],
    loading: query.isLoading || query.isFetching,
    error: error || (query.error ? String(query.error) : null),
    debugInfo,
    refetch,
    clearError,
    getWeekStarts,
    // 🎯 FIX: Use 'monday' as fallback to prevent flip-flop when settings load
    weekStartDay: settings?.week_start_day ?? 'monday'
  };
};