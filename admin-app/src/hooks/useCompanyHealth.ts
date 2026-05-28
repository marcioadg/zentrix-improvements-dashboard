import { useQuery } from '@tanstack/react-query';
import { fetchCompanyHealthData, CompanyHealthData } from '@/services/analytics2Service';

export const useCompanyHealth = () => {
  return useQuery({
    queryKey: ['company-health'],
    queryFn: fetchCompanyHealthData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
  });
};

export type { CompanyHealthData };
