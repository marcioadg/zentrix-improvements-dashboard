
import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { useNewSectionTimer } from '@/hooks/useNewSectionTimer';

interface SectionTimerProps {
  sectionId: number;
  plannedDurationMinutes: number;
  isActive: boolean;
  isCompleted: boolean;
  compact?: boolean;
  savedSectionDurations?: Record<number, number>; // For completed meetings
}

// Format duration in minutes to human-readable (e.g., "2h" for 120min, "90 min" for 90min)
const formatPlannedDuration = (minutes: number): string => {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    if (remainingMins === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMins}m`;
  }
  return `${minutes} min`;
};

export const SectionTimer: React.FC<SectionTimerProps> = ({
  sectionId,
  plannedDurationMinutes,
  isActive,
  isCompleted,
  compact = false,
  savedSectionDurations,
}) => {
  const { duration: timerDuration, isRunning, formatDuration, isOvertime } = useNewSectionTimer(
    sectionId,
    isActive,
    isCompleted
  );
  
  // For completed meetings, use saved section durations if available
  // savedSectionDurations is in seconds, convert to milliseconds
  const duration = savedSectionDurations?.[sectionId] !== undefined 
    ? savedSectionDurations[sectionId] * 1000 
    : timerDuration;
  
  const plannedDurationMs = plannedDurationMinutes * 60 * 1000;
  const isOverTime = isOvertime(plannedDurationMs);

  // Compact mode - return just the time string
  if (compact) {
    if (isActive && isRunning) {
      return (
        <span className={`font-mono text-sm font-medium ${isOverTime ? 'text-error' : 'text-success'}`}>
          {formatDuration(duration)}{isOverTime ? ' ⚠️' : ''}
        </span>
      );
    }
    
    if (isCompleted || duration > 0) {
      const wasOvertime = isOvertime(plannedDurationMs);
      return (
        <span className={`font-mono text-sm ${wasOvertime ? 'text-error' : 'text-foreground'}`}>
          {formatDuration(duration)}{wasOvertime ? ' ⚠️' : ''}
        </span>
      );
    }

    return (
      <span className="font-mono text-sm text-muted-foreground">
        --:--
      </span>
    );
  }

  // Full mode for active sections
  if (isActive && isRunning) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Clock className={`h-3 w-3 ${isOverTime ? 'text-error' : 'text-success'}`} />
          {isOverTime && <AlertTriangle className="h-3 w-3 text-error" />}
        </div>
        <div className={`font-mono text-sm font-semibold ${
          isOverTime ? 'text-error' : 'text-success'
        }`}>
          {formatDuration(duration)} / {formatDuration(plannedDurationMs)}
        </div>
        {isOverTime && (
          <div className="text-xs text-error font-semibold tracking-tight animate-pulse">
            OVERTIME
          </div>
        )}
      </div>
    );
  }

  // Completed sections or sections with stored duration
  if (isCompleted || duration > 0) {
    const wasOvertime = isOvertime(plannedDurationMs);
    return (
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">
          {formatPlannedDuration(plannedDurationMinutes)}
        </span>
        <span className={`font-mono font-semibold ${
          wasOvertime ? 'text-error' : 'text-foreground'
        }`}>
          {formatDuration(duration)}
          {wasOvertime && ' ⚠️'}
        </span>
      </div>
    );
  }

  // Default state - planned time only
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground font-medium">
        {formatPlannedDuration(plannedDurationMinutes)}
      </span>
      <span className="font-mono text-muted-foreground/50">
        --:--
      </span>
    </div>
  );
};
