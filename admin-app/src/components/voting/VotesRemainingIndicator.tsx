
import React, { useContext } from 'react';
import { VotingContext } from '@/contexts/VotingContext';
import { NewMeetingTimerContext } from '@/contexts/NewMeetingTimerContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, RefreshCw } from 'lucide-react';

interface VotesRemainingIndicatorProps {
  teamId: string;
  className?: string;
  onOpenSettings?: () => void;
}

export const VotesRemainingIndicator: React.FC<VotesRemainingIndicatorProps> = ({
  teamId,
  className,
  onOpenSettings
}) => {
  // Safe context access for preview mode
  const timerContext = useContext(NewMeetingTimerContext);
  const votingContext = useContext(VotingContext);
  
  const meetingId = timerContext?.meetingId;
  const currentRole = timerContext?.currentRole;
  const votesUsed = votingContext?.votesUsed ?? 0;
  const voteLimit = votingContext?.voteLimit ?? 25;
  const loading = votingContext?.loading ?? false;
  const dataLoaded = votingContext?.dataLoaded ?? false;

  if (!meetingId) {
    return null;
  }

  const percentageUsed = (votesUsed / voteLimit) * 100;
  
  const getVariant = () => {
    if (votesUsed === voteLimit) return 'default'; // Green when fully used
    if (percentageUsed >= 100) return 'destructive';
    if (percentageUsed >= 70) return 'secondary';
    return 'outline';
  };

  // Only show settings button to scribers
  const canAccessSettings = currentRole === 'scriber';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant={getVariant()} className="text-xs">
        {(loading || !dataLoaded) && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
        {!dataLoaded ? 'Loading...' : `${votesUsed} / ${voteLimit} used`}
      </Badge>
      {onOpenSettings && canAccessSettings && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenSettings}
          className="h-6 w-6 p-0"
          title="Vote settings (Scriber only)"
        >
          <Settings className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};
