
import React from 'react';
import { Clock, Pause } from 'lucide-react';
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';
import { TimerControls } from './TimerControls';

interface MeetingTimerDisplayProps {
  variant?: 'overall' | 'section' | 'compact';
  sectionName?: string;
}

export const MeetingTimerDisplay: React.FC<MeetingTimerDisplayProps> = ({ 
  variant = 'overall',
  sectionName 
}) => {
  const { 
    calculations,
    formatDuration,
    timerState,
    isRunning
  } = useNewMeetingTimer();

  if (!isRunning) {
    return null;
  }

  const getDuration = () => {
    switch (variant) {
      case 'section':
        return calculations.sectionAccumulatedMs;
      case 'overall':
      default:
        return calculations.overallDurationMs;
    }
  };

  const duration = getDuration();
  const formattedTime = formatDuration(duration);
  const isPaused = timerState.isPaused;

  if (variant === 'compact') {
    return (
      <span className={`font-mono text-sm ${isPaused ? 'text-warning' : 'text-success'}`}>
        {formattedTime}
        {isPaused && ' ⏸️'}
      </span>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-card rounded-lg border">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Clock className={`h-5 w-5 ${isPaused ? 'text-warning' : 'text-success'}`} />
          {isPaused && <Pause className="h-4 w-4 text-warning" />}
        </div>
        
        <div>
          <div className={`font-mono text-2xl font-bold ${
            isPaused ? 'text-warning' : 'text-success'
          }`}>
            {formattedTime}
          </div>
          <div className="text-sm text-muted-foreground">
            {variant === 'section' && sectionName ? `${sectionName}` : 'Overall Meeting'}
            {isPaused && ' (Paused)'}
          </div>
        </div>
      </div>
      
      <TimerControls />
    </div>
  );
};
