import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface RatingChangePayload {
  sender: string;
  userId: string;
  rating: number;
  updatedAt: string;
}

interface UseRatingBroadcastOptions {
  meetingId: string | null;
  onRatingChanged: (userId: string, rating: number) => void;
}

/**
 * Broadcast hook for real-time rating synchronization in wrap-up section.
 * Uses ref pattern for stable callback and single channel for both subscribe/publish.
 */
export const useRatingBroadcast = ({ meetingId, onRatingChanged }: UseRatingBroadcastOptions) => {
  const channelRef = useRef<any>(null);
  const clientIdRef = useRef<string>(
    ((globalThis as any).crypto?.randomUUID?.()) || Math.random().toString(36).slice(2)
  );
  const callbackRef = useRef(onRatingChanged);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    callbackRef.current = onRatingChanged;
  }, [onRatingChanged]);

  useEffect(() => {
    if (!meetingId) return;

    isMountedRef.current = true;
    retryCountRef.current = 0;

    const setupChannel = () => {
      const channel = supabase.channel(`meeting:${meetingId}:ratings`);

      channel
        .on('broadcast', { event: 'rating_changed' }, (payload: any) => {
          const { sender, userId, rating } = payload?.payload as RatingChangePayload || {};
          
          // Ignore our own broadcasts
          if (sender === clientIdRef.current) return;
          
          // Validate payload
          if (userId && typeof rating === 'number' && rating >= 1 && rating <= 10) {
            callbackRef.current(userId, rating);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            retryCountRef.current = 0;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            // Retry subscription with exponential backoff
            if (retryCountRef.current < 3 && isMountedRef.current) {
              retryCountRef.current++;
              const delay = Math.pow(2, retryCountRef.current) * 1000;
              if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
              }
              retryTimeoutRef.current = setTimeout(() => {
                if (isMountedRef.current) {
                  setupChannel();
                }
                retryTimeoutRef.current = null;
              }, delay);
            }
          }
        });

      channelRef.current = channel;
    };

    setupChannel();

    return () => {
      isMountedRef.current = false;
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      channelRef.current = null;
    };
  }, [meetingId]);

  const publishRatingChange = useCallback((userId: string, rating: number) => {
    if (!channelRef.current) return;

    if (!userId || typeof rating !== 'number' || rating < 1 || rating > 10) {
      logger.error('Invalid rating value:', { userId, rating });
      return;
    }

    try {
      channelRef.current.send({
        type: 'broadcast',
        event: 'rating_changed',
        payload: {
          sender: clientIdRef.current,
          userId,
          rating,
          updatedAt: new Date().toISOString()
        } as RatingChangePayload
      });
    } catch (error) {
      // Broadcast failure is not critical - postgres_changes will handle it
    }
  }, []);

  return { publishRatingChange };
};
