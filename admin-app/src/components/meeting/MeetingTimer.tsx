
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface MeetingTimerProps {
  startTime: Date | null;
  isActive: boolean;
  duration?: number; // in minutes
}

export const MeetingTimer: React.FC<MeetingTimerProps> = ({
  startTime,
  isActive,
  duration = 5
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isActive || !startTime) {
      setElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const start = startTime.getTime();
      const elapsedSeconds = Math.floor((now - start) / 1000);
      setElapsed(elapsedSeconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, startTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const targetSeconds = duration * 60;
  const isOvertime = elapsed > targetSeconds;

  return (
    <div className={`flex items-center gap-2 text-sm ${
      isOvertime ? 'text-destructive' : 'text-muted-foreground'
    }`}>
      <Clock className="h-4 w-4" />
      <span className="font-mono">
        {formatTime(elapsed)} / {formatTime(targetSeconds)}
      </span>
      {isOvertime && (
        <span className="text-xs text-destructive font-medium">OVERTIME</span>
      )}
    </div>
  );
};
