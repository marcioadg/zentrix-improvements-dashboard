
import React from 'react';
import { Button } from '@/components/ui/button';
import { Crown } from 'lucide-react';
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';
import { logger } from '@/utils/logger';

export const TakeOverScribeButton: React.FC = () => {
  const { 
    isRunning,
    currentRole,
    scriberId,
    takeOverAsScriber,
    currentUserId 
  } = useNewMeetingTimer();

  // Show button only if:
  // - Meeting is running
  // - User is a participant (not already scriber)
  // - No active scriber exists OR user is not the current scriber
  const isCurrentUserScriber = currentUserId === scriberId;
  const shouldShowButton = isRunning && 
                          currentRole === 'participant' && 
                          !isCurrentUserScriber &&
                          !scriberId;

  if (!shouldShowButton) {
    return null;
  }

  const handleTakeOver = async () => {
    try {
      await takeOverAsScriber();
    } catch (error) {
      logger.error('Failed to take over as scriber:', error);
    }
  };

  return (
    <Button
      onClick={handleTakeOver}
      size="sm"
      variant="outline"
      className="flex items-center gap-2 text-xs px-3 py-1 h-8 border-yellow-300 hover:bg-warning/5 hover:border-yellow-400"
    >
      <Crown className="h-3 w-3 text-warning" />
      Take Over
    </Button>
  );
};
