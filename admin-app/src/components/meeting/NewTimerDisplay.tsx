import React from 'react';
import { Clock, Pause, Play, Crown, Users, AlertTriangle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';
import { useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface NewTimerDisplayProps {
  variant?: 'overall' | 'section' | 'compact';
  sectionName?: string;
  targetDurationMs?: number;
}
export const NewTimerDisplay: React.FC<NewTimerDisplayProps> = ({
  variant = 'overall',
  sectionName,
  targetDurationMs
}) => {
  const {
    isRunning,
    timerState,
    calculations,
    currentRole,
    canControlTimer,
    pauseTimer,
    resumeTimer,
    formatDuration,
    isOvertime,
    scriberId,
    takeOverAsScriber,
    meetingId
  } = useNewMeetingTimer();
  
  const params = useParams();
  const teamId = params.teamId as string;
  const { toast } = useToast();
  



  if (!isRunning) {
    return <div className="text-sm text-muted-foreground">
        No active meeting
      </div>;
  }
  const getDuration = () => {
    switch (variant) {
      case 'section':
        return calculations.sectionDurationMs;
      case 'overall':
      default:
        return calculations.activeDurationMs;
    }
  };
  const duration = getDuration();
  const formattedTime = formatDuration(duration);
  const isPaused = timerState.isPaused;
  const isOvertimeCheck = targetDurationMs ? isOvertime(targetDurationMs) : false;
  const handlePause = () => {
    pauseTimer('break');
  };
  const handleResume = () => {
    resumeTimer();
  };
  const handleTakeOver = async () => {
    try {
      await takeOverAsScriber();
    } catch (error) {
      logger.error('Failed to take over as scriber:', error);
    }
  };

  // Determine button text and state based on current role and scriber status
  const getTakeOverButtonConfig = () => {
    if (currentRole === 'scriber') {
      return {
        text: 'You are Scriber',
        disabled: true,
        variant: 'secondary' as const,
        className: 'flex items-center gap-2 text-xs px-3 py-1 h-8 bg-success/10 border-success/30 text-success cursor-not-allowed'
      };
    } else if (!scriberId) {
      return {
        text: 'Take Over',
        disabled: false,
        variant: 'outline' as const,
        className: 'flex items-center gap-2 text-xs px-3 py-1 h-8 border-warning/30 hover:bg-warning/10 hover:border-warning/40'
      };
    } else {
      return {
        text: 'Take Over',
        disabled: false,
        variant: 'outline' as const,
        className: 'flex items-center gap-2 text-xs px-3 py-1 h-8 border-warning/30 hover:bg-warning/10 hover:border-warning/40'
      };
    }
  };
  const takeOverConfig = getTakeOverButtonConfig();
  if (variant === 'compact') {
    return <span className={`font-mono text-sm font-medium ${isPaused ? 'text-warning' : isOvertimeCheck ? 'text-error' : 'text-success'}`}>
        {formattedTime}
        {isPaused && (
          <span className="ml-1 text-warning">⏸</span>
        )}
        {isOvertimeCheck && (
          <span className="ml-1 text-error">•</span>
        )}
      </span>;
  }
  return null;
};