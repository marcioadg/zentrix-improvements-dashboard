import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMeetingStore } from '@/stores/meetingStore';
import { logger } from '@/utils/logger';

/**
 * Syncs Supabase meeting data into the unified Zustand meeting store.
 * Fetches initial state and subscribes to realtime broadcast channels.
 */
export function useMeetingStoreSync(
  meetingId: string | null,
  teamId: string | null
) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  const {
    setMeeting,
    setSection,
    updateTimer,
    setParticipants,
    setScriber,
    setStatus,
    setError: setStoreError,
    reset,
  } = useMeetingStore.getState();

  // Hydrate store from Supabase on mount / when meetingId changes
  useEffect(() => {
    if (!teamId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const hydrate = async () => {
      setIsLoading(true);
      setError(null);
      useMeetingStore.getState().setStatus('loading');

      try {
        // If we already have a meetingId, fetch that meeting directly
        if (meetingId) {
          const { data, error: fetchError } = await supabase
            .from('meetings_state')
            .select('*')
            .eq('id', meetingId)
            .maybeSingle();

          if (fetchError) throw fetchError;
          if (cancelled) return;

          if (data && data.status === 'active') {
            setMeeting(data.id, data.team_id || teamId);
            setSection(
              String(data.current_section ?? '0'),
              data.section_start_time ? new Date(data.section_start_time).getTime() : Date.now()
            );
            setScriber(data.scriber_id ?? null);
            updateTimer({
              isPaused: data.is_paused ?? false,
              elapsed: data.meeting_start_time
                ? Date.now() - new Date(data.meeting_start_time).getTime()
                : 0,
              pausedAt: data.is_paused && data.paused_at
                ? new Date(data.paused_at).getTime()
                : null,
            });
          }
        } else {
          // No meetingId yet — look for active meeting for this team
          const { data, error: fetchError } = await supabase
            .from('meetings_state')
            .select('*')
            .eq('team_id', teamId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (fetchError) throw fetchError;
          if (cancelled) return;

          if (data) {
            setMeeting(data.id, data.team_id || teamId);
            setSection(
              String(data.current_section ?? '0'),
              data.section_start_time ? new Date(data.section_start_time).getTime() : Date.now()
            );
            setScriber(data.scriber_id ?? null);
            updateTimer({
              isPaused: data.is_paused ?? false,
              elapsed: data.meeting_start_time
                ? Date.now() - new Date(data.meeting_start_time).getTime()
                : 0,
              pausedAt: data.is_paused && data.paused_at
                ? new Date(data.paused_at).getTime()
                : null,
            });
          } else {
            // No active meeting found
            useMeetingStore.getState().setStatus('idle');
          }
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load meeting';
        logger.error('[useMeetingStoreSync] Hydration error:', err);
        setError(message);
        setStoreError(message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [meetingId, teamId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to realtime broadcast channels
  useEffect(() => {
    if (!teamId) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    // Section change channel
    const sectionChannel = supabase.channel(`meeting:${teamId}:section-change`);
    sectionChannel
      .on('broadcast', { event: 'section_changed' }, (payload) => {
        const { sectionIndex, sectionStartTime } = payload.payload;
        logger.log('[MeetingStoreSync] Remote section change:', sectionIndex);
        useMeetingStore.getState().setSection(
          String(sectionIndex),
          sectionStartTime ?? Date.now()
        );
      })
      .subscribe();
    channels.push(sectionChannel);

    // Scriber change channel
    const scriberChannel = supabase.channel(`meeting:${teamId}:scriber`);
    scriberChannel
      .on('broadcast', { event: 'scriber_changed' }, (payload) => {
        const { scriberId } = payload.payload;
        logger.log('[MeetingStoreSync] Remote scriber change:', scriberId);
        useMeetingStore.getState().setScriber(scriberId);
      })
      .subscribe();
    channels.push(scriberChannel);

    channelsRef.current = channels;

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, [teamId]);

  // Cleanup store on unmount
  useEffect(() => {
    return () => {
      reset();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { isLoading, error };
}
