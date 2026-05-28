import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { debounce } from '@/utils/debounce';
import { logger } from '@/utils/logger';
import { getDeviceTypeForTracking, getAccessMode } from '@/utils/mobileDetection';

const getDeviceInfo = () => ({
  device_type: getDeviceTypeForTracking(),
  user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  access_mode: getAccessMode(),
});

const HEARTBEAT_INTERVAL = 2 * 60 * 1000; // 2 minutes
const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const ACTIVITY_DEBOUNCE = 30 * 1000; // 30 seconds

// Module-level ref to store the endSession function for external access
let endSessionHandler: ((reason: 'logout' | 'company_switch') => Promise<void>) | null = null;

// Export function to end current activity session from anywhere
export const endCurrentActivitySession = async (reason: 'logout' | 'company_switch'): Promise<void> => {
  if (endSessionHandler) {
    logger.log(`🎯 [endCurrentActivitySession] Calling session end handler with reason: ${reason}`);
    await endSessionHandler(reason);
  } else {
    logger.warn('⚠️ [endCurrentActivitySession] No active session handler available');
  }
};

// Export standalone function to get or create activity session (simplified)
// This can be called externally, e.g., after company switch
export const startNewActivitySession = async (userId: string, companyId: string): Promise<void> => {
  if (!userId || !companyId) {
    logger.warn('⚠️ [startNewActivitySession] Missing userId or companyId');
    return;
  }

  try {
    logger.log('🎬 [startNewActivitySession] Getting or creating session for user:', userId, 'company:', companyId);

    // Check for existing active session
    const { data: existingSessions, error: queryError } = await supabase
      .from('user_activity_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .eq('status', 'active')
      .limit(1);

    if (queryError) {
      logger.error('Error checking for existing session:', queryError);
    }

    // If active session exists, use it (database will handle stale cleanup)
    if (existingSessions && existingSessions.length > 0) {
      logger.log('✅ [startNewActivitySession] Using existing active session:', existingSessions[0].id);
      return;
    }

    // Create new session only if no active session found
    logger.log('✨ [startNewActivitySession] Creating new activity session');
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('user_activity_sessions')
      .insert({
        user_id: userId,
        company_id: companyId,
        session_start: now,
        last_heartbeat: now,
        status: 'active',
        ...getDeviceInfo(),
      })
      .select('id')
      .single();

    if (error) {
      // 23505 = unique_violation: a concurrent insert won the race. The DB-level
      // partial unique index on (user_id, company_id) WHERE status IN ('active','idle')
      // guarantees only one active session per (user, company). Re-query the winner.
      if ((error as { code?: string }).code === '23505') {
        logger.log('🔁 [startNewActivitySession] Lost insert race, reusing existing active session');
        return;
      }
      logger.error('Failed to start activity session:', error);
      return;
    }

    logger.log('✅ [startNewActivitySession] New session created:', data.id);
  } catch (error) {
    logger.error('[startNewActivitySession] Error:', error);
  }
};

interface UseActivityTrackingReturn {
  isTracking: boolean;
  currentSessionId: string | null;
  sessionDuration: number; // in minutes
  lastActivity: Date | null;
  isIdle: boolean;
}

export const useActivityTracking = (): UseActivityTrackingReturn => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const [isIdle, setIsIdle] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isEndingSession, setIsEndingSession] = useState(false);
  
  const sessionStartTime = useRef<Date | null>(null);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const idleTimer = useRef<NodeJS.Timeout | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null); // Track current sessionId for cleanup
  const currentCompanyIdRef = useRef<string | null>(null); // Track current company for switch detection

  // Get or create session (simplified - database handles stale cleanup)
  const startSession = useCallback(async () => {
    if (!user || !currentCompany) return;

    try {
      // Check for existing active session
      const { data: existingSessions, error: queryError } = await supabase
        .from('user_activity_sessions')
        .select('id, session_start')
        .eq('user_id', user.id)
        .eq('company_id', currentCompany?.id)
        .eq('status', 'active')
        .limit(1);

      if (queryError) {
        logger.error('Error checking for existing session:', queryError);
      }

      const existingSession = existingSessions?.[0];

      // If active session exists, use it (database cleanup will handle stale ones)
      if (existingSession) {
        sessionIdRef.current = existingSession.id;
        setSessionId(existingSession.id);
        sessionStartTime.current = new Date(existingSession.session_start);
        setLastActivity(new Date());
        setIsIdle(false);
        return;
      }

      // Create new session only if no active session found
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('user_activity_sessions')
        .insert({
          user_id: user.id,
          company_id: currentCompany?.id,
          session_start: now,
          last_heartbeat: now,
          status: 'active',
          ...getDeviceInfo(),
        })
        .select('id')
        .single();

      if (error) {
        // 23505 = unique_violation: a concurrent invocation won the insert race.
        // The DB-level partial unique index guarantees only one active session per
        // (user, company). Re-query and adopt the winning row instead of erroring.
        if ((error as { code?: string }).code === '23505') {
          const { data: winner } = await supabase
            .from('user_activity_sessions')
            .select('id, session_start')
            .eq('user_id', user.id)
            .eq('company_id', currentCompany?.id)
            .eq('status', 'active')
            .limit(1)
            .maybeSingle();

          if (winner) {
            sessionIdRef.current = winner.id;
            setSessionId(winner.id);
            sessionStartTime.current = new Date(winner.session_start);
            setLastActivity(new Date());
            setIsIdle(false);
            logger.log('🔁 Adopted existing active session after insert race:', winner.id);
          }
          return;
        }
        logger.error('Failed to start activity session:', error);
        return;
      }

      setSessionId(data.id);
      sessionIdRef.current = data.id;
      sessionStartTime.current = new Date();
      setLastActivity(new Date());
      setIsIdle(false);

      logger.log('✅ New activity tracking session created:', data.id);
    } catch (error) {
      logger.error('Error starting session:', error);
    }
  }, [user, currentCompany]);

  // End the current session with a specific reason (unified method)
  const endSessionSafely = useCallback(async (reason: 'logout' | 'company_switch') => {
    // Prevent concurrent session ending
    if (isEndingSession) {
      logger.log('⚠️ Session already being ended, skipping duplicate call');
      return;
    }

    const currentId = sessionIdRef.current;
    const startTime = sessionStartTime.current;

    if (!currentId || !startTime) {
      logger.log('⚠️ No active session to end');
      return;
    }

    setIsEndingSession(true);

    try {
      const sessionEnd = new Date();
      const durationMinutes = Math.round(
        (sessionEnd.getTime() - startTime.getTime()) / (1000 * 60)
      );

      await supabase
        .from('user_activity_sessions')
        .update({
          session_end: sessionEnd.toISOString(),
          duration_minutes: durationMinutes,
          status: 'ended',
          end_reason: reason
        })
        .eq('id', currentId);

      logger.log(`✅ Session ended safely (${reason}):`, currentId, `(${durationMinutes} minutes)`);
      
      // Clear state
      setSessionId(null);
      sessionIdRef.current = null;
      sessionStartTime.current = null;
      setSessionDuration(0);
    } catch (error) {
      logger.error(`Error ending session (${reason}):`, error);
    } finally {
      setIsEndingSession(false);
    }
  }, [isEndingSession]);

  // Register the endSession handler at module level for external access
  useEffect(() => {
    endSessionHandler = endSessionSafely;
    return () => {
      endSessionHandler = null;
    };
  }, [endSessionSafely]);

  // Legacy endSession for backward compatibility
  const endSession = useCallback(async () => {
    if (!sessionId || !sessionStartTime.current) return;

    try {
      const sessionEnd = new Date();
      const durationMinutes = Math.round(
        (sessionEnd.getTime() - sessionStartTime.current.getTime()) / (1000 * 60)
      );

      await supabase
        .from('user_activity_sessions')
        .update({
          session_end: sessionEnd.toISOString(),
          duration_minutes: durationMinutes,
          status: 'ended'
        })
        .eq('id', sessionId);

      logger.log('✅ Activity tracking session ended:', sessionId, `(${durationMinutes} minutes)`);
      
      setSessionId(null);
      sessionIdRef.current = null;
      setSessionDuration(0);
    } catch (error) {
      logger.error('Error ending session:', error);
    }
  }, [sessionId]);

  // Send heartbeat to update last_heartbeat (with self-healing)
  const sendHeartbeat = useCallback(async () => {
    // Self-healing: If no session exists, try to create/fetch one
    if (!sessionId) {
      logger.log('💓 Heartbeat: No session found, attempting to create/fetch one');
      await startSession();
      return; // startSession will set sessionId, next heartbeat will update it
    }

    try {
      // Only update if session is not already ended (prevents race condition)
      const { data, error } = await supabase
        .from('user_activity_sessions')
        .update({
          last_heartbeat: new Date().toISOString(),
          status: isIdle ? 'idle' : 'active'
        })
        .eq('id', sessionId)
        .neq('status', 'ended')  // Don't update ended sessions
        .select('id, status')
        .maybeSingle();

      if (error) {
        logger.error('Error sending heartbeat:', error);
        return;
      }

      // If no rows updated, session was ended elsewhere (cleanup function, logout, etc.)
      if (!data) {
        // Clear local state to stop further heartbeats
        setSessionId(null);
        sessionIdRef.current = null;
        sessionStartTime.current = null;
        return;
      }
    } catch (error) {
      logger.error('Error sending heartbeat:', error);
    }
  }, [sessionId, isIdle, startSession]);

  // Handle user activity
  const handleActivity = useCallback(() => {
    setLastActivity(new Date());
    
    // Reset idle state if user was idle
    if (isIdle) {
      setIsIdle(false);
      logger.log('🔄 User activity detected - session reactivated');
    }

    // Clear and reset idle timer
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
    }
    
    idleTimer.current = setTimeout(() => {
      setIsIdle(true);
      logger.log('😴 User idle - marking session as idle');
    }, IDLE_TIMEOUT);
  }, [isIdle]);

  // Debounced activity handler
  const debouncedHandleActivity = useRef(
    debounce(handleActivity, ACTIVITY_DEBOUNCE)
  ).current;

  // Effect: Start/end session based on auth state
  useEffect(() => {
    if (user && currentCompany && !sessionId) {
      startSession();
    }

    return () => {
      // Use ref to get LATEST sessionId value (avoids stale closure)
      if (sessionIdRef.current) {
        const currentId = sessionIdRef.current;
        const startTime = sessionStartTime.current;
        
        if (startTime) {
          const sessionEnd = new Date();
          const durationMinutes = Math.round(
            (sessionEnd.getTime() - startTime.getTime()) / (1000 * 60)
          );

          // Call endSession directly in cleanup
          supabase
            .from('user_activity_sessions')
            .update({
              session_end: sessionEnd.toISOString(),
              duration_minutes: durationMinutes,
              status: 'ended'
            })
            .eq('id', currentId)
            .then(
              () => {
                logger.log('✅ Activity session ended on cleanup:', currentId, `(${durationMinutes} minutes)`);
              },
              (error) => {
                logger.error('Error ending session in cleanup:', error);
              }
            );
        }
      }
    };
  }, [user?.id, currentCompany?.id]);

  // Effect: Track current company ID for reference (company switch handled externally)
  useEffect(() => {
    currentCompanyIdRef.current = currentCompany?.id || null;
  }, [currentCompany?.id]);

  // Effect: Handle logout - end session when user signs out
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && sessionIdRef.current) {
        logger.log('🔒 User signed out - ending current session with reason');
        endSessionSafely('logout');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [endSessionSafely]);

  // Effect: Setup heartbeat interval
  useEffect(() => {
    if (sessionId) {
      heartbeatInterval.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    }

    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }
    };
  }, [sessionId, sendHeartbeat]);

  // Effect: Setup activity listeners
  useEffect(() => {
    if (!sessionId) return;

    const events = ['mousemove', 'keydown', 'scroll', 'click'];
    
    events.forEach(event => {
      window.addEventListener(event, debouncedHandleActivity);
    });

    // Initial activity
    handleActivity();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, debouncedHandleActivity);
      });
      
      if (idleTimer.current) {
        clearTimeout(idleTimer.current);
      }
    };
  }, [sessionId, debouncedHandleActivity, handleActivity]);

  // Effect: Update session duration every minute
  useEffect(() => {
    if (sessionId && sessionStartTime.current) {
      durationInterval.current = setInterval(() => {
        const now = new Date();
        const duration = Math.round(
          (now.getTime() - sessionStartTime.current!.getTime()) / (1000 * 60)
        );
        setSessionDuration(duration);
      }, 60 * 1000); // Update every minute
    }

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
    };
  }, [sessionId]);

  return {
    isTracking: !!sessionId,
    currentSessionId: sessionId,
    sessionDuration,
    lastActivity,
    isIdle
  };
};
