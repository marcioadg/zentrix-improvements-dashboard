
export interface TimerState {
  meetingStartTime: number | null;
  sectionStartTime: number | null;
  currentSection: number;
  sectionDurations: Record<number, number>;
  sectionAccumulatedTimes: Record<number, number>; // New: tracks total time spent in each section
  isPaused: boolean;
  totalPauseDuration: number;
  lastPauseTimestamp: number | null;
  pauseReason?: string;
  pauseHistory: PauseEvent[];
}

export interface PauseEvent {
  startTime: number;
  endTime?: number;
  reason?: string;
  userId: string;
}

export interface TimerCalculation {
  overallDurationMs: number;
  sectionDurationMs: number;
  totalPauseDurationMs: number;
  activeDurationMs: number;
  sectionAccumulatedMs: number; // New: total accumulated time for current section
}

export class TimerEngine {
  static calculateDurations(state: TimerState, currentTime: number = Date.now()): TimerCalculation {
    const { 
      meetingStartTime, 
      sectionStartTime, 
      isPaused, 
      totalPauseDuration, 
      lastPauseTimestamp,
      currentSection,
      sectionAccumulatedTimes
    } = state;

    if (!meetingStartTime) {
      return {
        overallDurationMs: 0,
        sectionDurationMs: 0,
        totalPauseDurationMs: 0,
        activeDurationMs: 0,
        sectionAccumulatedMs: 0,
      };
    }

    // Calculate total pause duration including current pause
    let adjustedPauseDuration = totalPauseDuration;
    if (isPaused && lastPauseTimestamp) {
      adjustedPauseDuration += (currentTime - lastPauseTimestamp);
    }

    // Calculate overall active duration
    const totalDuration = currentTime - meetingStartTime;
    const activeDurationMs = Math.max(0, totalDuration - adjustedPauseDuration);

    // Calculate current section duration (time since entering this section)
    let sectionDurationMs = 0;
    if (sectionStartTime) {
      sectionDurationMs = currentTime - sectionStartTime;
      // Subtract current pause from section duration if paused
      if (isPaused && lastPauseTimestamp) {
        const pauseOffset = currentTime - lastPauseTimestamp;
        sectionDurationMs -= pauseOffset;
      }
      // BUGFIX: Ensure never negative (can happen on rapid pause/resume)
      sectionDurationMs = Math.max(0, sectionDurationMs);
    }

    // Calculate total accumulated time for current section
    const previousAccumulated = sectionAccumulatedTimes[currentSection] || 0;
    const sectionAccumulatedMs = previousAccumulated + sectionDurationMs;

    return {
      overallDurationMs: Math.max(0, totalDuration),
      sectionDurationMs,
      totalPauseDurationMs: adjustedPauseDuration,
      activeDurationMs,
      sectionAccumulatedMs,
    };
  }

  static formatDuration(milliseconds: number): string {
    if (milliseconds < 0) return "0:00";
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  static isOvertime(currentDurationMs: number, targetDurationMs: number): boolean {
    return currentDurationMs > targetDurationMs;
  }

  static getOvertimeAmount(currentDurationMs: number, targetDurationMs: number): number {
    return Math.max(0, currentDurationMs - targetDurationMs);
  }

  // New helper method to update section accumulated times when switching sections
  static updateSectionAccumulatedTime(
    state: TimerState, 
    currentTime: number = Date.now()
  ): Record<number, number> {
    const calculations = TimerEngine.calculateDurations(state, currentTime);
    
    return {
      ...state.sectionAccumulatedTimes,
      [state.currentSection]: calculations.sectionAccumulatedMs
    };
  }
}
