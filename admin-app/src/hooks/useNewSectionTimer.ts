
import { useMemo } from 'react';
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';
import { TimerEngine } from '@/lib/timer/timerEngine';
import { logger } from '@/utils/logger';

interface UseNewSectionTimerReturn {
  duration: number;
  isRunning: boolean;
  formatDuration: (ms: number) => string;
  isOvertime: (targetMs: number) => boolean;
}

export const useNewSectionTimer = (
  sectionIndex: number,
  isActive: boolean,
  isCompleted: boolean
): UseNewSectionTimerReturn => {
  const { 
    isRunning: meetingIsRunning, 
    timerState, 
    calculations,
    formatDuration 
  } = useNewMeetingTimer();

  const duration = useMemo(() => {
    // Get any previously accumulated time for this section
    const previouslyAccumulated = timerState.sectionAccumulatedTimes[sectionIndex] || 0;
    
    logger.log(`🔧 useNewSectionTimer: Section ${sectionIndex} duration calculation:`, {
      sectionIndex,
      isActive,
      meetingIsRunning,
      isPaused: timerState.isPaused,
      previouslyAccumulated,
      sectionDurationMs: calculations.sectionDurationMs,
      currentSection: timerState.currentSection,
      allAccumulatedTimes: timerState.sectionAccumulatedTimes
    });
    
    // Handle virtual pause section (-1) - show 0 duration
    if (timerState.currentSection === -1) {
      logger.log(`🔧 useNewSectionTimer: Virtual pause section active, showing accumulated time for section ${sectionIndex}: ${previouslyAccumulated}ms`);
      return previouslyAccumulated;
    }
    
    // For the active section (not in pause state), use live RPC calculations
    if (isActive && meetingIsRunning && sectionIndex === timerState.currentSection) {
      // Use live RPC calculation plus any previously accumulated time
      const totalTime = previouslyAccumulated + calculations.sectionDurationMs;
      logger.log(`🔧 useNewSectionTimer: Active section ${sectionIndex} using live RPC duration: ${calculations.sectionDurationMs}ms, total: ${totalTime}ms`);
      return totalTime;
    }
    
    // If this section was previously visited but is not currently active, show the accumulated time
    if (previouslyAccumulated > 0) {
      logger.log(`🔧 useNewSectionTimer: Inactive section ${sectionIndex} showing accumulated time: ${previouslyAccumulated}ms`);
      return previouslyAccumulated;
    }
    
    // Default to 0 for unvisited sections
    logger.log(`🔧 useNewSectionTimer: Unvisited section ${sectionIndex} defaulting to 0`);
    return 0;
  }, [isActive, meetingIsRunning, timerState.isPaused, calculations.sectionDurationMs, timerState.sectionAccumulatedTimes, sectionIndex, timerState.currentSection]);

  const isRunning = isActive && meetingIsRunning && !timerState.isPaused;

  const isOvertime = (targetMs: number) => TimerEngine.isOvertime(duration, targetMs);

  return {
    duration,
    isRunning,
    formatDuration,
    isOvertime,
  };
};
