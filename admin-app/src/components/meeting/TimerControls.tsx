
import React from 'react';
import { Button } from '@/components/ui/button';
import { Pause, Play, Crown, Users, AlertTriangle } from 'lucide-react';
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';

import { useToast } from '@/hooks/use-toast';
import { useParams } from 'react-router-dom';
import { logger } from '@/lib/logger';

export const TimerControls: React.FC = () => {
  const { 
    timerState,
    currentRole,
    canControlTimer,
    pauseTimer,
    resumeTimer,
    scriberId
  } = useNewMeetingTimer();

  const { toast } = useToast();
  const { teamId } = useParams<{ teamId: string }>();
  

  const isPaused = timerState.isPaused;
  const isScriber = currentRole === 'scriber';

  logger.debug('🔧 TimerControls Debug:', { 
    canControlTimer, 
    currentRole, 
    isScriber, 
    teamId,
    isPaused,
    timerState: timerState ? 'exists' : 'null'
  });

  const handlePause = () => {
    logger.debug('🔧 TimerControls: Pause button clicked');
    pauseTimer('break');
  };

  const handleResume = () => {
    logger.debug('🔧 TimerControls: Resume button clicked');
    resumeTimer();
  };


  if (!canControlTimer) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>Participant - Timer controlled by Scriber</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {isScriber && (
        <div className="flex items-center gap-1 text-sm text-warning font-medium">
          <Crown className="h-4 w-4" />
          <span>Scriber</span>
        </div>
      )}
      
      <Button
        onClick={isPaused ? handleResume : handlePause}
        variant={isPaused ? "default" : "outline"}
        size="sm"
        className="flex items-center gap-2"
      >
        {isPaused ? (
          <>
            <Play className="h-4 w-4" />
            Resume
          </>
        ) : (
          <>
            <Pause className="h-4 w-4" />
            Pause
          </>
        )}
      </Button>

    </div>
  );
};
