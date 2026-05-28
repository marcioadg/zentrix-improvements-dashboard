import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SopBlock, BlockType, BlockContent } from '@/types/sops';
import { useToast } from '@/hooks/use-toast';
import { useDebouncedCallback } from 'use-debounce';

export const useBlocks = (pageId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query blocks
  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ['sop_blocks', pageId],
    queryFn: async () => {
      if (!pageId) return [];

      const { data, error } = await supabase
        .from('sop_blocks')
        .select('*')
        .eq('page_id', pageId)
        .order('position', { ascending: true });

      if (error) throw error;
      return data as SopBlock[];
    },
    enabled: !!pageId
  });

  // Create block
  const createBlock = useMutation({
    mutationFn: async (block: { type: BlockType; content?: BlockContent; position: number }) => {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('sop_blocks')
        .insert({
          page_id: pageId,
          type: block.type,
          content: block.content || {},
          position: block.position,
          updated_by: userData.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data as SopBlock;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sop_blocks', pageId] });
    }
  });

  // Update block
  const updateBlock = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: BlockContent }) => {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('sop_blocks')
        .update({
          content,
          updated_at: new Date().toISOString(),
          updated_by: userData.user?.id
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SopBlock;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sop_blocks', pageId] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update block',
        variant: 'destructive'
      });
    }
  });

  // Debounced update for typing
  const debouncedUpdate = useDebouncedCallback(
    (id: string, content: BlockContent) => {
      updateBlock.mutate({ id, content });
    },
    1000
  );

  // Delete block
  const deleteBlock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sop_blocks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sop_blocks', pageId] });
    }
  });

  // Reorder blocks
  const reorderBlocks = useMutation({
    mutationFn: async (reorderedBlocks: SopBlock[]) => {
      const updates = reorderedBlocks.map((block, index) => ({
        id: block.id,
        position: index
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('sop_blocks')
          .update({ position: update.position })
          .eq('id', update.id);

        if (error) throw error;
      }
    },
    onMutate: async (reorderedBlocks) => {
      await queryClient.cancelQueries({ queryKey: ['sop_blocks', pageId] });
      const previousBlocks = queryClient.getQueryData(['sop_blocks', pageId]);

      queryClient.setQueryData(['sop_blocks', pageId], reorderedBlocks);

      return { previousBlocks };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['sop_blocks', pageId], context?.previousBlocks);
    }
  });

  return {
    blocks,
    isLoading,
    createBlock: createBlock.mutateAsync,
    updateBlock: updateBlock.mutateAsync,
    debouncedUpdate,
    deleteBlock: deleteBlock.mutateAsync,
    reorderBlocks: reorderBlocks.mutateAsync,
    isSaving: updateBlock.isPending
  };
};
