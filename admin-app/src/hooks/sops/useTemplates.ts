import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export const useTemplates = (categoryId?: string, searchQuery?: string) => {
  const { currentCompany } = useMultiCompanyAccess();
  const queryClient = useQueryClient();

  // Fetch templates with filtering
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['sop-templates', categoryId, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('sop_pages')
        .select(`
          *,
          template_category:sop_template_categories(*)
        `)
        .eq('is_template', true)
        .order('template_use_count', { ascending: false });

      if (categoryId) {
        query = query.eq('template_category_id', categoryId);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,template_description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching templates:', error);
        throw error;
      }

      return data || [];
    },
    enabled: true,
  });

  // Use template (clone to user's workspace)
  const useTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      if (!currentCompany?.id) {
        throw new Error('No company selected');
      }

      // Fetch template with blocks
      const { data: template, error: templateError } = await supabase
        .from('sop_pages')
        .select(`
          *,
          blocks:sop_blocks(*)
        `)
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      // Create new page (clone)
      const { data: newPage, error: pageError } = await supabase
        .from('sop_pages')
        .insert({
          title: `${template.title} (Copy)`,
          icon: template.icon,
          company_id: currentCompany?.id,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          is_template: false,
        })
        .select()
        .single();

      if (pageError) throw pageError;

      // Clone blocks
      if (template.blocks && template.blocks.length > 0) {
        const blocksToInsert = template.blocks.map((block: any) => ({
          page_id: newPage.id,
          type: block.type,
          content: block.content,
          position: block.position,
        }));

        const { error: blocksError } = await supabase
          .from('sop_blocks')
          .insert(blocksToInsert);

        if (blocksError) throw blocksError;
      }

      // Increment template use count
      await supabase
        .from('sop_pages')
        .update({ template_use_count: (template.template_use_count || 0) + 1 })
        .eq('id', templateId);

      return newPage;
    },
    onSuccess: (newPage) => {
      queryClient.invalidateQueries({ queryKey: ['sop-pages'] });
      queryClient.invalidateQueries({ queryKey: ['sop-templates'] });
      toast.success('Template added to your workspace');
      return newPage;
    },
    onError: (error) => {
      logger.error('Error using template:', error);
      toast.error('Failed to use template');
    },
  });

  // Increment use count
  const incrementUseCount = async (pageId: string) => {
    const { error } = await supabase.rpc('increment', {
      row_id: pageId,
      table_name: 'sop_pages',
      column_name: 'template_use_count',
    });

    if (error) {
      logger.error('Error incrementing use count:', error);
    }
  };

  return {
    templates,
    isLoading,
    useTemplate: useTemplateMutation.mutateAsync,
    isUsingTemplate: useTemplateMutation.isPending,
    incrementUseCount,
  };
};
