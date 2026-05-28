import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AdminAction } from '@/types/superAdmin';
import { logger } from '@/utils/logger';

interface UseAdminActionsOptions {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export const useAdminActions = (options: UseAdminActionsOptions = {}) => {
  const { startDate, endDate, limit = 100 } = options;

  return useQuery({
    queryKey: ['adminActions', startDate, endDate, limit],
    queryFn: async (): Promise<AdminAction[]> => {
      let query = supabase
        .from('admin_actions')
        .select(`
          *,
          admin_user:profiles!admin_user_id(full_name),
          affected_user:profiles!user_affected_id(full_name),
          company:companies!company_id(name)
        `)
        .order('created_at', { ascending: false });

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      query = query.limit(limit);

      const { data, error } = await query;

      if (error) {
        logger.error('Error loading admin actions:', error);
        throw error;
      }

      return (data || []).map(action => ({
        ...action,
        admin_user_name: action.admin_user?.full_name || 'Unknown User',
        affected_user_name: action.affected_user?.full_name || undefined,
        company_name: action.company?.name || undefined
      }));
    },
    staleTime: 30000, // 30 seconds
  });
};
