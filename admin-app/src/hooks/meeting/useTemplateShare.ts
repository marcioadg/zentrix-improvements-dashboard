import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export const useTemplateShare = () => {
  const { currentCompany } = useMultiCompanyAccess();
  const queryClient = useQueryClient();

  const shareMutation = useMutation({
    mutationFn: async ({ templateId, shared }: { templateId: string; shared: boolean }) => {
      if (!currentCompany?.id) {
        throw new Error('No company selected');
      }

      logger.log('🔄 Updating template shared status:', templateId, shared);

      const { data, error } = await supabase
        .from('meeting_templates')
        .update({ shared })
        .eq('id', templateId)
        .eq('company_id', currentCompany?.id)
        .select()
        .single();

      if (error) {
        logger.error('❌ Error updating template shared status:', error);
        throw error;
      }

      logger.log('✅ Template shared status updated:', data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['custom-meeting-templates', currentCompany?.id] 
      });
      toast.success(data.shared ? 'Template shared with company' : 'Template set to private');
    },
    onError: (error) => {
      logger.error('❌ Error in template share mutation:', error);
      toast.error('Failed to update template sharing status');
    },
  });

  return {
    updateSharedStatus: shareMutation.mutate,
    isUpdating: shareMutation.isPending,
  };
};
