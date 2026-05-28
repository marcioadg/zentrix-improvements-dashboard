import { useQuery } from '@tanstack/react-query';
import {
  fetchUsageMetrics,
  fetchDAUTrend,
  fetchActivityHeatmap,
  fetchSessionDurationTrend,
} from '@/services/analytics2Service';

/**
 * Hook to fetch comprehensive usage analytics data
 */
export const useUsageAnalytics = () => {
  const {
    data: metrics,
    isLoading: metricsLoading,
    error: metricsError,
  } = useQuery({
    queryKey: ['usage-metrics'],
    queryFn: fetchUsageMetrics,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  const {
    data: dauTrend = [],
    isLoading: trendLoading,
    error: trendError,
  } = useQuery({
    queryKey: ['dau-trend'],
    queryFn: fetchDAUTrend,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const {
    data: heatmap = [],
    isLoading: heatmapLoading,
    error: heatmapError,
  } = useQuery({
    queryKey: ['activity-heatmap'],
    queryFn: fetchActivityHeatmap,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const {
    data: durationTrend = [],
    isLoading: durationLoading,
    error: durationError,
  } = useQuery({
    queryKey: ['session-duration-trend'],
    queryFn: fetchSessionDurationTrend,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const loading = metricsLoading || trendLoading || heatmapLoading || durationLoading;
  const error = metricsError || trendError || heatmapError || durationError;

  return {
    metrics,
    dauTrend,
    heatmap,
    durationTrend,
    loading,
    error,
  };
};
