import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { CustomMeetingTemplate } from '@/types/meeting';
import { logger } from '@/utils/logger';

export const useCustomMeetingTemplates = () => {
  const { currentCompany } = useMultiCompanyAccess();

  const { data: templates = [], isLoading, error, refetch } = useQuery({
    queryKey: ['custom-meeting-templates', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from('meeting_templates')
        .select('*')
        .eq('company_id', currentCompany?.id)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('❌ Error fetching custom meeting templates:', error);
        throw error;
      }

      return (data || []) as CustomMeetingTemplate[];
    },
    enabled: !!currentCompany?.id,
    staleTime: 30000, // Cache for 30 seconds
  });

  return {
    templates,
    isLoading,
    error,
    refetch,
  };
};
