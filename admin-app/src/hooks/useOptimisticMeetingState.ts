
import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

interface OptimisticMeetingState {
  isStarting: boolean;
  startingTeamId: string | null;
  startingMeetingType: string | null;
  error: string | null;
}

export const useOptimisticMeetingState = () => {
  const [state, setState] = useState<OptimisticMeetingState>({
    isStarting: false,
    startingTeamId: null,
    startingMeetingType: null,
    error: null
  });

  const setMeetingStarting = useCallback((teamId: string, meetingType: string) => {
    logger.debug('🚀 Optimistic: Setting meeting as starting', { teamId, meetingType });
    setState({
      isStarting: true,
      startingTeamId: teamId,
      startingMeetingType: meetingType,
      error: null
    });
  }, []);

  const setMeetingStarted = useCallback(() => {
    logger.debug('✅ Optimistic: Meeting started successfully');
    setState({
      isStarting: false,
      startingTeamId: null,
      startingMeetingType: null,
      error: null
    });
  }, []);

  const setMeetingError = useCallback((error: string) => {
    logger.debug('❌ Optimistic: Meeting start failed', error);
    setState({
      isStarting: false,
      startingTeamId: null,
      startingMeetingType: null,
      error
    });
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const isTeamMeetingStarting = useCallback((teamId: string, meetingType: string) => {
    return state.isStarting && 
           state.startingTeamId === teamId && 
           state.startingMeetingType === meetingType;
  }, [state.isStarting, state.startingTeamId, state.startingMeetingType]);

  return {
    ...state,
    setMeetingStarting,
    setMeetingStarted,
    setMeetingError,
    clearError,
    isTeamMeetingStarting
  };
};
