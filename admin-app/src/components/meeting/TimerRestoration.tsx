import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';
import { useTimerPersistence } from '@/hooks/useTimerPersistence';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';
import { MeetingSkeleton } from './MeetingSkeleton';
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

export const TimerRestoration: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { 
    isRunning, 
    meetingId, 
    joinExistingMeeting, 
    currentRole,
    recentlyEndedMeeting 
  } = useNewMeetingTimer();
  
  const [restorationState, setRestorationState] = useState<{
    checking: boolean;
    restoring: boolean;
    error: string | null;
  }>({
    checking: true,
    restoring: false,
    error: null
  });

  const [timerState, setTimerState] = useState<TimerState>({
    meetingStartTime: null,
    sectionStartTime: null,
    currentSection: 0,
    completedSectionDurations: {},
    isPaused: false,
    totalPauseDuration: 0,
    lastPauseTimestamp: null,
    activeMeetingId: null,
    teamId: null,
    scriberId: null,
  });

  // Create a proper state updater for useTimerPersistence
  const updateTimerState = (updates: Partial<TimerState>) => {
    setTimerState(prev => ({ ...prev, ...updates }));
  };

  const { loadFromStorage, restoreFromDatabase } = useTimerPersistence(timerState, updateTimerState);

  // Check for active meetings and restore timer state on page load
  useEffect(() => {
    const checkAndRestoreTimer = async () => {
      logger.debug('🔍 TimerRestoration useEffect triggered:', {
        teamId,
        isRunning,
        recentlyEndedMeeting,
        dependencies: { teamId, isRunning, recentlyEndedMeeting }
      });
      
      if (!teamId || isRunning || recentlyEndedMeeting) {
        logger.debug('🔍 TimerRestoration: Skipping restoration', { 
          teamId, 
          isRunning, 
          recentlyEndedMeeting 
        });
        setRestorationState(prev => ({ ...prev, checking: false }));
        return;
      }

      try {
        setRestorationState(prev => ({ ...prev, checking: true, error: null }));
        
        // First check localStorage for quick restoration
        const localState = loadFromStorage();
        logger.debug('🔍 TimerRestoration: Local state found:', localState);

        // Then check database for active meeting
        const { data: activeMeeting, error } = await supabase
          .from('meetings_state')
          .select('*')
          .eq('team_id', teamId)
          .eq('status', 'active')
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        logger.debug('🔍 TimerRestoration: Active meeting from DB:', activeMeeting);

        if (activeMeeting) {
          // Get current user to determine role
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            logger.debug('❌ TimerRestoration: No authenticated user');
            setRestorationState(prev => ({ ...prev, checking: false }));
            return;
          }

          // Determine user's role in the meeting
          const roleAssignments = activeMeeting.role_assignments || {};
          const userRole = roleAssignments[user.id] || 'participant';
          const isScriber = activeMeeting.scriber_id === user.id;
          const effectiveRole = isScriber ? 'scriber' : userRole;

          logger.debug('🔍 TimerRestoration: User role determined:', {
            userId: user.id,
            userRole,
            isScriber,
            effectiveRole,
            scriberId: activeMeeting.scriber_id
          });

          // Restore timer state from database but don't auto-join
          const dbState = await restoreFromDatabase(activeMeeting.id);
          
          if (dbState) {
            logger.debug('✅ TimerRestoration: Timer state restored from database');
            logger.debug('✅ TimerRestoration: Successfully restored meeting state');
          }
        } else {
          logger.debug('ℹ️ TimerRestoration: No active meeting found for team');
          
          // Clear any stale local storage if no active meeting
          if (localState?.activeMeetingId) {
            logger.debug('🧹 TimerRestoration: Clearing stale local storage');
            localStorage.removeItem('meeting-timer-state');
          }
        }

      } catch (error) {
        logger.error('❌ TimerRestoration: Error during restoration:', error);
        setRestorationState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
        
        toast.error('Failed to restore meeting state', {
          description: 'Please try refreshing the page or start a new meeting.'
        });
      } finally {
        setRestorationState(prev => ({ 
          ...prev, 
          checking: false, 
          restoring: false 
        }));
      }
    };

    // Add small delay to ensure context is initialized
    const timeoutId = setTimeout(checkAndRestoreTimer, 500);
    return () => clearTimeout(timeoutId);
  }, [teamId, isRunning, recentlyEndedMeeting, joinExistingMeeting, loadFromStorage, restoreFromDatabase]);

  // Show loading state during restoration
  if (restorationState.checking || restorationState.restoring) {
    return <MeetingSkeleton />;
  }

  // Show error state if restoration failed
  if (restorationState.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md">
          <div className="bg-destructive/10 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-destructive mb-2">
              Timer Restoration Failed
            </h3>
            <p className="text-sm text-destructive/80 mb-4">
              {restorationState.error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-destructive text-destructive-foreground px-4 py-2 rounded-md text-sm hover:bg-destructive/90"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};