import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SopSpace } from '@/types/sops';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { useToast } from '@/hooks/use-toast';

export const useSpaces = () => {
  const { currentCompany } = useMultiCompanyAccess();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query spaces
  const { data: spaces = [], isLoading } = useQuery({
    queryKey: ['sop_spaces', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      const { data, error } = await supabase
        .from('sop_spaces')
        .select('*')
        .eq('company_id', currentCompany?.id)
        .eq('archived', false)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as SopSpace[];
    },
    enabled: !!currentCompany?.id
  });

  // Create space
  const createSpace = useMutation({
    mutationFn: async (space: { name: string; icon?: string; description?: string }) => {
      if (!currentCompany?.id) throw new Error('No company selected');
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('sop_spaces')
        .insert({
          company_id: currentCompany?.id,
          name: space.name,
          icon: space.icon,
          description: space.description,
          created_by: userData.user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data as SopSpace;
    },
    onMutate: async (newSpace) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['sop_spaces', currentCompany?.id] });
      const previousSpaces = queryClient.getQueryData(['sop_spaces', currentCompany?.id]);

      const optimisticSpace: SopSpace = {
        id: `temp-${Date.now()}`,
        company_id: currentCompany!.id,
        name: newSpace.name,
        icon: newSpace.icon,
        description: newSpace.description,
        created_by: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        archived: false,
        display_order: spaces.length
      };

      queryClient.setQueryData(
        ['sop_spaces', currentCompany?.id],
        (old: SopSpace[] = []) => [...old, optimisticSpace]
      );

      return { previousSpaces };
    },
    onError: (err, newSpace, context) => {
      // Rollback on error
      queryClient.setQueryData(['sop_spaces', currentCompany?.id], context?.previousSpaces);
      toast({
        title: 'Error',
        description: 'Failed to create space',
        variant: 'destructive'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sop_spaces'] });
      toast({
        title: 'Success',
        description: 'Space created successfully'
      });
    }
  });

  // Update space
  const updateSpace = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SopSpace> }) => {
      const { data, error } = await supabase
        .from('sop_spaces')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SopSpace;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sop_spaces'] });
      toast({
        title: 'Success',
        description: 'Space updated successfully'
      });
    }
  });

  // Delete space
  const deleteSpace = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sop_spaces')
        .update({ archived: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sop_spaces'] });
      toast({
        title: 'Success',
        description: 'Space archived successfully'
      });
    }
  });

  return {
    spaces,
    isLoading,
    createSpace: createSpace.mutateAsync,
    updateSpace: updateSpace.mutateAsync,
    deleteSpace: deleteSpace.mutateAsync
  };
};
