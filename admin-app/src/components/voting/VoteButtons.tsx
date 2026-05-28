import React, { useContext, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { useVoting } from '@/hooks/useVoting';
import { VotingContext } from '@/contexts/VotingContext';
import { UserVoteData } from '@/hooks/voting/types';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';

interface VoteButtonsProps {
  issueId: string;
  teamId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onOptimisticUpdate?: (issueId: string) => void;
  onVoteCountChange?: (issueId: string, voteCount: number) => void;
  publishVote?: (issueId: string, voteValue: number, newVoteCount: number) => void;
  remoteVoteCount?: number;
  onClearRemoteVoteCount?: (issueId: string) => void;
  initialVoteCount?: number;
  initialUserVotes?: UserVoteData;
}

export const VoteButtons: React.FC<VoteButtonsProps> = ({
  issueId,
  teamId,
  className,
  size = 'md',
  onOptimisticUpdate,
  onVoteCountChange,
  publishVote,
  remoteVoteCount,
  onClearRemoteVoteCount,
  initialVoteCount,
  initialUserVotes
}) => {
  const {
    voteCount,
    userVotes,
    votesRemaining,
    loading,
    castVote,
    setVoteCountFromBroadcast
  } = useVoting(issueId, teamId, publishVote, initialVoteCount, initialUserVotes);
  
  // Safe context access for preview mode
  const votingContext = useContext(VotingContext);
  const dataLoaded = votingContext?.dataLoaded ?? true;

  // Apply remote vote count from broadcast using the safe method
  useEffect(() => {
    if (remoteVoteCount !== undefined) {
      setVoteCountFromBroadcast(remoteVoteCount);
    }
  }, [remoteVoteCount, setVoteCountFromBroadcast]);

  // Notify parent of vote count changes for real-time sorting
  useEffect(() => {
    if (onVoteCountChange && !loading && dataLoaded) {
      onVoteCountChange(issueId, voteCount);
    }
  }, [voteCount, loading, dataLoaded, issueId, onVoteCountChange]);

  const handleUpvote = async () => {
    // Clear stale remote vote count BEFORE voting to prevent it from being reapplied
    onClearRemoteVoteCount?.(issueId);
    onOptimisticUpdate?.(issueId);
    await castVote(1);
    // NOTE: Broadcast is now handled inside VotingOperations AFTER server confirmation
  };

  const handleDownvote = async () => {
    // Prevent downvoting if user has no votes on this issue
    if (userVotes.totalVotes <= 0) {
      logger.log('VoteButtons: Preventing downvote - user has no votes on this issue');
      return;
    }
    // Clear stale remote vote count BEFORE voting to prevent it from being reapplied
    onClearRemoteVoteCount?.(issueId);
    onOptimisticUpdate?.(issueId);
    await castVote(-1);
    // NOTE: Broadcast is now handled inside VotingOperations AFTER server confirmation
  };

  const buttonSizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };
  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };
  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  // Show loading state for vote limits while data loads
  const isUpvoteDisabled = loading || dataLoaded && votesRemaining <= 0;
  const isDownvoteDisabled = loading || userVotes.totalVotes <= 0;

  // Update tooltip to show loading state
  const upvoteTooltip = loading || !dataLoaded ? 'Loading vote data...' : votesRemaining <= 0 ? 'No votes remaining - cannot add vote' : `Add vote (${votesRemaining} votes remaining)${userVotes.upvotes > 0 ? ` - You have ${userVotes.upvotes} vote${userVotes.upvotes > 1 ? 's' : ''}` : ''}`;
  const downvoteTooltip = loading || !dataLoaded ? 'Loading vote data...' : userVotes.totalVotes <= 0 ? 'No votes to remove on this issue' : `Remove vote - frees up a vote${userVotes.totalVotes > 0 ? ` - You have ${userVotes.totalVotes} vote${userVotes.totalVotes > 1 ? 's' : ''} on this issue` : ''}`;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Upvote Button */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleUpvote} 
        disabled={isUpvoteDisabled} 
        className={cn(buttonSizes[size], 'p-0 rounded-md transition-all duration-150 hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2', isUpvoteDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:text-success hover:scale-110')}
        title={upvoteTooltip}
      >
        <ChevronUp className={iconSizes[size]} />
      </Button>

      {/* Total Vote Count */}
      <div className={cn('text-center font-medium transition-colors leading-none min-w-[20px]', textSizes[size], voteCount > 0 ? 'text-success' : voteCount < 0 ? 'text-destructive' : 'text-muted-foreground')}>
      {!dataLoaded ? (
          <Loader2 className={cn(iconSizes[size], 'animate-spin')} />
        ) : (
          voteCount
        )}
      </div>

      {/* Downvote Button */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleDownvote} 
        disabled={isDownvoteDisabled} 
        className={cn(buttonSizes[size], 'p-0 rounded-md transition-all duration-150 hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2', isDownvoteDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:text-destructive hover:scale-110')}
        title={downvoteTooltip}
      >
        <ChevronDown className={iconSizes[size]} />
      </Button>
    </div>
  );
};
