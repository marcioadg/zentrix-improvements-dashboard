import { supabase } from '@/integrations/supabase/client';
import { VotingService } from '@/services/VotingService';
import { UserVoteData } from './types';
import { voteRequestDeduplicator } from '@/utils/voteRequestDeduplicator';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export class VotingOperations {
  constructor(
    private issueId: string,
    private teamId: string,
    private meetingId: string | null,
    private updateGlobalVotesUsed?: (delta: number) => void,
    private setGlobalVotesUsedExact?: (value: number) => void,
    private publishVote?: (issueId: string, voteValue: number, newVoteCount: number) => void
  ) {}

  async castVote(
    voteValue: 1 | -1,
    state: {
      voteCount: number;
      userVotes: UserVoteData;
      votesUsed: number;
      votesRemaining: number;
      dataLoaded?: boolean;
    },
    setState: {
      setLoading: (loading: boolean) => void;
      setVoteCount: React.Dispatch<React.SetStateAction<number>>;
      setUserVotes: React.Dispatch<React.SetStateAction<UserVoteData>>;
      setVotesUsed: React.Dispatch<React.SetStateAction<number>>;
    }
  ): Promise<void> {
    if (!this.meetingId) {
      logger.error('VotingOperations: No meeting ID available for voting');
      toast.error('Cannot vote: Not in an active meeting');
      return;
    }

    // Only validate vote limits if data has been loaded from server
    if (state.dataLoaded && voteValue === 1 && state.votesRemaining <= 0) {
      logger.error('VotingOperations: No votes remaining for upvoting');
      toast.error('No votes remaining');
      return;
    }

    if (voteValue === -1 && state.voteCount <= 0) {
      logger.error('VotingOperations: Cannot downvote - would make vote count negative');
      toast.error('Cannot downvote below zero');
      return;
    }

    // Get current user for deduplication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      toast.error('Authentication required');
      return;
    }

    setState.setLoading(true);

    try {
      // Use request deduplication to prevent rapid-fire voting
      await voteRequestDeduplicator.deduplicateVote(
        this.issueId,
        user.id,
        voteValue,
        async () => {
          // Apply optimistic updates
          logger.log('VotingOperations: Applying optimistic update for vote:', voteValue);
          
          const optimisticCount = Math.max(0, state.voteCount + voteValue);
          
          setState.setVoteCount(prev => Math.max(0, prev + voteValue));
          
          setState.setUserVotes(prev => ({
            upvotes: voteValue === 1 ? prev.upvotes + 1 : prev.upvotes,
            downvotes: voteValue === -1 ? prev.downvotes + 1 : prev.downvotes,
            totalVotes: voteValue === 1 ? prev.totalVotes + 1 : Math.max(0, prev.totalVotes - 1)
          }));
          
          // Update global votes used
          if (this.updateGlobalVotesUsed) {
            this.updateGlobalVotesUsed(voteValue);
          }

          // Call server
          logger.log('VotingOperations: Casting vote:', voteValue, 'for issue:', this.issueId);
          const result = await VotingService.castVote(this.issueId, voteValue, this.teamId, this.meetingId!);

          if (!result.success) {
            // Rollback optimistic updates on failure
            logger.log('VotingOperations: Rolling back due to error:', result.error);
            setState.setVoteCount(prev => Math.max(0, prev - voteValue));
            setState.setUserVotes(prev => ({
              upvotes: voteValue === 1 ? Math.max(0, prev.upvotes - 1) : prev.upvotes,
              downvotes: voteValue === -1 ? Math.max(0, prev.downvotes - 1) : prev.downvotes,
              totalVotes: voteValue === 1 ? Math.max(0, prev.totalVotes - 1) : prev.totalVotes + 1
            }));
            
            if (this.updateGlobalVotesUsed) {
              this.updateGlobalVotesUsed(-voteValue);
            }
            
            throw new Error(result.error || 'Vote failed');
          }

          logger.log('VotingOperations: Vote cast successfully');
          
          // BROADCAST IMMEDIATELY after server success (before reconciliation)
          // This notifies other participants quickly
          if (this.publishVote) {
            logger.log('📤 VotingOperations: Broadcasting vote immediately with optimistic count:', optimisticCount);
            this.publishVote(this.issueId, voteValue, optimisticCount);
          }
          
          // Reconcile with server in background (doesn't block broadcast)
          try {
            const [authoritativeCount, authoritativeUserVotes, authoritativeVotesUsed] = await Promise.all([
              VotingService.getIssueVoteCount(this.issueId, this.meetingId!),
              VotingService.getUserIssueVotes(this.issueId, this.meetingId!),
              VotingService.getUserVotesUsed(this.teamId, this.meetingId!)
            ]);
            
            // Apply authoritative values from server
            setState.setVoteCount(authoritativeCount);
            setState.setUserVotes(authoritativeUserVotes);
            
            if (this.setGlobalVotesUsedExact) {
              this.setGlobalVotesUsedExact(authoritativeVotesUsed);
            }
            
            logger.log('VotingOperations: Reconciled - count:', authoritativeCount, 'votesUsed:', authoritativeVotesUsed);
          } catch (reconcileError) {
            logger.warn('VotingOperations: Failed to reconcile:', reconcileError);
          }
          
          return result;
        }
      );
    } catch (error) {
      logger.error('VotingOperations: Error casting vote:', error);
      
      if (error instanceof Error) {
        if (error.message === 'vote_limit_exceeded') {
          toast.error('You have reached your vote limit for this meeting');
        } else if (error.message.includes('Please wait before voting again')) {
          logger.log('Vote deduplication in progress');
        } else {
          toast.error(`Vote failed: ${error.message}`);
        }
      } else {
        toast.error('Failed to cast vote. Please try again.');
      }
    } finally {
      setState.setLoading(false);
    }
  }

  async removeVote(
    voteValue: 1 | -1,
    state: {
      voteCount: number;
      userVotes: UserVoteData;
      votesUsed: number;
    },
    setState: {
      setLoading: (loading: boolean) => void;
      setVoteCount: React.Dispatch<React.SetStateAction<number>>;
      setUserVotes: React.Dispatch<React.SetStateAction<UserVoteData>>;
      setVotesUsed: React.Dispatch<React.SetStateAction<number>>;
    }
  ): Promise<void> {
    if (!this.meetingId) {
      logger.error('VotingOperations: No meeting ID available for vote removal');
      toast.error('Cannot remove vote: Not in an active meeting');
      return;
    }

    setState.setLoading(true);

    // Apply immediate optimistic updates
    const optimisticCount = Math.max(0, state.voteCount - voteValue);
    
    logger.log('VotingOperations: Applying optimistic update for vote removal:', voteValue);
    setState.setVoteCount(prev => Math.max(0, prev - voteValue));
    setState.setUserVotes(prev => ({
      upvotes: voteValue === 1 ? Math.max(0, prev.upvotes - 1) : prev.upvotes,
      downvotes: voteValue === -1 ? Math.max(0, prev.downvotes - 1) : prev.downvotes,
      totalVotes: Math.max(0, prev.totalVotes - 1)
    }));
    
    if (this.updateGlobalVotesUsed) {
      this.updateGlobalVotesUsed(-1);
    }

    try {
      logger.log('VotingOperations: Removing vote:', voteValue, 'for issue:', this.issueId);
      const result = await VotingService.removeVote(this.issueId, voteValue, this.meetingId!);

      if (!result.success) {
        // Rollback optimistic updates on failure
        logger.log('VotingOperations: Rolling back vote removal due to error:', result.error);
        setState.setVoteCount(prev => prev + voteValue);
        setState.setUserVotes(prev => ({
          upvotes: voteValue === 1 ? prev.upvotes + 1 : prev.upvotes,
          downvotes: voteValue === -1 ? prev.downvotes + 1 : prev.downvotes,
          totalVotes: prev.totalVotes + 1
        }));
        
        if (this.updateGlobalVotesUsed) {
          this.updateGlobalVotesUsed(1);
        }
        
        logger.error('VotingOperations: Vote removal failed:', result.error);
        toast.error(`Failed to remove vote: ${result.error}`);
        return;
      }

      logger.log('VotingOperations: Vote removed successfully');
      
      // BROADCAST vote removal to other participants
      if (this.publishVote) {
        logger.log('📤 VotingOperations: Broadcasting vote removal with count:', optimisticCount);
        this.publishVote(this.issueId, -voteValue, optimisticCount);
      }
    } catch (error) {
      logger.error('VotingOperations: Error removing vote:', error);
      
      // Rollback optimistic updates on exception
      setState.setVoteCount(prev => prev + voteValue);
      setState.setUserVotes(prev => ({
        upvotes: voteValue === 1 ? prev.upvotes + 1 : prev.upvotes,
        downvotes: voteValue === -1 ? prev.downvotes + 1 : prev.downvotes,
        totalVotes: prev.totalVotes + 1
      }));
      
      if (this.updateGlobalVotesUsed) {
        this.updateGlobalVotesUsed(1);
      }
      
      toast.error('Failed to remove vote. Please try again.');
    } finally {
      setState.setLoading(false);
    }
  }
}
