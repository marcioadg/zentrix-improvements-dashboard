import { useQuery } from '@tanstack/react-query';
import { fetchAllUsersWithMetrics } from '@/services/analytics2Service';

/**
 * Hook to fetch comprehensive user analytics data
 */
export const useUserAnalytics = () => {
  const {
    data: users = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['user-analytics'],
    queryFn: fetchAllUsersWithMetrics,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  return {
    users,
    loading: isLoading,
    error,
    refetch,
  };
};
