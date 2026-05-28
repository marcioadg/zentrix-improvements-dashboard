import { useState, useEffect, useMemo, useCallback, useContext, useRef } from 'react';
import { VotingService, UserVoteData } from '@/services/VotingService';
import { NewMeetingTimerContext } from '@/contexts/NewMeetingTimerContext';
import { useSettings } from '@/contexts/SettingsContext';
import { UseVotingReturn } from './types';
import { VotingOperations } from './votingOperations';
import { VotingContext } from '@/contexts/VotingContext';
import { toast } from 'sonner';

// Extended return type with broadcast callback support
export interface UseVotingReturnWithBroadcast extends UseVotingReturn {
  setVoteCountFromBroadcast: (count: number) => void;
}

export const useVoting = (
  issueId: string, 
  teamId: string,
  publishVote?: (issueId: string, voteValue: number, newVoteCount: number) => void,
  initialVoteCount?: number,
  initialUserVotes?: UserVoteData
): UseVotingReturnWithBroadcast => {
  // Safe context access for preview mode
  const timerContext = useContext(NewMeetingTimerContext);
  const votingContext = useContext(VotingContext);
  const { settings, loading: settingsLoading } = useSettings();
  
  // Extract with fallbacks
  const meetingId = timerContext?.meetingId;
  const isPreviewMode = !timerContext || !votingContext;
  
  // Only manage issue-specific state locally
  // Initialize with provided value if available (from batch fetch)
  const [voteCount, setVoteCount] = useState(initialVoteCount ?? 0);
  const [userVotes, setUserVotes] = useState<UserVoteData>(
    initialUserVotes ?? { upvotes: 0, downvotes: 0, totalVotes: 0 }
  );
  const [loading, setLoading] = useState(false);
  
  // Track when user recently voted to prioritize local state over remote
  const recentlyVotedRef = useRef(false);
  const recentlyVotedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Safe access to voting context values with fallbacks
  const votesUsed = votingContext?.votesUsed ?? 0;
  const votesRemaining = votingContext?.votesRemaining ?? 25;
  const voteLimit = votingContext?.voteLimit ?? 25;
  const dataLoaded = votingContext?.dataLoaded ?? false;
  const updateVotesUsed = votingContext?.updateVotesUsed ?? (() => {});
  const setVotesUsedExact = votingContext?.setVotesUsedExact ?? (() => {});

  // Apply broadcast count directly — no DB fetch needed.
  // The broadcast carries the authoritative count (sent after server confirmation).
  // getUserIssueVotes is unnecessary because the broadcast is from another user;
  // the current user's votes haven't changed.
  const setVoteCountFromBroadcast = useCallback((broadcastCount: number) => {
    if (recentlyVotedRef.current) return;
    setVoteCount(broadcastCount);
  }, []);

  // Create VotingOperations instance
  const votingOperations = useMemo(
    () => new VotingOperations(
      issueId, 
      teamId, 
      meetingId,
      updateVotesUsed,
      setVotesUsedExact,
      publishVote
    ),
    [issueId, teamId, meetingId, updateVotesUsed, setVotesUsedExact, publishVote]
  );

  // Sync voteCount when initialVoteCount changes (e.g., from batch refetch on sort change)
  // Only update if user hasn't recently voted to avoid overwriting local optimistic updates
  useEffect(() => {
    if (
      initialVoteCount !== undefined &&
      Number.isFinite(initialVoteCount) &&
      !recentlyVotedRef.current
    ) {
      setVoteCount(initialVoteCount);
    }
  }, [initialVoteCount]);

  // Sync initialUserVotes when it arrives from the batch hook
  useEffect(() => {
    if (initialUserVotes && !recentlyVotedRef.current) {
      setUserVotes(initialUserVotes);
    }
  }, [initialUserVotes]);

  // Load initial issue-specific vote data.
  // Skip entirely when both initial values are provided from the batch fetch.
  useEffect(() => {
    const loadIssueVoteData = async () => {
      if (isPreviewMode || !teamId || !meetingId || settingsLoading || !issueId) {
        return;
      }

      // Both provided by batch → nothing to fetch individually
      if (initialVoteCount !== undefined && initialUserVotes !== undefined) {
        return;
      }
      
      // Only vote count provided → still need user votes
      if (initialVoteCount !== undefined) {
        const userVoteData = await VotingService.getUserIssueVotes(issueId, meetingId);
        setUserVotes(userVoteData);
        return;
      }
      
      const [issueCount, userVoteData] = await Promise.all([
        VotingService.getIssueVoteCount(issueId, meetingId),
        VotingService.getUserIssueVotes(issueId, meetingId)
      ]);

      setVoteCount(issueCount);
      setUserVotes(userVoteData);
    };

    loadIssueVoteData();
  }, [issueId, teamId, meetingId, settingsLoading, isPreviewMode, initialVoteCount, initialUserVotes]);

  const castVote = async (voteValue: 1 | -1) => {
    if (isPreviewMode || !meetingId) {
      toast.error('Cannot vote: Not in an active meeting');
      return;
    }
    
    // Set recently voted flag to prioritize local state
    recentlyVotedRef.current = true;
    if (recentlyVotedTimeoutRef.current) {
      clearTimeout(recentlyVotedTimeoutRef.current);
    }
    recentlyVotedTimeoutRef.current = setTimeout(() => {
      recentlyVotedRef.current = false;
    }, 2000); // 2 second window to ignore remote updates
    
    await votingOperations.castVote(
      voteValue,
      { 
        voteCount, 
        userVotes, 
        votesUsed, 
        votesRemaining,
        dataLoaded
      },
      { 
        setLoading, 
        setVoteCount,
        setUserVotes,
        setVotesUsed: () => {}
      }
    );
  };

  const removeVote = async (voteValue: 1 | -1) => {
    if (isPreviewMode || !meetingId) {
      toast.error('Cannot remove vote: Not in an active meeting');
      return;
    }
    
    // Set recently voted flag to prioritize local state
    recentlyVotedRef.current = true;
    if (recentlyVotedTimeoutRef.current) {
      clearTimeout(recentlyVotedTimeoutRef.current);
    }
    recentlyVotedTimeoutRef.current = setTimeout(() => {
      recentlyVotedRef.current = false;
    }, 2000);
    
    await votingOperations.removeVote(
      voteValue,
      { 
        voteCount, 
        userVotes, 
        votesUsed 
      },
      { 
        setLoading, 
        setVoteCount,
        setUserVotes,
        setVotesUsed: () => {}
      }
    );
  };
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (recentlyVotedTimeoutRef.current) {
        clearTimeout(recentlyVotedTimeoutRef.current);
      }
    };
  }, []);

  return {
    voteCount: isPreviewMode ? 0 : voteCount,
    userVotes: isPreviewMode ? { upvotes: 0, downvotes: 0, totalVotes: 0 } : userVotes,
    votesUsed,
    votesRemaining,
    voteLimit,
    loading: isPreviewMode ? false : loading,
    castVote: isPreviewMode ? async () => {} : castVote,
    removeVote: isPreviewMode ? async () => {} : removeVote,
    setVoteCountFromBroadcast
  };
};
