import { useQuery, useQueryClient } from '@tanstack/react-query';
import { loadCompanies } from '@/services/companyStatsService';
import type { CompanyStats } from '@/types/superAdmin';
import { logger } from '@/utils/logger';

/**
 * Optimized hook for company management with React Query caching
 * - Reduced query frequency with staleTime and gcTime
 * - Batched queries in the service layer
 * - Error resilience with Promise.allSettled
 */
export const useCompanyManagementOptimized = () => {
  const queryClient = useQueryClient();
  
  const {
    data: companies = [],
    isLoading,
    error,
    refetch
  } = useQuery<CompanyStats[]>({
    queryKey: ['companies-optimized'],
    queryFn: loadCompanies,
    staleTime: 0, // Always consider data stale - refetch on mount
    gcTime: 30 * 1000, // Keep in cache for 30 seconds
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Force clear cache and refetch
  const clearCacheAndRefetch = async () => {
    logger.log('🗑️ Clearing React Query cache for companies');
    await queryClient.invalidateQueries({ queryKey: ['companies-optimized'] });
    await queryClient.refetchQueries({ queryKey: ['companies-optimized'] });
  };

  // Derive sorted lists from cached data
  const recentCompanies = [...companies]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 1000);

  const recentlyActiveCompanies = [...companies]
    .sort((a, b) => {
      if (a.last_login_at && b.last_login_at) {
        return new Date(b.last_login_at).getTime() - new Date(a.last_login_at).getTime();
      }
      if (a.last_login_at) return -1;
      if (b.last_login_at) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, 1000);

  return {
    companies,
    recentCompanies,
    recentlyActiveCompanies,
    loading: isLoading,
    error: error?.message,
    refetch,
    clearCacheAndRefetch
  };
};
