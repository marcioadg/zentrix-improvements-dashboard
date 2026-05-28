
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';
import { useOptimisticMeetingEnd } from '@/contexts/OptimisticMeetingEndContext';
import { useNavigationTransition } from '@/contexts/NavigationTransitionContext';
import { useMeetingEndState } from '@/contexts/MeetingEndStateContext';
import { useToast } from '@/hooks/use-toast';
import { createSafeNavigate } from '@/utils/navigationUtils';
import { logger } from '@/utils/logger';

interface EndMeetingButtonProps {
  teamId: string;
}

export const EndMeetingButton: React.FC<EndMeetingButtonProps> = ({ teamId }) => {
  const navigate = useNavigate();
  const { leaveMeeting } = useNewMeetingTimer();
  const { setMeetingLeaving, setMeetingProcessed, setMeetingError } = useOptimisticMeetingEnd();
  const { startTransition, endTransition } = useNavigationTransition();
  const { startMeetingEnd, endMeetingEnd, registerOperation, unregisterOperation } = useMeetingEndState();
  const { toast } = useToast();
  const safeNavigate = createSafeNavigate(navigate);
  
  const [isLeaving, setIsLeaving] = useState(false);

  const handleLeaveMeeting = async () => {
    if (isLeaving) return; // Prevent double-clicks
    
    logger.log('🔄 EndMeetingButton: Starting comprehensive leave meeting protection for team:', teamId);
    
    // Start comprehensive protection system for leaving
    setMeetingLeaving(teamId);
    startMeetingEnd(teamId, true);
    startTransition(window.location.pathname, '/tasks');
    logger.log('EndMeetingButton: Navigating optimistically to tasks');
    safeNavigate('/tasks', { replace: true });
    
    try {
      logger.log('EndMeetingButton: Processing leave meeting in background');
      
      // Register background operation
      const operationId = `leave-meeting-${teamId}`;
      registerOperation(operationId);

      try {
        // Use the leaveMeeting function which removes user from meeting without ending it
        await leaveMeeting();
        
        logger.log('✅ EndMeetingButton: Leave meeting completed successfully');
        setMeetingProcessed();
        toast({ title: 'Left meeting successfully' });
        
      } finally {
        // Always unregister operation
        unregisterOperation(operationId);
      }
      
      // End all protection systems
      endMeetingEnd();
      endTransition();
      
    } catch (error) {
      logger.error('❌ EndMeetingButton: Leave meeting failed:', error);
      setMeetingError(error instanceof Error ? error.message : 'Failed to leave meeting');
      
      // End all protection systems even on error
      endMeetingEnd();
      endTransition();
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <Button 
      onClick={handleLeaveMeeting}
      disabled={isLeaving}
      variant="ghost"
      size="sm"
      className="h-10 px-3 hover:bg-muted/50 border border-border/50 hover:border-border text-destructive hover:text-destructive/80 disabled:opacity-50"
    >
      {isLeaving ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="hidden sm:inline">Leaving...</span>
        </>
      ) : (
        <>
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Leave</span>
        </>
      )}
    </Button>
  );
};
