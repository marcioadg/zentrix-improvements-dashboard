import { useState, useEffect, useCallback } from 'react';
import { VotingService } from '@/services/VotingService';
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export const useVotesUsed = (teamId: string) => {
  const { meetingId } = useNewMeetingTimer();
  const [votesUsed, setVotesUsed] = useState(0);
  const [voteLimit, setVoteLimit] = useState(5);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const votesRemaining = Math.max(0, voteLimit - votesUsed);

  // Get effective vote limit using database function
  const getEffectiveVoteLimit = useCallback(async (): Promise<number> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !teamId || !meetingId) return 5;

      const { data, error } = await supabase.rpc('get_effective_vote_limit', {
        p_user_id: user.id,
        p_team_id: teamId,
        p_meeting_state_id: meetingId
      });

      if (error) {
        logger.error('useVotesUsed: Error getting effective vote limit:', error);
        return 5;
      }

      return data || 5;
    } catch (error) {
      logger.error('useVotesUsed: Exception getting effective vote limit:', error);
      return 5;
    }
  }, [teamId, meetingId]);

  // Load votes used from server
  const loadVotesUsed = useCallback(async () => {
    if (!teamId || !meetingId) {
      return;
    }

    setLoading(true);
    logger.log('useVotesUsed: Loading votes used for team:', teamId, 'meeting:', meetingId);
    
    try {
      const [usedVotes, effectiveLimit] = await Promise.all([
        VotingService.getUserVotesUsed(teamId, meetingId),
        getEffectiveVoteLimit()
      ]);
      
      logger.log('useVotesUsed: Loaded votes used:', usedVotes, 'limit:', effectiveLimit);
      setVotesUsed(usedVotes);
      setVoteLimit(effectiveLimit);
      setDataLoaded(true);
    } catch (error) {
      logger.error('useVotesUsed: Error loading votes used:', error);
    } finally {
      setLoading(false);
    }
  }, [teamId, meetingId, getEffectiveVoteLimit]);

  // Load server data on mount
  useEffect(() => {
    loadVotesUsed();
  }, [loadVotesUsed]);

  // Public method to update votes used (for optimistic updates)
  // Wrapped in useCallback so VotingContext value is stable — prevents VotingOperations
  // from being recreated in every VoteButtons instance on each parent render
  const updateVotesUsed = useCallback((delta: number) => {
    setVotesUsed(prev => {
      const newValue = Math.max(0, prev + delta);
      logger.log('useVotesUsed: Updated votes used from', prev, 'to', newValue);
      return newValue;
    });
  }, []);

  // Public method to set exact votes used (for server reconciliation)
  const setVotesUsedExact = useCallback((value: number) => {
    logger.log('useVotesUsed: Setting exact votes used:', value);
    setVotesUsed(value);
  }, []);

  // Public method to refresh vote limit
  const refreshVoteLimit = async () => {
    if (!teamId || !meetingId) return;
    
    try {
      const effectiveLimit = await getEffectiveVoteLimit();
      logger.log('useVotesUsed: Updated vote limit:', effectiveLimit);
      setVoteLimit(effectiveLimit);
    } catch (error) {
      logger.error('useVotesUsed: Error refreshing vote limit:', error);
    }
  };

  // Public method to refresh votes used from server
  const refreshVotesUsed = useCallback(async () => {
    await loadVotesUsed();
  }, [loadVotesUsed]);

  return {
    votesUsed,
    votesRemaining,
    voteLimit,
    loading,
    dataLoaded,
    updateVotesUsed,
    setVotesUsedExact,
    refreshVotesUsed,
    refreshVoteLimit
  };
};
