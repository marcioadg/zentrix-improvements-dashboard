
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { debugLogger } from '@/utils/debugLogger';

interface TimerState {
  meetingStartTime: number | null;
  sectionStartTime: number | null;
  currentSection: number;
  completedSectionDurations: Record<number, number>;
  isPaused: boolean;
  totalPauseDuration: number;
  lastPauseTimestamp: number | null;
  activeMeetingId: string | null;
  teamId: string | null;
  scriberId: string | null;
}

const STORAGE_KEY = 'meeting-timer-state';

export const useTimerPersistence = (
  state: TimerState,
  setState: (state: Partial<TimerState>) => void
) => {
  
  // Save to localStorage whenever state changes
  const saveToStorage = useCallback((stateToSave: TimerState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      debugLogger.timer.debug('Timer state saved to localStorage');
    } catch (error) {
      debugLogger.timer.warn('Failed to save timer state to localStorage', { data: error });
    }
  }, []);

  // Load from localStorage on mount
  const loadFromStorage = useCallback((): Partial<TimerState> | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      debugLogger.timer.debug('Timer state loaded from localStorage', { data: parsed });
      return parsed;
    } catch (error) {
      debugLogger.timer.warn('Failed to load timer state from localStorage', { data: error });
      return null;
    }
  }, []);

  // Clear storage
  const clearStorage = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      debugLogger.timer.debug('Timer state cleared from localStorage');
    } catch (error) {
      debugLogger.timer.warn('Failed to clear timer state from localStorage', { data: error });
    }
  }, []);

  // Enhanced persistence with database sync
  const persistToDatabase = useCallback(async (timerState: TimerState) => {
    if (!timerState.activeMeetingId) return;

    try {
      const { error } = await supabase
        .from('meetings_state')
        .update({
          current_section: timerState.currentSection,
          section_start_time: timerState.sectionStartTime ? new Date(timerState.sectionStartTime).toISOString() : null,
          section_accumulated_times: timerState.completedSectionDurations,
          is_paused: timerState.isPaused,
          total_pause_duration: timerState.totalPauseDuration,
          last_pause_timestamp: timerState.lastPauseTimestamp ? new Date(timerState.lastPauseTimestamp).toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', timerState.activeMeetingId);

      if (error) {
        debugLogger.timer.warn('Failed to persist timer state to database', { data: error });
      } else {
        debugLogger.timer.debug('Timer state persisted to database successfully');
      }
    } catch (error) {
      debugLogger.timer.warn('Database persistence error', { data: error });
    }
  }, []);

  // Restore timer state from database for active meetings
  const restoreFromDatabase = useCallback(async (meetingId: string): Promise<Partial<TimerState> | null> => {
    try {
      const { data, error } = await supabase
        .from('meetings_state')
        .select('*')
        .eq('id', meetingId)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        debugLogger.timer.warn('No active meeting found in database', { data: error });
        return null;
      }

      const restoredState: Partial<TimerState> = {
        activeMeetingId: data.id,
        teamId: data.team_id,
        scriberId: data.scriber_id,
        currentSection: data.current_section || 0,
        sectionStartTime: data.section_start_time ? new Date(data.section_start_time).getTime() : null,
        meetingStartTime: data.started_at ? new Date(data.started_at).getTime() : null,
        completedSectionDurations: data.section_accumulated_times || {},
        isPaused: data.is_paused || false,
        totalPauseDuration: data.total_pause_duration || 0,
        lastPauseTimestamp: data.last_pause_timestamp ? new Date(data.last_pause_timestamp).getTime() : null
      };

      debugLogger.timer.debug('Timer state restored from database', { data: restoredState });
      return restoredState;
    } catch (error) {
      debugLogger.timer.warn('Failed to restore timer state from database', { data: error });
      return null;
    }
  }, []);

  // Auto-save effect with database persistence
  useEffect(() => {
    if (state.activeMeetingId) {
      saveToStorage(state);
      persistToDatabase(state);
    }
  }, [state, saveToStorage, persistToDatabase]);

  return {
    saveToStorage,
    loadFromStorage,
    clearStorage,
    persistToDatabase,
    restoreFromDatabase,
  };
};
