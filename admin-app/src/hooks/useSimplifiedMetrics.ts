import { useCallback, useRef, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useSettings } from '@/contexts/SettingsContext';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { fetchMetricsData, clearMetricsCache } from '@/services/metricDataService';
import { getWeekStartsForPeriod } from '@/lib/weekUtils';
import { useMetricsRealtime } from '@/hooks/useMetricsRealtime';
import { logger } from '@/utils/logger';

interface UseSimplifiedMetricsProps {
  teamId: string | null;
  timePeriod?: string;
  customRange?: { start: Date; end: Date };
  onRealtimeOwnershipChange?: (metricId: string, newOwnerId: string | null, newOwnerName: string) => void;
  isInMeeting?: boolean; // ✅ NEW: Flag to indicate if we're in a meeting
}

export const useSimplifiedMetrics = ({
  teamId,
  timePeriod = 'last_13_weeks',
  customRange,
  onRealtimeOwnershipChange,
  isInMeeting = false
}: UseSimplifiedMetricsProps) => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const { settings, loading: settingsLoading } = useSettings();
  const queryClient = useQueryClient();

  const emptyMetricsRef = useRef<WeeklyMetricWithOwner[]>([]);
  const noopRef = useRef(() => {});

  // 🎯 FIX: Use 'monday' as fallback to prevent flip-flop when settings load
  // Never default to 'sunday' if user's actual setting is 'monday'
  const weekStartDay = settings?.week_start_day ?? 'monday';

  // 🎯 MEMOIZED: Stable query key to prevent unnecessary re-queries
  const queryKey = useMemo(() => [
    'simplified-metrics',
    currentCompany?.id,
    teamId,
    timePeriod,
    weekStartDay,
    customRange?.start?.toISOString(),
    customRange?.end?.toISOString()
  ], [currentCompany?.id, teamId, timePeriod, weekStartDay, customRange]);

  // 🎯 MEMOIZED: Week starts calculation
  const getWeekStarts = useCallback(() => {
    return getWeekStartsForPeriod(timePeriod, customRange, weekStartDay);
  }, [timePeriod, customRange, weekStartDay]);

  // Main metrics query
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey,
    queryFn: async (): Promise<WeeklyMetricWithOwner[]> => {
      if (!user || !currentCompany || !teamId) {
        return [];
      }

      // In meetings the section unmounts/remounts, so the service-level cache (5-min TTL)
      // would serve stale data even after React Query fires a fresh queryFn.
      // Clear it here so fetchMetricsData always hits the DB on meeting section entry.
      if (isInMeeting) {
        clearMetricsCache();
      }

      const fetchedMetrics = await fetchMetricsData(
        user.id,
        teamId,
        timePeriod,
        customRange,
        getWeekStarts
      );

      return fetchedMetrics;
    },
    // 🎯 FIX: Wait for settings to load before enabling query to prevent weekStartDay flip-flop
    enabled: !!user && !!currentCompany && !!teamId && !settingsLoading,
    staleTime: 60000, // 1 minute - reduced query frequency
    gcTime: 300000, // 5 minutes
    // In meetings the metrics section unmounts/remounts between agenda sections, so cached data
    // can be up to 60s stale. Force a fresh fetch on every mount to guarantee consistency.
    refetchOnMount: isInMeeting ? 'always' : true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // ✅ OPTIMIZATION: Let realtime handle sync
    placeholderData: (previousData) => previousData,
    retry: 1 // ✅ OPTIMIZATION: Reduce retries, realtime will catch up
  });

  // Use stable empty array when no data to prevent infinite loops
  const metrics = data ?? emptyMetricsRef.current;

  // 🎯 CRITICAL FIX: Use React Query's functional updater to avoid stale closure
  // Previous bug: `newMetrics(metrics)` used `metrics` from closure (stale during rapid updates)
  // Fix: React Query's setQueryData with functional updater always provides current cache value
  const setMetrics = useCallback((
    newMetrics: WeeklyMetricWithOwner[] | ((prev: WeeklyMetricWithOwner[]) => WeeklyMetricWithOwner[])
  ) => {
    queryClient.setQueryData(queryKey, (oldData: WeeklyMetricWithOwner[] | undefined) => {
      const currentMetrics = oldData ?? [];
      return typeof newMetrics === 'function' ? newMetrics(currentMetrics) : newMetrics;
    });
  }, [queryClient, queryKey]); // ✅ REMOVED metrics from deps - callback is now stable

  const forceRefresh = useCallback(async () => {
    if (!teamId) return;

    if (isInMeeting) {
      clearMetricsCache();
      await queryClient.invalidateQueries({ queryKey, refetchType: 'active' });
      return;
    }

    await refetch();
  }, [isInMeeting, queryClient, queryKey, refetch, teamId]);

  // Multi-team metrics have a primary team_id that differs from the viewing team.
  // We need to subscribe to those additional team IDs so realtime events are delivered.
  const additionalTeamIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of metrics) {
      if (m.team_id && m.team_id !== teamId) {
        ids.add(m.team_id);
      }
    }
    return [...ids];
  }, [metrics, teamId]);

  // Setup real-time subscription
  useMetricsRealtime(teamId, metrics, setMetrics, forceRefresh, onRealtimeOwnershipChange, isInMeeting, additionalTeamIds);

  // 🎯 Listen for metric creation events from other pages (matches goal pattern in useMobileGoals)
  useEffect(() => {
    const handleMetricCreated = (event: CustomEvent) => {
      // Refetch if the event is for our team or if we don't have a specific team filter
      if (!teamId || event.detail?.team_id === teamId) {
        forceRefresh();
      }
    };

    window.addEventListener('metric-created-success', handleMetricCreated as EventListener);

    return () => {
      window.removeEventListener('metric-created-success', handleMetricCreated as EventListener);
    };
  }, [teamId, forceRefresh]);

  return {
    metrics,
    setMetrics,
    // 🎯 FIX: Include settingsLoading in loading state to prevent rendering with wrong weekStartDay
    loading: isLoading || settingsLoading,
    error: error?.message || null,
    refetch: forceRefresh,
    getWeekStarts,
    weekStartDay,
    fetchMetrics: forceRefresh,
    deletionInProgress: false,
    setDeletionInProgress: noopRef.current,
    userId: user?.id || '',
    retryCount: 0,
    canRetry: true,
  };
};