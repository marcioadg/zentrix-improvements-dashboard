import React, { createContext, useContext, ReactNode, useEffect, useRef, useCallback } from 'react';
import { useVotesUsed } from '@/hooks/voting/useVotesUsed';
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface VotingContextType {
  votesUsed: number;
  votesRemaining: number;
  voteLimit: number;
  loading: boolean;
  dataLoaded: boolean;
  updateVotesUsed: (delta: number) => void;
  setVotesUsedExact: (value: number) => void;
  refreshVotesUsed: () => void;
  refreshVoteLimit: () => Promise<void>;
}

const VotingContext = createContext<VotingContextType | undefined>(undefined);

export { VotingContext };
export const useVotingContext = () => {
  const context = useContext(VotingContext);
  if (context === undefined) {
    throw new Error('useVotingContext must be used within a VotingProvider');
  }
  return context;
};

interface VotingProviderProps {
  children: ReactNode;
  teamId: string;
}

export const VotingProvider: React.FC<VotingProviderProps> = ({ children, teamId }) => {
  const { meetingId } = useNewMeetingTimer();
  
  const votesUsedData = useVotesUsed(teamId);
  
  // Store callbacks in refs to prevent channel recreation when they change
  const refreshVotesUsedRef = useRef(votesUsedData.refreshVotesUsed);
  const refreshVoteLimitRef = useRef(votesUsedData.refreshVoteLimit);
  
  // Keep refs updated
  useEffect(() => {
    refreshVotesUsedRef.current = votesUsedData.refreshVotesUsed;
    refreshVoteLimitRef.current = votesUsedData.refreshVoteLimit;
  }, [votesUsedData.refreshVotesUsed, votesUsedData.refreshVoteLimit]);

  // Stable callback wrappers that don't change reference
  const stableRefreshVotesUsed = useCallback(() => {
    refreshVotesUsedRef.current();
  }, []);
  
  const stableRefreshVoteLimit = useCallback(async () => {
    await refreshVoteLimitRef.current();
  }, []);

  // Set up centralized real-time subscription for vote changes
  // FIXED: Only depend on teamId and meetingId, not votesUsedData
  useEffect(() => {
    if (!teamId || !meetingId) return;

    const channelName = `team-vote-changes-${teamId}-${Date.now()}`;
    logger.log('VotingProvider: Setting up centralized real-time subscription with channel:', channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'issue_votes',
          filter: `team_id=eq.${teamId}`
        },
        async (payload) => {
          logger.log('VotingProvider: Received centralized real-time vote change:', payload);
          
          // Get current user to check if this is our own vote
          const { data: { user } } = await supabase.auth.getUser();
          const currentUserId = user?.id;
          
          // For INSERT and DELETE events, check if this is from current user
          if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
            const voteUserId = (payload.new as any)?.user_id || (payload.old as any)?.user_id;
            const meetingStateId = (payload.new as any)?.meeting_state_id || (payload.old as any)?.meeting_state_id;
            
            // Only process votes for the current meeting
            if (meetingStateId !== meetingId) {
              logger.log('VotingProvider: Ignoring vote from different meeting');
              return;
            }

            // CRITICAL: Only update global vote count for votes from OTHER users
            // This prevents double-counting our own votes (which are handled by optimistic updates)
            if (currentUserId !== voteUserId) {
              logger.log('VotingProvider: Processing vote from other user for global count');
              
              // Immediate refresh for vote changes from other users
              stableRefreshVotesUsed();
            } else {
              logger.log('VotingProvider: Ignoring own vote for global count (handled by optimistic updates)');
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'issues',
          filter: `team_id=eq.${teamId}`
        },
        async (payload) => {
          logger.log('VotingProvider: Received issue update:', payload);
          
          const oldRecord = payload.old as any;
          const newRecord = payload.new as any;
          
          // Check if issue was resolved or archived
          const wasResolved = oldRecord.status === 'open' && newRecord.status === 'resolved';
          const wasArchived = !oldRecord.archived && newRecord.archived;
          
          if (wasResolved || wasArchived) {
            logger.log('VotingProvider: Issue was resolved or archived, votes should be returned');
            
            // The trigger will automatically delete the votes, which will trigger
            // the vote deletion subscription above to update the UI
            // Immediately refresh the vote count to reflect returned votes
            setTimeout(() => {
              stableRefreshVotesUsed();
            }, 100);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'meetings_state',
          filter: `id=eq.${meetingId}`
        },
        async (payload) => {
          logger.log('VotingProvider: Received meeting state update:', payload);
          
          const oldRecord = payload.old as any;
          const newRecord = payload.new as any;
          
          // Check if vote limit was updated
          if (oldRecord.vote_limit !== newRecord.vote_limit) {
            logger.log('VotingProvider: Vote limit updated from', oldRecord.vote_limit, 'to', newRecord.vote_limit);
            
            // Get current user to check if this is our own change
            const { data: { user } } = await supabase.auth.getUser();
            const currentUserId = user?.id;
            
            // Only show notification and refresh for OTHER users (not the one who changed it)
            // The person who changed it already gets feedback from the modal
            if (currentUserId !== newRecord.updated_by) {
              toast(`Meeting vote limit changed to ${newRecord.vote_limit} votes per participant.`);
            }
            
            // Refresh vote limit for ALL users (including the one who changed it)
            // This ensures the UI is consistent across all participants
            await stableRefreshVoteLimit();
          }
        }
      )
      .subscribe((status) => {
        logger.log('VotingProvider: Centralized subscription status changed to:', status);
      });

    return () => {
      logger.log('VotingProvider: Cleaning up centralized real-time subscription for team:', teamId);
      supabase.removeChannel(channel);
    };
  }, [teamId, meetingId, stableRefreshVotesUsed, stableRefreshVoteLimit]);

  return (
    <VotingContext.Provider value={{
      ...votesUsedData,
      setVotesUsedExact: votesUsedData.setVotesUsedExact,
      refreshVotesUsed: votesUsedData.refreshVotesUsed,
      refreshVoteLimit: votesUsedData.refreshVoteLimit
    }}>
      {children}
    </VotingContext.Provider>
  );
};
