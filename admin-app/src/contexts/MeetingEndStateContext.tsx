import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@/utils/logger';

interface MeetingEndState {
  isMeetingEnding: boolean;
  isLeavingMeeting: boolean;
  meetingId: string | null;
  protectionEndTime: number | null;
  activeOperations: Set<string>;
}

interface MeetingEndStateContextType extends MeetingEndState {
  startMeetingEnd: (meetingId: string, isLeaving?: boolean) => void;
  endMeetingEnd: () => void;
  isInProtectionPeriod: () => boolean;
  registerOperation: (operationId: string, operationType?: string) => void;
  unregisterOperation: (operationId: string) => void;
  hasActiveOperations: () => boolean;
}

const MeetingEndStateContext = createContext<MeetingEndStateContextType | undefined>(undefined);

export const useMeetingEndState = () => {
  const context = useContext(MeetingEndStateContext);
  if (!context) {
    throw new Error('useMeetingEndState must be used within MeetingEndStateProvider');
  }
  return context;
};

export const MeetingEndStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<MeetingEndState>({
    isMeetingEnding: false,
    isLeavingMeeting: false,
    meetingId: null,
    protectionEndTime: null,
    activeOperations: new Set<string>()
  });

  const protectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (protectionTimerRef.current) {
        clearTimeout(protectionTimerRef.current);
      }
    };
  }, []);

  const startMeetingEnd = useCallback((meetingId: string, isLeaving = false) => {
    logger.log('🔒 MeetingEndState: Starting meeting end protection', { meetingId, isLeaving });
    const protectionEndTime = Date.now() + 10000; // 10 second protection period

    // Clear any existing protection timer before starting a new one
    if (protectionTimerRef.current) {
      clearTimeout(protectionTimerRef.current);
    }

    setState(prev => ({
      ...prev,
      isMeetingEnding: !isLeaving,
      isLeavingMeeting: isLeaving,
      meetingId,
      protectionEndTime
    }));

    // Auto-end protection after period expires
    protectionTimerRef.current = setTimeout(() => {
      setState(prev => {
        if (prev.protectionEndTime && Date.now() >= prev.protectionEndTime) {
          logger.log('✅ MeetingEndState: Auto-ending protection period');
          return {
            isMeetingEnding: false,
            isLeavingMeeting: false,
            meetingId: null,
            protectionEndTime: null,
            activeOperations: new Set<string>()
          };
        }
        return prev;
      });
      protectionTimerRef.current = null;
    }, 10000);
  }, []);

  const endMeetingEnd = useCallback(() => {
    logger.log('✅ MeetingEndState: Manually ending meeting end protection');
    setState({
      isMeetingEnding: false,
      isLeavingMeeting: false,
      meetingId: null,
      protectionEndTime: null,
      activeOperations: new Set<string>()
    });
  }, []);

  const isInProtectionPeriod = useCallback(() => {
    return state.protectionEndTime ? Date.now() < state.protectionEndTime : false;
  }, [state.protectionEndTime]);

  const unregisterOperation = useCallback((operationId: string) => {
    logger.log('✅ MeetingEndState: Unregistering operation:', operationId);
    
    // Clear timeout if exists
    const timeoutId = (window as any)[`operation_timeout_${operationId}`];
    if (timeoutId) {
      clearTimeout(timeoutId);
      delete (window as any)[`operation_timeout_${operationId}`];
    }
    
    setState(prev => {
      const newOperations = new Set(prev.activeOperations);
      newOperations.delete(operationId);
      logger.log('🔄 MeetingEndState: Remaining operations:', newOperations.size);
      return {
        ...prev,
        activeOperations: newOperations
      };
    });
  }, []);

  const registerOperation = useCallback((operationId: string, operationType?: string) => {
    logger.log('🔄 MeetingEndState: Registering operation:', operationId, operationType || 'general');
    setState(prev => ({
      ...prev,
      activeOperations: new Set([...prev.activeOperations, operationId])
    }));
    
    // Enhanced operation tracking with timeout safety
    const timeoutId = setTimeout(() => {
      logger.log('⚠️ MeetingEndState: Operation timeout, auto-unregistering:', operationId);
      unregisterOperation(operationId);
    }, 30000); // 30 second safety timeout
    
    // Store timeout ID for cleanup
    (window as any)[`operation_timeout_${operationId}`] = timeoutId;
  }, [unregisterOperation]);

  const hasActiveOperations = useCallback(() => {
    return state.activeOperations.size > 0;
  }, [state.activeOperations]);

  const value = {
    ...state,
    startMeetingEnd,
    endMeetingEnd,
    isInProtectionPeriod,
    registerOperation,
    unregisterOperation,
    hasActiveOperations
  };

  return (
    <MeetingEndStateContext.Provider value={value}>
      {children}
    </MeetingEndStateContext.Provider>
  );
};