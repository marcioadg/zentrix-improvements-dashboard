
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface ActiveMeetingCheck {
  hasActiveMeeting: boolean;
  activeMeetingId?: string;
  loading: boolean;
  error?: string;
}

export const useActiveMeetingCheck = (teamId?: string, meetingType?: string) => {
  const [result, setResult] = useState<ActiveMeetingCheck>({
    hasActiveMeeting: false,
    loading: false
  });

  useEffect(() => {
    if (!teamId || !meetingType) {
      setResult({ hasActiveMeeting: false, loading: false });
      return;
    }

    const checkActiveMeeting = async () => {
      setResult(prev => ({ ...prev, loading: true }));
      
      try {
        const { data, error } = await supabase
          .from('meetings_state')
          .select('id')
          .eq('team_id', teamId)
          .eq('meeting_type', meetingType)
          .eq('status', 'active')
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          throw error;
        }

        setResult({
          hasActiveMeeting: !!data,
          activeMeetingId: data?.id,
          loading: false
        });
      } catch (error) {
        logger.error('Error checking for active meeting:', error);
        setResult({
          hasActiveMeeting: false,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    checkActiveMeeting();
  }, [teamId, meetingType]);

  return result;
};
