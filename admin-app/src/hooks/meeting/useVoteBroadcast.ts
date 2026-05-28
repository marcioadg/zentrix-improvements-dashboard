import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface VoteCastPayload {
  sender: string;
  issueId: string;
  voteValue: number;
  newVoteCount: number;
  updatedAt: string;
}

/**
 * Real-time sync of issue vote changes via Supabase broadcast channels.
 * Includes retry/backoff logic for resilience.
 */
export function useVoteBroadcast(
  teamId: string | null,
  onRemoteVote: (issueId: string, newVoteCount: number) => void
) {
  const channelRef = useRef<any>(null);
  const clientIdRef = useRef<string>(
    ((globalThis as any).crypto?.randomUUID?.()) || Math.random().toString(36).slice(2)
  );
  const callbackRef = useRef(onRemoteVote);
  const isMountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_RETRIES = 5;
  const BASE_DELAY_MS = 1000;

  // Keep callback ref updated without causing channel recreation
  useEffect(() => {
    callbackRef.current = onRemoteVote;
  }, [onRemoteVote]);

  const setupChannel = useCallback(() => {
    if (!teamId || !isMountedRef.current) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    const channel = supabase.channel(`meeting:${teamId}:vote-cast`);

    channel
      .on('broadcast', { event: 'vote_cast' }, (payload: any) => {
        const { sender, issueId, newVoteCount } = payload?.payload as VoteCastPayload || {};
        
        // Ignore our own broadcasts
        if (sender === clientIdRef.current) return;
        
        if (issueId && typeof newVoteCount === 'number') {
          logger.log('📡 [VOTE BROADCAST] Received remote vote:', { issueId, newVoteCount });
          callbackRef.current(issueId, newVoteCount);
        }
      })
      .subscribe((status) => {
        logger.log('📡 [VOTE BROADCAST] Channel status:', status);
        
        if (status === 'SUBSCRIBED') {
          retryCountRef.current = 0; // Reset retry count on successful subscription
        } else if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && isMountedRef.current) {
          // Retry with exponential backoff
          if (retryCountRef.current < MAX_RETRIES) {
            const delay = BASE_DELAY_MS * Math.pow(2, retryCountRef.current);
            logger.log(`📡 [VOTE BROADCAST] Retrying in ${delay}ms (attempt ${retryCountRef.current + 1})`);
            
            retryTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                retryCountRef.current++;
                setupChannel();
              }
            }, delay);
          } else {
            logger.error('📡 [VOTE BROADCAST] Max retries reached, giving up');
          }
        }
      });

    channelRef.current = channel;
  }, [teamId]);

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
        logger.log('📡 [VOTE BROADCAST] Cleaning up channel for team:', teamId);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [setupChannel]);

  const publishVote = useCallback((issueId: string, voteValue: number, newVoteCount: number) => {
    if (!channelRef.current) {
      logger.log('📡 [VOTE BROADCAST] No channel available, skipping publish');
      return;
    }
    
    logger.log('📤 [VOTE BROADCAST] Publishing vote:', { issueId, voteValue, newVoteCount });
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'vote_cast',
      payload: { 
        sender: clientIdRef.current, 
        issueId, 
        voteValue,
        newVoteCount,
        updatedAt: new Date().toISOString()
      } as VoteCastPayload
    });
  }, []);

  return { publishVote };
}
