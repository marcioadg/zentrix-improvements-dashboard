import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserVoteData } from './types';
import { logger } from '@/utils/logger';

interface BatchVoteCountsReturn {
  voteCounts: Record<string, number>;
  userVotes: Record<string, UserVoteData>;
  loading: boolean;
  refetch: () => Promise<void>;
}

/**
 * Batch fetch all vote counts AND current-user votes for multiple issues in a
 * single query.  This replaces both the per-issue getIssueVoteCount AND
 * getUserIssueVotes calls (N+1 → 1).
 */
export const useBatchVoteCounts = (
  issueIds: string[],
  meetingId: string | undefined,
  enabled: boolean = true
): BatchVoteCountsReturn => {
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [userVotes, setUserVotes] = useState<Record<string, UserVoteData>>({});
  const [loading, setLoading] = useState(true);
  
  const issueIdsKey = [...issueIds].sort().join(',');
  const prevIssueIdsKeyRef = useRef<string>('');

  const fetchAllVoteCounts = useCallback(async (forceRefresh: boolean = false) => {
    if (!meetingId || issueIds.length === 0 || !enabled) {
      setLoading(false);
      return;
    }

    if (!forceRefresh && prevIssueIdsKeyRef.current === issueIdsKey && Object.keys(voteCounts).length > 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [{ data, error }, { data: authData }] = await Promise.all([
        supabase
          .from('issue_votes')
          .select('issue_id, vote_value, user_id')
          .eq('meeting_state_id', meetingId)
          .in('issue_id', issueIds),
        supabase.auth.getUser()
      ]);

      if (error) throw error;

      const currentUserId = authData?.user?.id;

      const counts: Record<string, number> = {};
      const uVotes: Record<string, UserVoteData> = {};
      issueIds.forEach(id => {
        counts[id] = 0;
        uVotes[id] = { upvotes: 0, downvotes: 0, totalVotes: 0 };
      });
      
      data?.forEach(vote => {
        counts[vote.issue_id] = (counts[vote.issue_id] || 0) + vote.vote_value;

        if (currentUserId && vote.user_id === currentUserId) {
          const entry = uVotes[vote.issue_id];
          if (vote.vote_value === 1) entry.upvotes++;
          else if (vote.vote_value === -1) entry.downvotes++;
          entry.totalVotes += vote.vote_value;
        }
      });

      // Clamp totalVotes to >= 0, matching VotingService.getUserIssueVotes logic
      Object.values(uVotes).forEach(v => {
        v.totalVotes = Math.max(0, v.totalVotes);
      });

      setVoteCounts(counts);
      setUserVotes(uVotes);
      prevIssueIdsKeyRef.current = issueIdsKey;
    } catch (error) {
      logger.error('Error batch fetching vote counts:', error);
    } finally {
      setLoading(false);
    }
  }, [issueIdsKey, meetingId, enabled]);

  useEffect(() => {
    fetchAllVoteCounts();
  }, [fetchAllVoteCounts]);

  const forceRefetch = useCallback(() => fetchAllVoteCounts(true), [fetchAllVoteCounts]);

  return { voteCounts, userVotes, loading, refetch: forceRefetch };
};
