import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Broadcast meeting data structure for instant sync
 */
export interface BroadcastMeetingData {
  id: string;
  team_id: string;
  team_name: string;
  company_name: string;
  meeting_type: string;
  current_section: number;
  started_at: string;
  status: 'active';
  scriber_id: string | null;
}

/**
 * Hook to broadcast and receive meeting state changes across users.
 * Ensures the header "Start Meeting" button updates instantly when
 * another user starts/ends a meeting.
 * 
 * Uses high-performance sync pattern:
 * - Broadcast includes full meeting data
 * - Receiver updates local state instantly (no DB query)
 * - Background refetch for eventual consistency
 */
export const useMeetingStateBroadcast = (
  companyId: string | null,
  teamIds: string[],
  onMeetingStateChange: (meeting?: BroadcastMeetingData, endedTeamId?: string) => void
) => {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const callbackRef = useRef(onMeetingStateChange);
  
  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onMeetingStateChange;
  }, [onMeetingStateChange]);

  // Stable team IDs string for dependency - spread to avoid mutating original array
  const teamIdsKey = [...teamIds].sort().join(',');

  useEffect(() => {
    if (!companyId || teamIds.length === 0) {
      return;
    }

    const channelName = `meeting-state:${companyId}`;
    
    logger.debug('useMeetingStateBroadcast: Setting up channel', { channelName, teamCount: teamIds.length });

    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'meeting_started' }, (payload) => {
        logger.debug('useMeetingStateBroadcast: Received meeting_started', payload);
        // Check if the meeting is for one of our teams
        if (payload.payload?.teamId && teamIds.includes(payload.payload.teamId)) {
          // Pass full meeting data to callback for instant local state update
          const meetingData = payload.payload.meeting as BroadcastMeetingData | undefined;
          callbackRef.current(meetingData);
        }
      })
      .on('broadcast', { event: 'meeting_ended' }, (payload) => {
        logger.debug('useMeetingStateBroadcast: Received meeting_ended', payload);
        if (payload.payload?.teamId && teamIds.includes(payload.payload.teamId)) {
          // Pass teamId for instant cache removal
          callbackRef.current(undefined, payload.payload.teamId);
        }
      })
      .subscribe((status) => {
        logger.debug('useMeetingStateBroadcast: Subscription status', { status, channelName });
      });

    return () => {
      logger.debug('useMeetingStateBroadcast: Cleaning up channel', { channelName });
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [companyId, teamIdsKey]); // Only recreate when company or teams change

  // Function to broadcast meeting started with full meeting data
  const broadcastMeetingStarted = useCallback((
    teamId: string, 
    meetingType: string,
    meetingData?: BroadcastMeetingData
  ) => {
    if (!channelRef.current) {
      logger.warn('useMeetingStateBroadcast: No channel to broadcast meeting_started');
      return;
    }
    
    logger.debug('useMeetingStateBroadcast: Broadcasting meeting_started', { 
      teamId, 
      meetingType,
      hasMeetingData: !!meetingData 
    });
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'meeting_started',
      payload: { 
        teamId, 
        meetingType, 
        timestamp: Date.now(),
        meeting: meetingData // Include full meeting data for instant sync
      }
    }).then((status) => {
      logger.debug('useMeetingStateBroadcast: meeting_started broadcast result', { status, teamId });
    }).catch((err) => {
      logger.warn('useMeetingStateBroadcast: meeting_started broadcast failed', { err, teamId });
    });
  }, []);

  // Function to broadcast meeting ended
  const broadcastMeetingEnded = useCallback((teamId: string) => {
    if (!channelRef.current) {
      logger.warn('useMeetingStateBroadcast: No channel to broadcast meeting_ended');
      return;
    }
    
    logger.debug('useMeetingStateBroadcast: Broadcasting meeting_ended', { teamId });
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'meeting_ended',
      payload: { teamId, timestamp: Date.now() }
    }).then((status) => {
      logger.debug('useMeetingStateBroadcast: meeting_ended broadcast result', { status, teamId });
    }).catch((err) => {
      logger.warn('useMeetingStateBroadcast: meeting_ended broadcast failed', { err, teamId });
    });
  }, []);

  return {
    broadcastMeetingStarted,
    broadcastMeetingEnded
  };
};
