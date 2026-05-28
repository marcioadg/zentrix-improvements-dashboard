import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface ScribeActivityState {
  isActive: boolean;
  lastActivity: Date | null;
  isTimeout: boolean;
}

export const useScribeActivity = (meetingId: string | null, scriberId: string | null) => {
  const [activityState, setActivityState] = useState<ScribeActivityState>({
    isActive: true,
    lastActivity: null,
    isTimeout: false
  });

  useEffect(() => {
    if (!meetingId || !scriberId) {
      setActivityState({ isActive: true, lastActivity: null, isTimeout: false });
      return;
    }

    const checkActivity = async () => {
      try {
        const { data, error } = await supabase
          .from('meetings_state')
          .select('scriber_last_activity, scriber_heartbeat_timeout')
          .eq('id', meetingId)
          .single();

        if (error) {
          logger.error('Error checking scriber activity:', error);
          return;
        }

        const lastActivity = data.scriber_last_activity ? new Date(data.scriber_last_activity) : null;
        const timeoutMinutes = data.scriber_heartbeat_timeout || 2;
        const isTimeout = lastActivity ? 
          (Date.now() - lastActivity.getTime()) > (timeoutMinutes * 60 * 1000) : false;

        setActivityState({
          isActive: !isTimeout,
          lastActivity,
          isTimeout
        });
      } catch (error) {
        logger.error('Error monitoring scriber activity:', error);
      }
    };

    checkActivity();
    const interval = setInterval(checkActivity, 30000);

    return () => clearInterval(interval);
  }, [meetingId, scriberId]);

  return activityState;
};