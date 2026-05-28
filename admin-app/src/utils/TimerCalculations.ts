
/**
 * Pure timer calculation functions based on timestamps
 * No side effects, easy to test and debug
 */

export interface TimerState {
  meetingStartTime: number | null;
  sectionStartTime: number | null;
  currentTime: number;
  completedSectionDurations: Record<number, number>;
  isPaused: boolean;
  totalPauseDuration: number;
  lastPauseTimestamp: number | null;
}

/**
 * Calculate current section duration from timestamps
 */
export const calculateSectionDuration = (state: TimerState): number => {
  if (!state.sectionStartTime) return 0;
  
  let duration = state.currentTime - state.sectionStartTime;
  
  // Subtract current pause time if paused
  if (state.isPaused && state.lastPauseTimestamp) {
    duration -= (state.currentTime - state.lastPauseTimestamp);
  }
  
  return Math.max(0, duration);
};

/**
 * Calculate overall meeting duration from timestamps
 */
export const calculateOverallDuration = (state: TimerState): number => {
  if (!state.meetingStartTime) return 0;
  
  let duration = state.currentTime - state.meetingStartTime - state.totalPauseDuration;
  
  // Subtract current pause if paused
  if (state.isPaused && state.lastPauseTimestamp) {
    duration -= (state.currentTime - state.lastPauseTimestamp);
  }
  
  return Math.max(0, duration);
};

/**
 * Calculate total session duration (completed sections + current section)
 */
export const calculateSessionDuration = (state: TimerState): number => {
  const completedDuration = Object.values(state.completedSectionDurations)
    .reduce((sum, duration) => sum + duration, 0);
  
  const currentSectionDuration = calculateSectionDuration(state);
  
  return completedDuration + currentSectionDuration;
};

/**
 * Format duration from milliseconds to MM:SS or H:MM:SS when > 59 minutes
 */
export const formatDuration = (duration: number): string => {
  if (!duration || duration < 0) return "00:00";
  
  const totalSeconds = Math.floor(duration / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

/**
 * Validate timer state for consistency
 */
export const validateTimerState = (state: TimerState): boolean => {
  // Meeting start time should be before current time
  if (state.meetingStartTime && state.meetingStartTime > state.currentTime) {
    return false;
  }
  
  // Section start time should be after meeting start time
  if (state.meetingStartTime && state.sectionStartTime && 
      state.sectionStartTime < state.meetingStartTime) {
    return false;
  }
  
  // Pause timestamp should be valid if paused
  if (state.isPaused && (!state.lastPauseTimestamp || 
      state.lastPauseTimestamp > state.currentTime)) {
    return false;
  }
  
  return true;
};
