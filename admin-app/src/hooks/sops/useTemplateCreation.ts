import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface TemplateMetadata {
  categoryId: string;
  description: string;
  thumbnail?: string;
}

export const useTemplateCreation = () => {
  const { currentCompany } = useMultiCompanyAccess();
  const queryClient = useQueryClient();

  // Convert page to template
  const convertToTemplateMutation = useMutation({
    mutationFn: async ({ pageId, metadata }: { pageId: string; metadata: TemplateMetadata }) => {
      const { data, error } = await supabase
        .from('sop_pages')
        .update({
          is_template: true,
          template_category_id: metadata.categoryId,
          template_description: metadata.description,
          template_thumbnail: metadata.thumbnail,
          template_use_count: 0,
        })
        .eq('id', pageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sop-templates'] });
      queryClient.invalidateQueries({ queryKey: ['sop-pages'] });
      toast.success('Page converted to template');
    },
    onError: (error) => {
      logger.error('Error converting to template:', error);
      toast.error('Failed to convert page to template');
    },
  });

  // Upload thumbnail
  const uploadThumbnail = async (file: File): Promise<string> => {
    if (!currentCompany?.id) {
      throw new Error('No company selected');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${currentCompany?.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('sop-thumbnails')
      .upload(fileName, file);

    if (uploadError) {
      logger.error('Error uploading thumbnail:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('sop-thumbnails')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  // Update template metadata
  const updateMetadataMutation = useMutation({
    mutationFn: async ({ pageId, updates }: { pageId: string; updates: Partial<TemplateMetadata> }) => {
      const { data, error } = await supabase
        .from('sop_pages')
        .update({
          ...(updates.categoryId && { template_category_id: updates.categoryId }),
          ...(updates.description && { template_description: updates.description }),
          ...(updates.thumbnail && { template_thumbnail: updates.thumbnail }),
        })
        .eq('id', pageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sop-templates'] });
      toast.success('Template updated');
    },
    onError: (error) => {
      logger.error('Error updating template:', error);
      toast.error('Failed to update template');
    },
  });

  return {
    convertToTemplate: convertToTemplateMutation.mutateAsync,
    isConverting: convertToTemplateMutation.isPending,
    uploadThumbnail,
    updateMetadata: updateMetadataMutation.mutateAsync,
    isUpdating: updateMetadataMutation.isPending,
  };
};
