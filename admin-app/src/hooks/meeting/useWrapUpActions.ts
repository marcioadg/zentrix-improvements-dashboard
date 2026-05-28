import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useOptimisticMeetingEnd } from '@/contexts/OptimisticMeetingEndContext';
import { useNavigationTransition } from '@/contexts/NavigationTransitionContext';
import { useMeetingEndState } from '@/contexts/MeetingEndStateContext';
import { getAdjustedCompletionStatus } from '@/utils/wrapUpUtils';
import { createSafeNavigate } from '@/utils/navigationUtils';
import { useMeetingEndBroadcast } from '@/hooks/meeting/useMeetingEndBroadcast';
import { useSendRecapEmail } from '@/hooks/meeting/useSendRecapEmail';
import { logger } from '@/lib/logger';

export const useWrapUpActions = (
  members: any[],
  absentMembers: Set<string>,
  ratingsSummary: any[],
  meetingId: string | null,
  teamId: string,
  meetingCompanyId: string | null,
  finalizeMeeting: (meetingId: string, teamId: string) => Promise<{ companyId?: string | null }>,
  endMeeting: () => Promise<void>,
  archiveCompletedTasks: (teamId: string) => Promise<void>,
  cleanupLiveRatings: (meetingId: string) => Promise<void>
) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setMeetingEnding, setMeetingProcessed, setMeetingError } = useOptimisticMeetingEnd();
  const { startTransition, endTransition } = useNavigationTransition();
  const { startMeetingEnd, endMeetingEnd, registerOperation, unregisterOperation } = useMeetingEndState();
  const { broadcastMeetingEndedToCompany } = useMeetingEndBroadcast();
  const { sendRecapEmail, isSending } = useSendRecapEmail();
  const safeNavigate = createSafeNavigate(navigate);

  const adjustedCompletionStatus = getAdjustedCompletionStatus(members, absentMembers, ratingsSummary);
  
  // Idempotency guard to prevent double-execution
  const isEndingRef = useRef(false);
  const [isEnding, setIsEnding] = useState(false);

  // Accept sendRecapEmail parameter - decision is made BEFORE this is called
  const handleEndMeeting = useCallback(async (shouldSendRecapEmail: boolean) => {
    // Guard against double-execution (rapid clicks, race conditions)
    if (isEndingRef.current) {
      logger.debug('useWrapUpActions: Already ending meeting, ignoring duplicate call');
      return;
    }
    isEndingRef.current = true;
    setIsEnding(true);
    
    if (!adjustedCompletionStatus.isComplete) {
      toast({
        title: "Please complete ratings",
        description: "Please ensure all present team members have been rated before ending the meeting.",
        variant: "destructive"
      });
      isEndingRef.current = false;
      setIsEnding(false);
      return;
    }

    if (!meetingId) {
      toast({
        title: "Error",
        description: "No active meeting found.",
        variant: "destructive"
      });
      isEndingRef.current = false;
      setIsEnding(false);
      return;
    }

    logger.debug('useWrapUpActions: Starting comprehensive meeting end protection');
    
    // Start comprehensive protection system
    setMeetingEnding(meetingId);
    startMeetingEnd(meetingId, false);
    startTransition(window.location.pathname, '/tasks');

    try {
      logger.debug('WrapUpActions: Starting meeting end process using finalizeMeeting');

      // Register background operations with enhanced tracking
      const operationId = `meeting-end-${meetingId}`;
      registerOperation(operationId, 'meeting-finalization');

      try {
        // STEP 1: Finalize in database (status → 'ended')
        logger.debug('WrapUpActions: Awaiting finalizeMeeting to complete');
        const { companyId } = await finalizeMeeting(meetingId, teamId);
        logger.debug('WrapUpActions: Meeting finalized in database successfully');

        // STEP 2: Send recap email if user checked the checkbox
        if (shouldSendRecapEmail) {
          logger.debug('WrapUpActions: Sending recap email (user confirmed)');
          await sendRecapEmail({
            meetingId,
            teamId,
            companyId: companyId || meetingCompanyId
          });
        } else {
          logger.debug('WrapUpActions: Skipping recap email (user unchecked)');
        }

        // STEP 3: INSTANT SYNC - Broadcast to correct company channel + update caches
        if (meetingCompanyId) {
          logger.debug('WrapUpActions: Broadcasting meeting_ended to company channel', { 
            teamId, 
            companyId: meetingCompanyId 
          });
          await broadcastMeetingEndedToCompany(teamId, meetingCompanyId);
        } else {
          logger.warn('WrapUpActions: No meetingCompanyId available, skipping targeted broadcast');
        }

        // STEP 4: Clean up local timer state
        await endMeeting();
        logger.debug('WrapUpActions: Local timer cleanup completed');

        // STEP 5: Archive completed tasks and clean up live ratings in background
        Promise.all([
          archiveCompletedTasks(teamId),
          cleanupLiveRatings(meetingId)
        ]).then(() => {
          logger.debug('WrapUpActions: Background cleanup completed');
        }).catch((error) => {
          logger.error('WrapUpActions: Background cleanup failed:', error);
        });

        logger.debug('useWrapUpActions: Meeting end completed successfully');
        setMeetingProcessed();
        
        // STEP 6: Navigate to tasks
        safeNavigate('/tasks', { replace: true });
        
      } finally {
        // Always unregister operation
        unregisterOperation(operationId);
      }
      
      // End all protection systems
      endMeetingEnd();
      endTransition();
      
    } catch (error) {
      logger.error('useWrapUpActions: Meeting end failed:', error);
      setMeetingError(error instanceof Error ? error.message : 'Failed to end meeting');
      
      // Still navigate even on error (don't trap user on meeting page)
      logger.debug('WrapUpActions: Navigating to tasks after error');
      safeNavigate('/tasks', { replace: true });
      
      // End all protection systems even on error
      endMeetingEnd();
      endTransition();
      isEndingRef.current = false;
      setIsEnding(false);
    }
  }, [adjustedCompletionStatus.isComplete, meetingId, teamId, meetingCompanyId, finalizeMeeting, endMeeting, archiveCompletedTasks, cleanupLiveRatings, broadcastMeetingEndedToCompany, sendRecapEmail, safeNavigate, toast, setMeetingEnding, setMeetingProcessed, setMeetingError, startTransition, endTransition, registerOperation, unregisterOperation, startMeetingEnd, endMeetingEnd]);

  return {
    adjustedCompletionStatus,
    handleEndMeeting,
    isEnding: isEnding || isSending
  };
};

