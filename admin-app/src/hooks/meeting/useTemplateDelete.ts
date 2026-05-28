import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { CustomMeetingTemplate } from '@/types/meeting';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export const useTemplateDelete = () => {
  const queryClient = useQueryClient();
  const { currentCompany } = useMultiCompanyAccess();

  const mutation = useMutation({
    mutationFn: async (templateId: string) => {
      if (!currentCompany?.id) {
        throw new Error('No company selected');
      }

      logger.log('🗑️ Deleting template:', templateId);

      const { error } = await supabase
        .from('meeting_templates')
        .delete()
        .eq('id', templateId)
        .eq('company_id', currentCompany?.id); // Extra safety check

      if (error) {
        logger.error('❌ Error deleting template:', error);
        throw error;
      }

      // Track custom_meeting_deleted event (non-blocking)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { trackCustomMeetingDeleted } = await import('@/lib/statsigAnalytics');
        trackCustomMeetingDeleted({
          user_id: user?.id,
          company_id: currentCompany?.id,
          meeting_id: templateId,
          meetings_held: 0, // Could be enhanced to count meetings held with this template
        });
      } catch (e) {
        // Non-blocking
      }

      logger.log('✅ Template deleted successfully');
      return templateId;
    },
    onMutate: async (templateId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: ['custom-meeting-templates', currentCompany?.id] 
      });

      // Snapshot the previous value
      const previousTemplates = queryClient.getQueryData<CustomMeetingTemplate[]>([
        'custom-meeting-templates',
        currentCompany?.id,
      ]);

      // Optimistically update to remove the template
      queryClient.setQueryData<CustomMeetingTemplate[]>(
        ['custom-meeting-templates', currentCompany?.id],
        (old) => old?.filter((template) => template.id !== templateId) ?? []
      );

      // Return context with snapshot
      return { previousTemplates };
    },
    onError: (error, templateId, context) => {
      // Rollback on error
      if (context?.previousTemplates) {
        queryClient.setQueryData(
          ['custom-meeting-templates', currentCompany?.id],
          context.previousTemplates
        );
      }
      logger.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    },
    onSuccess: () => {
      toast.success('Template deleted successfully');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ 
        queryKey: ['custom-meeting-templates', currentCompany?.id] 
      });
    },
  });

  return {
    deleteTemplate: mutation.mutate,
    isDeletingTemplate: mutation.isPending,
  };
};
