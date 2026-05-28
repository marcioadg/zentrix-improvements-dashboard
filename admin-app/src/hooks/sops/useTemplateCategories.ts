import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export const useTemplateCategories = () => {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['sop-template-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sop_template_categories')
        .select(`
          *,
          template_count:sop_pages(count)
        `)
        .order('display_order');

      if (error) {
        logger.error('Error fetching template categories:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes (categories rarely change)
  });

  return {
    categories,
    isLoading,
  };
};
