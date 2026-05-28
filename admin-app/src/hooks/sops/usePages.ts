import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SopPage } from '@/types/sops';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { useToast } from '@/hooks/use-toast';

export const usePages = (spaceId?: string) => {
  const { currentCompany } = useMultiCompanyAccess();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query pages
  const { data: pages = [], isLoading } = useQuery({
    queryKey: ['sop_pages', currentCompany?.id, spaceId],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query = supabase
        .from('sop_pages')
        .select('*')
        .eq('company_id', currentCompany?.id)
        .eq('archived', false);

      if (spaceId) {
        query = query.eq('space_id', spaceId);
      }

      const { data, error } = await query.order('display_order', { ascending: true });

      if (error) throw error;
      return data as SopPage[];
    },
    enabled: !!currentCompany?.id
  });

  // Create page
  const createPage = useMutation({
    mutationFn: async (page: {
      title: string;
      space_id?: string;
      parent_page_id?: string;
      privacy_level?: 'workspace' | 'private';
    }) => {
      if (!currentCompany?.id) throw new Error('No company selected');
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('sop_pages')
        .insert({
          company_id: currentCompany?.id,
          title: page.title,
          space_id: page.space_id,
          parent_page_id: page.parent_page_id,
          privacy_level: page.privacy_level || 'workspace',
          created_by: userData.user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data as SopPage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sop_pages'] });
      toast({
        title: 'Success',
        description: 'Page created successfully'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create page',
        variant: 'destructive'
      });
    }
  });

  // Update page
  const updatePage = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SopPage> }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('sop_pages')
        .update({
          ...updates,
          updated_by: userData.user?.id
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SopPage;
    },
    onMutate: async ({ id, updates }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['sop_pages'] });
      const previousPages = queryClient.getQueryData(['sop_pages', currentCompany?.id, spaceId]);

      queryClient.setQueryData(
        ['sop_pages', currentCompany?.id, spaceId],
        (old: SopPage[] = []) => old.map(page => 
          page.id === id ? { ...page, ...updates } : page
        )
      );

      return { previousPages };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['sop_pages', currentCompany?.id, spaceId], context?.previousPages);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['sop_pages'] });
    }
  });

  // Delete page
  const deletePage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sop_pages')
        .update({ archived: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sop_pages'] });
      toast({
        title: 'Success',
        description: 'Page archived successfully'
      });
    }
  });

  return {
    pages,
    isLoading,
    createPage: createPage.mutateAsync,
    updatePage: updatePage.mutateAsync,
    deletePage: deletePage.mutateAsync
  };
};
