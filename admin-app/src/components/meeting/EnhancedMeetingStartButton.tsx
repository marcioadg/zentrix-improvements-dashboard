import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MeetingErrorDialog } from './MeetingErrorDialog';
import { useMeetingErrorHandler } from '@/hooks/useMeetingErrorHandler';
import { Play, Loader2 } from 'lucide-react';
import { logger } from '@/utils/logger';

interface EnhancedMeetingStartButtonProps {
  teamId: string;
  meetingType: string;
  onStartMeeting: () => Promise<void>;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const EnhancedMeetingStartButton: React.FC<EnhancedMeetingStartButtonProps> = ({
  teamId,
  meetingType,
  onStartMeeting,
  disabled = false,
  className = '',
  children,
}) => {
  const [isStarting, setIsStarting] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [meetingId, setMeetingId] = useState<string | null>(null);

  const {
    errorResult,
    isAnalyzing,
    actionLoading,
    analyzeError,
    executeAction,
    clearError,
  } = useMeetingErrorHandler();

  const handleStartClick = async () => {
    setIsStarting(true);
    
    try {
      await onStartMeeting();
      // If we get here, the meeting started successfully
    } catch (error) {
      logger.error('Meeting start failed, analyzing error:', error);
      
      // Analyze the error and show appropriate actions
      const result = await analyzeError(error, teamId);
      if (result) {
        setShowErrorDialog(true);
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handleErrorAction = async (action: any) => {
    const result = await executeAction(action, meetingId);
    
    if (result.success) {
      if (result.shouldRetry) {
        // Close error dialog and retry meeting start
        setShowErrorDialog(false);
        clearError();
        // Small delay to ensure state is clean
        setTimeout(handleStartClick, 100);
      } else {
        // Action completed, close dialog
        setShowErrorDialog(false);
        clearError();
      }
    }
  };

  const handleCloseErrorDialog = () => {
    setShowErrorDialog(false);
    clearError();
  };

  const isLoading = isStarting || isAnalyzing;
  const isActionLoading = actionLoading;

  return (
    <>
      <Button
        onClick={handleStartClick}
        disabled={disabled || isLoading}
        className={className}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        {children || `Start ${meetingType}`}
      </Button>

      <MeetingErrorDialog
        open={showErrorDialog}
        onClose={handleCloseErrorDialog}
        error={errorResult?.error || null}
        actions={errorResult?.actions || []}
        onActionClick={handleErrorAction}
        loading={isActionLoading}
      />
    </>
  );
};