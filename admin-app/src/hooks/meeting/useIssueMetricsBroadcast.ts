import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface IssueMetricsPayload {
  sender: string;
  meetingId: string;
  issuesSolved: number;
  tasksCreated: number;
  updatedAt: string;
}

/**
 * Real-time sync of issue metrics (Issues Solved, Tasks Created) via Supabase broadcast channels.
 * Follows the proven "User → DB → Realtime → Users" pattern used for votes.
 */
export function useIssueMetricsBroadcast(
  teamId: string | null,
  meetingId: string | null,
  onMetricsUpdate: (metrics: { issuesSolved: number; tasksCreated: number }) => void
) {
  const channelRef = useRef<any>(null);
  const clientIdRef = useRef<string>(
    ((globalThis as any).crypto?.randomUUID?.()) || Math.random().toString(36).slice(2)
  );
  const callbackRef = useRef(onMetricsUpdate);
  const isMountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_RETRIES = 5;
  const BASE_DELAY_MS = 1000;

  // Keep callback ref updated without causing channel recreation
  useEffect(() => {
    callbackRef.current = onMetricsUpdate;
  }, [onMetricsUpdate]);

  const setupChannel = useCallback(() => {
    if (!teamId || !meetingId || !isMountedRef.current) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    const channel = supabase.channel(`meeting:${teamId}:issue-metrics`);

    channel
      .on('broadcast', { event: 'metrics_update' }, (payload: any) => {
        const { sender, meetingId: payloadMeetingId, issuesSolved, tasksCreated } = payload?.payload as IssueMetricsPayload || {};
        
        // Ignore our own broadcasts
        if (sender === clientIdRef.current) return;
        
        // Only process updates for our meeting
        if (payloadMeetingId !== meetingId) return;
        
        if (typeof issuesSolved === 'number' && typeof tasksCreated === 'number') {
          logger.log('📡 [METRICS BROADCAST] Received remote metrics update:', { issuesSolved, tasksCreated });
          callbackRef.current({ issuesSolved, tasksCreated });
        }
      })
      .subscribe((status) => {
        logger.log('📡 [METRICS BROADCAST] Channel status:', status);
        
        if (status === 'SUBSCRIBED') {
          retryCountRef.current = 0; // Reset retry count on successful subscription
        } else if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && isMountedRef.current) {
          // Retry with exponential backoff
          if (retryCountRef.current < MAX_RETRIES) {
            const delay = BASE_DELAY_MS * Math.pow(2, retryCountRef.current);
            logger.log(`📡 [METRICS BROADCAST] Retrying in ${delay}ms (attempt ${retryCountRef.current + 1})`);
            
            retryTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                retryCountRef.current++;
                setupChannel();
              }
            }, delay);
          } else {
            logger.error('📡 [METRICS BROADCAST] Max retries reached, giving up');
          }
        }
      });

    channelRef.current = channel;
  }, [teamId, meetingId]);

  useEffect(() => {
    isMountedRef.current = true;
    retryCountRef.current = 0;
    
    setupChannel();
    
    return () => {
      isMountedRef.current = false;
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      if (channelRef.current) {
        logger.log('📡 [METRICS BROADCAST] Cleaning up channel for team:', teamId);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [setupChannel]);

  const publishMetricsUpdate = useCallback((issuesSolved: number, tasksCreated: number) => {
    if (!channelRef.current || !meetingId) {
      logger.log('📡 [METRICS BROADCAST] No channel available, skipping publish');
      return;
    }
    
    logger.log('📤 [METRICS BROADCAST] Publishing metrics:', { issuesSolved, tasksCreated });
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'metrics_update',
      payload: { 
        sender: clientIdRef.current, 
        meetingId,
        issuesSolved,
        tasksCreated,
        updatedAt: new Date().toISOString()
      } as IssueMetricsPayload
    });
  }, [meetingId]);

  return { publishMetricsUpdate };
}
