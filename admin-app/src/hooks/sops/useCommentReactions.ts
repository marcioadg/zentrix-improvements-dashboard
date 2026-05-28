import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { logger } from '@/utils/logger';

export interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface GroupedReaction {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

export function useCommentReactions(commentId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['comment-reactions', commentId];

  // Fetch reactions
  const { data: reactions = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sop_comment_reactions')
        .select('*')
        .eq('comment_id', commentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as CommentReaction[];
    },
    enabled: !!commentId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!commentId) return;

    const channel = supabase
      .channel(`comment-reactions:${commentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sop_comment_reactions',
          filter: `comment_id=eq.${commentId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [commentId, queryClient, queryKey]);

  // Get current user
  const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  };

  // Group reactions by emoji (we'll check current user client-side)
  const groupedReactions: GroupedReaction[] = (() => {
    const groups = new Map<string, GroupedReaction>();

    reactions.forEach((reaction) => {
      const existing = groups.get(reaction.emoji);
      if (existing) {
        existing.count++;
        existing.users.push(reaction.user_id);
      } else {
        groups.set(reaction.emoji, {
          emoji: reaction.emoji,
          count: 1,
          users: [reaction.user_id],
          hasReacted: false, // Will be set by component
        });
      }
    });

    return Array.from(groups.values());
  })();

  // Add reaction
  const addReaction = useMutation({
    mutationFn: async (emoji: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('sop_comment_reactions')
        .insert({
          comment_id: commentId,
          user_id: user.id,
          emoji,
        })
        .select()
        .single();

      if (error) {
        // If duplicate, it means user already reacted with this emoji
        if (error.code === '23505') {
          // Remove the reaction instead
          const { error: deleteError } = await supabase
            .from('sop_comment_reactions')
            .delete()
            .eq('comment_id', commentId)
            .eq('user_id', user.id)
            .eq('emoji', emoji);

          if (deleteError) throw deleteError;
          return null;
        }
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      logger.error('Error toggling reaction:', error);
    },
  });

  // Remove reaction
  const removeReaction = useMutation({
    mutationFn: async (emoji: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('sop_comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      logger.error('Error removing reaction:', error);
    },
  });

  // Toggle reaction (add if not present, remove if present)
  const toggleReaction = (emoji: string) => {
    addReaction.mutate(emoji);
  };

  return {
    reactions,
    groupedReactions,
    isLoading,
    addReaction: toggleReaction,
    removeReaction: removeReaction.mutate,
    isToggling: addReaction.isPending || removeReaction.isPending,
  };
}
