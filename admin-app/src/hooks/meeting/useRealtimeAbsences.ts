import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Live-only realtime sync of meeting absences via Supabase broadcast channels
export function useRealtimeAbsences(
  meetingId: string | null,
  onRemoteUpdate: (ids: string[]) => void
) {
  const channelRef = useRef<any>(null);
  const clientIdRef = useRef<string>(((globalThis as any).crypto?.randomUUID?.()) || Math.random().toString(36).slice(2));
  const callbackRef = useRef(onRemoteUpdate);

  // Keep callback ref updated without causing re-subscriptions
  useEffect(() => {
    callbackRef.current = onRemoteUpdate;
  }, [onRemoteUpdate]);

  useEffect(() => {
    if (!meetingId) return;
    const channel = supabase.channel(`meeting:${meetingId}:absences`);

    channel
      .on('broadcast', { event: 'absences_update' }, (payload: any) => {
        const { sender, absent } = payload?.payload || {};
        if (sender === clientIdRef.current) return; // ignore our own broadcasts
        if (Array.isArray(absent)) callbackRef.current(absent);
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [meetingId]); // Only meetingId in deps - callback is in ref

  const publish = useCallback((absentSet: Set<string>) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'absences_update',
      payload: { sender: clientIdRef.current, absent: Array.from(absentSet) }
    });
  }, []);

  return { publish };
}
