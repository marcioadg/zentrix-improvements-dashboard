import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface ScriberChangePayload {
  sender: string;
  scriberId: string | null;
  updatedAt: string;
}

/**
 * Real-time sync of scriber changes via Supabase broadcast channels.
 * Uses ref pattern for stable channel subscriptions.
 */
export function useScriberBroadcast(
  teamId: string | null,
  onRemoteScriberChange: (scriberId: string | null) => void
) {
  const channelRef = useRef<any>(null);
  const clientIdRef = useRef<string>(
    ((globalThis as any).crypto?.randomUUID?.()) || Math.random().toString(36).slice(2)
  );
  const callbackRef = useRef(onRemoteScriberChange);

  // Keep callback ref updated without causing channel recreation
  useEffect(() => {
    callbackRef.current = onRemoteScriberChange;
  }, [onRemoteScriberChange]);

  useEffect(() => {
    if (!teamId) return;
    
    const channel = supabase.channel(`meeting:${teamId}:scriber`);

    channel
      .on('broadcast', { event: 'scriber_changed' }, (payload: any) => {
        const { sender, scriberId } = payload?.payload as ScriberChangePayload || {};
        
        // Ignore our own broadcasts
        if (sender === clientIdRef.current) return;
        
        if (scriberId !== undefined) {
          callbackRef.current(scriberId);
        }
      })
      .subscribe();

    channelRef.current = channel;
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      channelRef.current = null;
    };
  }, [teamId]);

  const publishScriberChange = useCallback((scriberId: string | null) => {
    if (!channelRef.current) return;
    
    try {
      channelRef.current.send({
        type: 'broadcast',
        event: 'scriber_changed',
        payload: { 
          sender: clientIdRef.current, 
          scriberId,
          updatedAt: new Date().toISOString()
        } as ScriberChangePayload
      });
    } catch (error) {
      logger.warn('Failed to broadcast scriber change:', error);
    }
  }, []);

  return { publishScriberChange };
}
