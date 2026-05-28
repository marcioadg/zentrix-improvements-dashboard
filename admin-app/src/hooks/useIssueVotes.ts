import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface IssueVote {
  id: string;
  issue_id: string;
  user_id: string;
  team_id: string;
  vote_value: number;
  created_at: string;
  updated_at: string;
}

interface VoteCounts {
  upvotes: number;
  downvotes: number;
  netScore: number;
}

export const useIssueVotes = (issueId: string, teamId: string) => {
  const [voteCounts, setVoteCounts] = useState<VoteCounts>({ upvotes: 0, downvotes: 0, netScore: 0 });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch vote counts for the issue
  const fetchVotes = async () => {
    try {
      const { data: votes, error } = await supabase
        .from('issue_votes')
        .select('*')
        .eq('issue_id', issueId);

      if (error) throw error;

      const upvotes = votes?.filter(vote => vote.vote_value === 1).length || 0;
      const downvotes = votes?.filter(vote => vote.vote_value === -1).length || 0;
      const netScore = upvotes - downvotes;

      setVoteCounts({ upvotes, downvotes, netScore });
    } catch (error) {
      logger.error('Error fetching votes:', error);
    }
  };

  // Vote on an issue (unlimited votes allowed)
  const vote = async (voteValue: 1 | -1) => {
    if (!issueId || !teamId) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Always create a new vote (unlimited voting)
      const { error } = await supabase
        .from('issue_votes')
        .insert({
          issue_id: issueId,
          user_id: user.id,
          team_id: teamId,
          vote_value: voteValue
        });

      if (error) throw error;
      
      toast({ 
        description: voteValue === 1 ? 'Upvoted!' : 'Downvoted!',
        duration: 1500
      });

      // Refresh vote counts
      await fetchVotes();
      
      // Trigger custom event to update issues list sorting
      window.dispatchEvent(new CustomEvent('issueVoteUpdate'));
    } catch (error) {
      logger.error('Error voting:', error);
      toast({
        description: 'Failed to vote. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (issueId) {
      fetchVotes();
    }
  }, [issueId]);

  return {
    voteCounts,
    vote,
    loading,
    refreshVotes: fetchVotes
  };
};