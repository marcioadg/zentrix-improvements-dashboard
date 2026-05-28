import React from 'react';
import { Clock, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';

interface MinimalTimerDisplayProps {
  variant?: 'header' | 'section';
  sectionName?: string;
}

export const MinimalTimerDisplay: React.FC<MinimalTimerDisplayProps> = ({
  variant = 'header',
  sectionName
}) => {
  const {
    isRunning,
    timerState,
    calculations,
    canControlTimer,
    pauseTimer,
    resumeTimer,
    formatDuration,
  } = useNewMeetingTimer();

  if (!isRunning) {
    return null;
  }

  const duration = variant === 'section' 
    ? calculations.sectionDurationMs 
    : calculations.activeDurationMs;
  
  const formattedTime = formatDuration(duration);
  const isPaused = timerState.isPaused;

  const handlePause = () => {
    pauseTimer('break');
  };

  const handleResume = () => {
    resumeTimer();
  };

  if (variant === 'header') {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isPaused ? 'bg-warning' : 'bg-success'}`} />
          <span className={`font-mono text-sm font-medium ${isPaused ? 'text-warning' : 'text-success'}`}>
            {formattedTime}
          </span>
          {isPaused && <Pause className="h-3 w-3 text-warning" />}
        </div>
        
        {canControlTimer && (
          <Button
            onClick={isPaused ? handleResume : handlePause}
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
          >
            {isPaused ? (
              <Play className="h-3 w-3" />
            ) : (
              <Pause className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md border border-border/30">
      <div className="flex items-center gap-2">
        <Clock className={`h-4 w-4 ${isPaused ? 'text-warning' : 'text-success'}`} />
        <div>
          <div className={`font-mono text-lg font-semibold ${isPaused ? 'text-warning' : 'text-success'}`}>
            {formattedTime}
          </div>
          {sectionName && (
            <div className="text-xs text-muted-foreground">
              {sectionName}
              {isPaused && ' • Paused'}
            </div>
          )}
        </div>
      </div>
      
      {canControlTimer && (
        <Button
          onClick={isPaused ? handleResume : handlePause}
          variant={isPaused ? "default" : "outline"}
          size="sm"
          className="h-8 px-3 text-xs"
        >
          {isPaused ? (
            <>
              <Play className="h-3 w-3 mr-1" />
              Resume
            </>
          ) : (
            <>
              <Pause className="h-3 w-3 mr-1" />
              Pause
            </>
          )}
        </Button>
      )}
    </div>
  );
};