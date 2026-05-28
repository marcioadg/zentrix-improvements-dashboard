import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface OptimisticVote {
  issueId: string;
  voteValue: 1 | -1;
  previousCount: number;
  previousUserVotes: number;
}

/**
 * Optimistic UI hook for issue voting - instant feedback
 * Updates vote counts immediately, syncs with backend, rolls back on error
 */
export const useOptimisticVoting = (
  issueId: string,
  teamId: string,
  meetingId?: string
) => {
  const [voteCount, setVoteCount] = useState(0);
  const [userVotes, setUserVotes] = useState(0);
  const [isVoting, setIsVoting] = useState(false);
  const pendingVote = useRef<OptimisticVote | null>(null);
  const rollbackTimeout = useRef<NodeJS.Timeout | null>(null);

  // Cast vote optimistically
  const castVoteOptimistic = useCallback(
    async (voteValue: 1 | -1) => {
      if (isVoting) return;

      setIsVoting(true);

      // Store original values for rollback
      const previousCount = voteCount;
      const previousUserVotes = userVotes;

      // Update UI immediately
      setVoteCount((prev) => prev + voteValue);
      setUserVotes((prev) => prev + 1);

      pendingVote.current = {
        issueId,
        voteValue,
        previousCount,
        previousUserVotes,
      };

      // Set rollback timeout (5s)
      if (rollbackTimeout.current) {
        clearTimeout(rollbackTimeout.current);
      }

      rollbackTimeout.current = setTimeout(() => {
        // Rollback if not confirmed
        if (pendingVote.current) {
          setVoteCount(previousCount);
          setUserVotes(previousUserVotes);
          toast.error('Vote timed out, please try again');
          pendingVote.current = null;
        }
      }, 5000);

      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Backend sync
        const { error } = await supabase.from('issue_votes').insert({
          issue_id: issueId,
          team_id: teamId,
          user_id: user.id,
          vote_value: voteValue,
          meeting_state_id: meetingId || null,
        });

        if (error) throw error;

        // Confirm success
        if (rollbackTimeout.current) {
          clearTimeout(rollbackTimeout.current);
          rollbackTimeout.current = null;
        }
        pendingVote.current = null;
        setIsVoting(false);

        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('issueVoteUpdate', { detail: { issueId } }));
      } catch (error: any) {
        // Rollback on error
        if (rollbackTimeout.current) {
          clearTimeout(rollbackTimeout.current);
          rollbackTimeout.current = null;
        }

        setVoteCount(previousCount);
        setUserVotes(previousUserVotes);
        pendingVote.current = null;
        setIsVoting(false);

        logger.error('Vote failed:', error);
        toast.error('Failed to cast vote');
      }
    },
    [issueId, teamId, meetingId, voteCount, userVotes, isVoting]
  );

  // Remove vote optimistically
  const removeVoteOptimistic = useCallback(
    async (voteValue: 1 | -1) => {
      if (isVoting || userVotes === 0) return;

      setIsVoting(true);

      // Store original values for rollback
      const previousCount = voteCount;
      const previousUserVotes = userVotes;

      // Update UI immediately
      setVoteCount((prev) => prev - voteValue);
      setUserVotes((prev) => Math.max(0, prev - 1));

      pendingVote.current = {
        issueId,
        voteValue,
        previousCount,
        previousUserVotes,
      };

      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Find the most recent vote to delete
        const { data: votes, error: fetchError } = await supabase
          .from('issue_votes')
          .select('id')
          .eq('issue_id', issueId)
          .eq('user_id', user.id)
          .eq('vote_value', voteValue)
          .order('created_at', { ascending: false })
          .limit(1);

        if (fetchError) throw fetchError;
        if (!votes || votes.length === 0) throw new Error('No vote found');

        // Delete the vote
        const { error: deleteError } = await supabase
          .from('issue_votes')
          .delete()
          .eq('id', votes[0].id);

        if (deleteError) throw deleteError;

        // Confirm success
        pendingVote.current = null;
        setIsVoting(false);

        // Dispatch event
        window.dispatchEvent(new CustomEvent('issueVoteUpdate', { detail: { issueId } }));
      } catch (error: any) {
        // Rollback on error
        setVoteCount(previousCount);
        setUserVotes(previousUserVotes);
        pendingVote.current = null;
        setIsVoting(false);

        logger.error('Remove vote failed:', error);
        toast.error('Failed to remove vote');
      }
    },
    [issueId, teamId, voteCount, userVotes, isVoting]
  );

  return {
    voteCount,
    userVotes,
    castVote: castVoteOptimistic,
    removeVote: removeVoteOptimistic,
    isVoting,
    isPending: !!pendingVote.current,
  };
};
