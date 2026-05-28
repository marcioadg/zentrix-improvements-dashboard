import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export const useTemplateRename = () => {
  const { currentCompany } = useMultiCompanyAccess();
  const queryClient = useQueryClient();

  const renameMutation = useMutation({
    mutationFn: async ({ templateId, newName }: { templateId: string; newName: string }) => {
      if (!currentCompany?.id) {
        throw new Error('No company selected');
      }

      logger.log('🔄 Renaming template:', templateId, 'to:', newName);

      const { data, error } = await supabase
        .from('meeting_templates')
        .update({ 
          name: newName,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)
        .eq('company_id', currentCompany?.id)
        .select()
        .single();

      if (error) {
        logger.error('❌ Error renaming template:', error);
        throw error;
      }

      logger.log('✅ Template renamed successfully:', data);
      return data;
    },
    onMutate: async ({ templateId, newName }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: ['custom-meeting-templates', currentCompany?.id] 
      });

      // Snapshot previous value
      const previousTemplates = queryClient.getQueryData([
        'custom-meeting-templates', 
        currentCompany?.id
      ]);

      // Optimistically update
      queryClient.setQueryData(
        ['custom-meeting-templates', currentCompany?.id],
        (old: any) => {
          if (!old) return old;
          return old.map((template: any) =>
            template.id === templateId
              ? { ...template, name: newName, updated_at: new Date().toISOString() }
              : template
          );
        }
      );

      return { previousTemplates };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousTemplates) {
        queryClient.setQueryData(
          ['custom-meeting-templates', currentCompany?.id],
          context.previousTemplates
        );
      }
      toast.error('Failed to rename template');
    },
    onSuccess: () => {
      toast.success('Template renamed successfully');
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: ['custom-meeting-templates', currentCompany?.id] 
      });
    },
  });

  return {
    renameTemplate: renameMutation.mutate,
    isRenaming: renameMutation.isPending,
  };
};
