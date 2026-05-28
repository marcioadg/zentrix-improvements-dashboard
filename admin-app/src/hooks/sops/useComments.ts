import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';


export interface SopComment {
  id: string;
  page_id: string;
  block_id: string | null;
  user_id: string;
  content: string;
  parent_comment_id: string | null;
  resolved: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
  replies?: SopComment[];
}

interface CreateCommentInput {
  page_id: string;
  block_id?: string;
  content: string;
  parent_comment_id?: string;
}

interface UpdateCommentInput {
  id: string;
  content?: string;
  resolved?: boolean;
}

export function useComments(pageId: string, blockId?: string) {
  const queryClient = useQueryClient();
  const queryKey = blockId 
    ? ['sop-comments', pageId, blockId]
    : ['sop-comments', pageId];

  // Fetch comments
  const { data: comments = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from('sop_comments')
        .select(`
          *,
          profiles:user_id (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('page_id', pageId)
        .order('created_at', { ascending: true });

      if (blockId) {
        query = query.eq('block_id', blockId);
      } else {
        query = query.is('parent_comment_id', null);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Build threaded structure
      const commentsMap = new Map<string, SopComment>();
      const rootComments: SopComment[] = [];
      
      data.forEach((comment: any) => {
        const commentObj: SopComment = {
          ...comment,
          replies: []
        };
        commentsMap.set(comment.id, commentObj);
        
        if (!comment.parent_comment_id) {
          rootComments.push(commentObj);
        }
      });
      
      // Attach replies to parents
      data.forEach((comment: any) => {
        if (comment.parent_comment_id) {
          const parent = commentsMap.get(comment.parent_comment_id);
          if (parent) {
            parent.replies!.push(commentsMap.get(comment.id)!);
          }
        }
      });
      
      return rootComments;
    },
    enabled: !!pageId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!pageId) return;

    const channel = supabase
      .channel(`sop-comments:${pageId}${blockId ? `:${blockId}` : ''}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sop_comments',
          filter: blockId ? `page_id=eq.${pageId},block_id=eq.${blockId}` : `page_id=eq.${pageId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pageId, blockId, queryClient, queryKey]);

  // Create comment
  const createComment = useMutation({
    mutationFn: async (input: CreateCommentInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('sop_comments')
        .insert({
          page_id: input.page_id,
          block_id: input.block_id || null,
          user_id: user.id,
          content: input.content,
          parent_comment_id: input.parent_comment_id || null,
        })
        .select(`
          *,
          profiles:user_id (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Comment added');
    },
    onError: (error) => {
      logger.error('Error creating comment:', error);
      toast.error('Failed to add comment');
    },
  });

  // Update comment
  const updateComment = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateCommentInput) => {
      const { data, error } = await supabase
        .from('sop_comments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Comment updated');
    },
    onError: (error) => {
      logger.error('Error updating comment:', error);
      toast.error('Failed to update comment');
    },
  });

  // Delete comment
  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('sop_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Comment deleted');
    },
    onError: (error) => {
      logger.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    },
  });

  // Resolve/unresolve comment
  const toggleResolve = useMutation({
    mutationFn: async ({ id, resolved }: { id: string; resolved: boolean }) => {
      const { data, error } = await supabase
        .from('sop_comments')
        .update({ resolved })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey });
      toast.success(variables.resolved ? 'Comment resolved' : 'Comment reopened');
    },
    onError: (error) => {
      logger.error('Error toggling comment resolution:', error);
      toast.error('Failed to update comment');
    },
  });

  return {
    comments,
    isLoading,
    error,
    createComment: createComment.mutate,
    updateComment: updateComment.mutate,
    deleteComment: deleteComment.mutate,
    toggleResolve: toggleResolve.mutate,
    isCreating: createComment.isPending,
    isUpdating: updateComment.isPending,
    isDeleting: deleteComment.isPending,
  };
}
