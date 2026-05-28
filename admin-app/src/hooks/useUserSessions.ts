import { useQuery } from '@tanstack/react-query';
import { fetchUserSessions } from '@/services/analytics2Service';

/**
 * Hook to fetch and cache session data for a specific user
 */
export const useUserSessions = (userId: string | null) => {
  const {
    data: sessions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['user-sessions', userId],
    queryFn: () => fetchUserSessions(userId!),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    enabled: !!userId,
  });

  return {
    sessions,
    loading: isLoading,
    error,
    refetch,
  };
};
