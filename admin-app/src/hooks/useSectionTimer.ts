import { useState, useEffect, useRef, useCallback } from 'react';
import { useMeeting } from '@/contexts/MeetingContext';
import { debugLogger } from '@/utils/debugLogger';

interface UseSectionTimerReturn {
  duration: number;
  isRunning: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
  formatDuration: (ms: number) => string;
  getCurrentDuration: () => number;
}

// Timer persistence keys for localStorage
const TIMER_STORAGE_KEY = 'meeting_timer_state';
const SECTION_START_KEY = 'section_start_time';

interface TimerState {
  startTime: number;
  sectionStartTime: number;
  lastDuration: number;
}

export const useSectionTimer = (
  isActive: boolean, 
  initialDuration: number = 0,
  onDurationUpdate?: (duration: number) => void
): UseSectionTimerReturn => {
  const [duration, setDuration] = useState(initialDuration);
  const [isRunning, setIsRunning] = useState(false);
  const currentDurationRef = useRef(initialDuration);
  const guaranteedStartTimeRef = useRef<number | null>(null);
  
  const { 
    currentTime, 
    formatDuration: contextFormatDuration, 
    getEffectiveSectionStartTime,
    overallStartTime
  } = useMeeting();

  // Load persisted timer state on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(TIMER_STORAGE_KEY);
      const sectionStored = localStorage.getItem(SECTION_START_KEY);
      
      if (stored) {
        const state: TimerState = JSON.parse(stored);
        if (state.lastDuration > 0 && !isRunning) {
          setDuration(state.lastDuration);
          currentDurationRef.current = state.lastDuration;
          debugLogger.timer.info('Restored timer state from localStorage', { data: state });
        }
      }
      
      if (sectionStored && !guaranteedStartTimeRef.current) {
        const sectionStart = parseInt(sectionStored, 10);
        if (!isNaN(sectionStart) && sectionStart > 0) {
          guaranteedStartTimeRef.current = sectionStart;
          debugLogger.timer.info('Restored section start time from localStorage', { data: sectionStart });
        }
      }
    } catch (error) {
      debugLogger.timer.warn('Failed to restore timer state', { data: error });
    }
  }, [isRunning]);

  // Persist timer state
  const persistTimerState = useCallback((newDuration: number, startTime?: number) => {
    try {
      const state: TimerState = {
        startTime: startTime || guaranteedStartTimeRef.current || currentTime,
        sectionStartTime: guaranteedStartTimeRef.current || currentTime,
        lastDuration: newDuration
      };
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
      
      if (guaranteedStartTimeRef.current) {
        localStorage.setItem(SECTION_START_KEY, guaranteedStartTimeRef.current.toString());
      }
    } catch (error) {
      debugLogger.timer.warn('Failed to persist timer state', { data: error });
    }
  }, [currentTime]);

  // Update duration when initialDuration changes (but not when timer is running)
  useEffect(() => {
    if (!isRunning && initialDuration !== currentDurationRef.current) {
      setDuration(initialDuration);
      currentDurationRef.current = initialDuration;
      debugLogger.timer.debug('Updated duration from initialDuration', { data: initialDuration });
    }
  }, [initialDuration, isRunning]);

  const formatDuration = useCallback((milliseconds: number): string => {
    if (!milliseconds || milliseconds < 0 || isNaN(milliseconds)) {
      return "0:00";
    }
    return contextFormatDuration(milliseconds);
  }, [contextFormatDuration]);

  const getCurrentDuration = useCallback((): number => {
    return currentDurationRef.current;
  }, []);

  const start = useCallback(() => {
    if (!isRunning) {
      // Set guaranteed start time if not already set
      if (!guaranteedStartTimeRef.current) {
        guaranteedStartTimeRef.current = currentTime;
        debugLogger.timer.info('Set guaranteed start time', { data: guaranteedStartTimeRef.current });
      }
      
      setIsRunning(true);
      debugLogger.timer.info('Timer started', { 
        data: { 
          isActive, 
          guaranteedStart: guaranteedStartTimeRef.current 
        } 
      });
    }
  }, [isRunning, isActive, currentTime]);

  const stop = useCallback(() => {
    setIsRunning(false);
    persistTimerState(currentDurationRef.current);
    debugLogger.timer.info('Timer stopped', { data: currentDurationRef.current });
    
    if (onDurationUpdate) {
      onDurationUpdate(currentDurationRef.current);
    }
  }, [onDurationUpdate, persistTimerState]);

  const reset = useCallback(() => {
    stop();
    setDuration(0);
    currentDurationRef.current = 0;
    guaranteedStartTimeRef.current = null;
    
    // Clear persisted state
    try {
      localStorage.removeItem(TIMER_STORAGE_KEY);
      localStorage.removeItem(SECTION_START_KEY);
    } catch (error) {
      debugLogger.timer.warn('Failed to clear timer state', { data: error });
    }
    
    if (onDurationUpdate) {
      onDurationUpdate(0);
    }
    
    debugLogger.timer.info('Timer reset');
  }, [stop, onDurationUpdate]);

  // Fixed duration calculation - NO INCREMENT FALLBACK
  useEffect(() => {
    if (isActive && isRunning) {
      let newDuration = 0;
      let source = 'unknown';
      
      try {
        // Priority 1: Use context timer if available and valid
        const contextStartTime = getEffectiveSectionStartTime();
        if (contextStartTime && contextStartTime > 0 && currentTime > contextStartTime) {
          newDuration = currentTime - contextStartTime;
          source = 'context';
        }
        // Priority 2: Use our guaranteed start time
        else if (guaranteedStartTimeRef.current && currentTime > guaranteedStartTimeRef.current) {
          newDuration = currentTime - guaranteedStartTimeRef.current;
          source = 'guaranteed';
        }
        // Priority 3: Use overall meeting start time if available
        else if (overallStartTime && currentTime > overallStartTime) {
          newDuration = currentTime - overallStartTime;
          source = 'overall';
        }
        // NO MORE INCREMENT FALLBACK - If we can't calculate properly, keep current duration
        else {
          debugLogger.timer.warn('Unable to calculate duration - no valid start time found', {
            data: {
              currentTime,
              contextStartTime: getEffectiveSectionStartTime(),
              guaranteedStart: guaranteedStartTimeRef.current,
              overallStartTime
            }
          });
          return; // Don't update duration if we can't calculate it properly
        }
      } catch (error) {
        debugLogger.timer.error('Error calculating duration', { data: error });
        return; // Don't update on error
      }
      
      // Validate and apply the calculated duration
      if (newDuration >= 0 && isFinite(newDuration) && !isNaN(newDuration)) {
        // Only update if there's a meaningful change (avoid micro-updates)
        if (Math.abs(newDuration - currentDurationRef.current) >= 900) {
          setDuration(newDuration);
          currentDurationRef.current = newDuration;
          
          // Persist state periodically
          if (Math.floor(newDuration / 10000) !== Math.floor(currentDurationRef.current / 10000)) {
            persistTimerState(newDuration);
          }
          
          if (onDurationUpdate) {
            onDurationUpdate(newDuration);
          }
          
          debugLogger.timer.debug(`Duration updated (${source})`, { data: newDuration });
        }
      } else {
        debugLogger.timer.warn('Invalid duration calculated', { 
          data: { newDuration, source, currentTime, contextStartTime: getEffectiveSectionStartTime() }
        });
      }
    }
  }, [
    currentTime, 
    isActive, 
    isRunning, 
    getEffectiveSectionStartTime, 
    overallStartTime,
    onDurationUpdate, 
    persistTimerState
  ]);

  // Auto-start/stop based on isActive prop
  useEffect(() => {
    if (isActive && !isRunning) {
      start();
    } else if (!isActive && isRunning) {
      stop();
    }
  }, [isActive, isRunning, start, stop]);

  return {
    duration,
    isRunning,
    start,
    stop,
    reset,
    formatDuration,
    getCurrentDuration
  };
};
