import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useIssueVotes } from '@/hooks/useIssueVotes';
import { cn } from '@/lib/utils';

interface IssueVoteButtonsProps {
  issueId: string;
  teamId: string;
  className?: string;
}

export const IssueVoteButtons: React.FC<IssueVoteButtonsProps> = ({ 
  issueId, 
  teamId, 
  className 
}) => {
  const { voteCounts, vote, loading } = useIssueVotes(issueId, teamId);

  const handleVote = (e: React.MouseEvent, voteValue: 1 | -1) => {
    e.stopPropagation();
    vote(voteValue);
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => handleVote(e, 1)}
        disabled={loading}
        className="h-7 w-7 p-0 text-muted-foreground hover:text-success hover:bg-success/10 transition-colors"
        title="Add vote"
      >
        <ChevronUp className="h-3 w-3" />
      </Button>
      
      <span className="text-xs text-muted-foreground min-w-[20px] text-center font-medium">
        {voteCounts.netScore}
      </span>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => handleVote(e, -1)}
        disabled={loading}
        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        title="Remove vote"
      >
        <ChevronDown className="h-3 w-3" />
      </Button>
    </div>
  );
};