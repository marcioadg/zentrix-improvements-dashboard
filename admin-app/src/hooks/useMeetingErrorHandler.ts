import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MeetingErrorHandler, ErrorHandlingResult, ErrorAction } from '@/services/meetingErrorHandler';
import { logger } from '@/utils/logger';

export const useMeetingErrorHandler = () => {
  const [errorResult, setErrorResult] = useState<ErrorHandlingResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();

  const analyzeError = async (error: any, teamId: string) => {
    setIsAnalyzing(true);
    try {
      const result = await MeetingErrorHandler.analyzeMeetingError(error, teamId);
      setErrorResult(result);
      return result;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executeAction = async (action: ErrorAction, meetingId?: string) => {
    setActionLoading(true);
    try {
      switch (action.action) {
        case 'retry':
          // Close error dialog and let caller handle retry
          setErrorResult(null);
          return { success: true, shouldRetry: true };

        case 'join_observer':
          if (meetingId && errorResult?.error.teamId) {
            const success = await MeetingErrorHandler.joinAsTemporaryObserver(
              errorResult.error.teamId,
              meetingId
            );
            if (success) {
              setErrorResult(null);
              return { success: true, shouldRetry: true };
            }
          }
          return { success: false };

        case 'navigate':
          if (action.data?.path) {
            navigate(action.data.path);
            setErrorResult(null);
          }
          return { success: true };

        case 'contact_admin':
          // Could open a support modal or navigate to contact page
          logger.log('Contact admin requested for team:', errorResult?.error.teamId);
          return { success: true };

        default:
          logger.warn('Unknown action:', action.action);
          return { success: false };
      }
    } finally {
      setActionLoading(false);
    }
  };

  const clearError = () => {
    setErrorResult(null);
  };

  return {
    errorResult,
    isAnalyzing,
    actionLoading,
    analyzeError,
    executeAction,
    clearError,
  };
};