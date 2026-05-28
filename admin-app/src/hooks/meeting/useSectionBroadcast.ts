import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { logRefreshTrigger } from '@/utils/refreshTelemetry';

interface SectionChangePayload {
  sender: string;
  meetingId?: string;
  sectionIndex: number;
  sectionStartTime: number;
  timestamp: string;
}

/**
 * Real-time sync of section changes via Supabase broadcast channels.
 * Uses ref pattern for stable channel subscriptions.
 *
 * IMPORTANT: This is an OPTIMIZATION for instant updates (50-100ms).
 * The PRIMARY and 100% reliable mechanism is postgres_changes in NewMeetingTimerContext,
 * which detects changes to meetings_state.current_section directly from the database.
 *
 * If broadcast fails, postgres_changes will still sync the section change reliably.
 *
 * Optimizations:
 * - Attempts publish even if channel not fully subscribed (with retry)
 * - Retry logic with exponential backoff for reliability
 * - Non-blocking: won't prevent section changes if broadcast fails
 */
export function useSectionBroadcast(
  teamId: string | null,
  onRemoteSectionChange: (sectionIndex: number, sectionStartTime: number) => void,
  meetingId?: string | null
) {
  const channelRefs = useRef<any[]>([]);
  const clientIdRef = useRef<string>(
    ((globalThis as any).crypto?.randomUUID?.()) || Math.random().toString(36).slice(2)
  );
  const callbackRef = useRef(onRemoteSectionChange);
  const isSubscribedRef = useRef(false);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRemoteChangeRef = useRef<string | null>(null);

  // Keep callback ref updated without causing channel recreation
  useEffect(() => {
    callbackRef.current = onRemoteSectionChange;
  }, [onRemoteSectionChange]);

  useEffect(() => {
    if (!teamId) return;

    isMountedRef.current = true;
    retryCountRef.current = 0;
    isSubscribedRef.current = false;

    const setupChannel = () => {
      channelRefs.current.forEach(channel => supabase.removeChannel(channel));
      channelRefs.current = [];

      const channelNames = meetingId
        ? [`meeting:${meetingId}:section-change`, `meeting:${teamId}:section-change`]
        : [`meeting:${teamId}:section-change`];

      channelNames.forEach((channelName) => {
        const channel = supabase.channel(channelName);

        channel
          .on('broadcast', { event: 'section_changed' }, (payload: any) => {
            const { sender, meetingId: payloadMeetingId, sectionIndex, sectionStartTime } = payload?.payload as SectionChangePayload || {};

            // Ignore our own broadcasts
            if (sender === clientIdRef.current) return;

            // Prefer meeting-scoped events, but still accept old team-scoped
            // payloads without meetingId for backwards compatibility.
            if (meetingId && payloadMeetingId && payloadMeetingId !== meetingId) return;

            if (typeof sectionIndex === 'number' && typeof sectionStartTime === 'number') {
              const changeKey = `${sender}:${payloadMeetingId || 'team'}:${sectionIndex}:${sectionStartTime}`;
              if (lastRemoteChangeRef.current === changeKey) return;
              lastRemoteChangeRef.current = changeKey;

              logger.log('📡 [SECTION BROADCAST] Received remote section change:', { channelName, sectionIndex, sectionStartTime, sender });

              // 🔍 TELEMETRY: Log section change broadcasts (suspected refresh trigger in meetings)
              logRefreshTrigger('meeting-section-broadcast', {
                teamId,
                meetingId: payloadMeetingId || meetingId || undefined,
                sectionIndex,
                sender: sender.substring(0, 8), // Anonymize
                isOwnBroadcast: false,
              });

              callbackRef.current(sectionIndex, sectionStartTime);
            }
          })
          .subscribe((status) => {
            logger.log('📡 [SECTION BROADCAST] Channel status:', { status, channelName });

            if (status === 'SUBSCRIBED') {
              isSubscribedRef.current = true;
              retryCountRef.current = 0; // Reset retry on success
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              isSubscribedRef.current = channelRefs.current.some(ch => ch.state === 'joined');
              logger.warn('📡 [SECTION BROADCAST] Channel error, will retry');
              // Retry subscription with exponential backoff
              if (retryCountRef.current < 3 && isMountedRef.current) {
                retryCountRef.current++;
                const delay = Math.pow(2, retryCountRef.current) * 1000; // 2s, 4s, 8s
                // Clear any existing retry timeout
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

        channelRefs.current.push(channel);
      });
    };

    setupChannel();

    return () => {
      isMountedRef.current = false;
      isSubscribedRef.current = false;

      // Cleanup retry timeout to prevent memory leaks
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      if (channelRefs.current.length > 0) {
        logger.log('📡 [SECTION BROADCAST] Cleaning up channels for team:', teamId);
        channelRefs.current.forEach(channel => supabase.removeChannel(channel));
      }
      channelRefs.current = [];
    };
  }, [teamId, meetingId]); // callback is in ref

  const publishSectionChange = useCallback((sectionIndex: number, sectionStartTime: number) => {
    if (channelRefs.current.length === 0) {
      logger.log('📡 [SECTION BROADCAST] No channel available, skipping publish');
      return;
    }

    // Try to publish even if not subscribed yet (channel might be ready)
    // If it fails, postgres_changes will handle it as fallback
    const attemptPublish = () => {
      let attempted = false;

      channelRefs.current.forEach((channel) => {
        try {
          attempted = true;
          Promise.resolve(channel.send({
            type: 'broadcast',
            event: 'section_changed',
            payload: {
              sender: clientIdRef.current,
              meetingId: meetingId || undefined,
              sectionIndex,
              sectionStartTime,
              timestamp: new Date().toISOString()
            } as SectionChangePayload
          })).then((status) => {
            if (status === 'ok') {
              logger.log('📤 [SECTION BROADCAST] Successfully published (instant sync)');
            } else {
              logger.warn('📡 [SECTION BROADCAST] Send failed, postgres_changes will handle sync:', status);
            }
          }).catch((error) => {
            logger.warn('📡 [SECTION BROADCAST] Error publishing, postgres_changes will handle sync:', error);
          });
        } catch (error) {
          logger.warn('📡 [SECTION BROADCAST] Error publishing, postgres_changes will handle sync:', error);
        }
      });

      return attempted;
    };

    // If subscribed, publish immediately
    if (isSubscribedRef.current) {
      logger.log('📤 [SECTION BROADCAST] Publishing section change:', { sectionIndex, sectionStartTime });
      attemptPublish();
      return;
    }

    // If not subscribed yet, try anyway (might work) and retry after 2s if it fails
    logger.log('📤 [SECTION BROADCAST] Attempting publish (channel may not be fully subscribed yet):', { sectionIndex, sectionStartTime });
    const success = attemptPublish();

    if (!success) {
      // Retry after 2s if channel becomes subscribed
      setTimeout(() => {
        if (isSubscribedRef.current && channelRefs.current.length > 0) {
          logger.log('📤 [SECTION BROADCAST] Retrying publish after channel subscription');
          attemptPublish();
        }
      }, 2000);
    }
  }, [meetingId]);

  return { publishSectionChange };
}
