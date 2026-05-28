import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface AnalyticsCompanyFilter {
  id: string;
  user_id: string;
  excluded_company_ids: string[];
  created_at: string;
  updated_at: string;
}

export function useAnalyticsCompanyFilter() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: filter, isLoading } = useQuery({
    queryKey: ['analytics-company-filter', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('analytics_company_filters')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as AnalyticsCompanyFilter | null;
    },
    enabled: !!user?.id,
  });

  const updateFilter = useMutation({
    mutationFn: async (excludedCompanyIds: string[]) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('analytics_company_filters')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('analytics_company_filters')
          .update({ excluded_company_ids: excludedCompanyIds })
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('analytics_company_filters')
          .insert({ user_id: user.id, excluded_company_ids: excludedCompanyIds });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics-company-filter'] });
      toast.success('Filter saved');
    },
    onError: (error) => {
      logger.error('Failed to update filter:', error);
      toast.error('Failed to save filter');
    },
  });

  const excludedCompanyIds = filter?.excluded_company_ids ?? [];

  return {
    excludedCompanyIds,
    isLoading,
    updateFilter: updateFilter.mutate,
    isUpdating: updateFilter.isPending,
  };
}
