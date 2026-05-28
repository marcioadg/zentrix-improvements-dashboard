import React, { createContext, useContext, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface OptimisticMeetingEndState {
  isEndingMeeting: boolean;
  isLeavingMeeting: boolean;
  processingMeetingId: string | null;
  error: string | null;
}

interface OptimisticMeetingEndContextType extends OptimisticMeetingEndState {
  setMeetingEnding: (meetingId: string) => void;
  setMeetingLeaving: (meetingId: string) => void;
  setMeetingProcessed: () => void;
  setMeetingError: (error: string) => void;
  clearError: () => void;
}

const OptimisticMeetingEndContext = createContext<OptimisticMeetingEndContextType | undefined>(undefined);

export const useOptimisticMeetingEnd = () => {
  const context = useContext(OptimisticMeetingEndContext);
  if (!context) {
    throw new Error('useOptimisticMeetingEnd must be used within OptimisticMeetingEndProvider');
  }
  return context;
};

export const OptimisticMeetingEndProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<OptimisticMeetingEndState>({
    isEndingMeeting: false,
    isLeavingMeeting: false,
    processingMeetingId: null,
    error: null
  });

  const { toast } = useToast();

  const setMeetingEnding = useCallback((meetingId: string) => {
    logger.log('🔄 OptimisticMeetingEnd: Setting meeting as ending', meetingId);
    setState({
      isEndingMeeting: true,
      isLeavingMeeting: false,
      processingMeetingId: meetingId,
      error: null
    });
  }, []);

  const setMeetingLeaving = useCallback((meetingId: string) => {
    logger.log('🔄 OptimisticMeetingEnd: Setting meeting as leaving', meetingId);
    setState({
      isEndingMeeting: false,
      isLeavingMeeting: true,
      processingMeetingId: meetingId,
      error: null
    });
  }, []);

  const setMeetingProcessed = useCallback(() => {
    logger.log('✅ OptimisticMeetingEnd: Meeting processed successfully');
    setState({
      isEndingMeeting: false,
      isLeavingMeeting: false,
      processingMeetingId: null,
      error: null
    });
  }, []);

  const setMeetingError = useCallback((error: string) => {
    logger.error('❌ OptimisticMeetingEnd: Meeting processing failed', error);
    setState(prev => ({
      ...prev,
      isEndingMeeting: false,
      isLeavingMeeting: false,
      error
    }));
    
    toast({
      title: "Meeting Processing Error",
      description: error,
      variant: "destructive",
    });
  }, [toast]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const value = {
    ...state,
    setMeetingEnding,
    setMeetingLeaving,
    setMeetingProcessed,
    setMeetingError,
    clearError
  };

  return (
    <OptimisticMeetingEndContext.Provider value={value}>
      {children}
    </OptimisticMeetingEndContext.Provider>
  );
};