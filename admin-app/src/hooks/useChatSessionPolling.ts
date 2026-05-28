// Surgical 1-minute polling on a chat session — used so the user sees
// scheduled-task results land in the open chat without manually
// refreshing.
//
// ─── Why this exists ──────────────────────────────────────────────────
// Scheduled-task workers append messages to ai_chat_messages at some
// future time. The frontend has the chat open. We need the new
// messages to appear without the user refreshing.
//
// We picked polling (not Supabase Realtime) for:
//   - simpler lifecycle (no subscriptions to manage)
//   - 100% reliable (stateless DB queries)
//   - cheap at scale (one indexed count + one filtered select per
//     minute, AND only when there's actually something pending)
//
// ─── Surgical = zero overhead on normal chats ─────────────────────────
// The hook ONLY runs the polling loop when there's at least one
// pending agent_scheduled_task for the current session. So sessions
// with no scheduled activity pay nothing for the polling layer.
//
// Lifecycle:
//   1. On session change (or refresh): snapshot the highest position
//      currently in ai_chat_messages → that's our cursor.
//   2. Check whether any pending tasks exist for this session.
//        yes → start a 1-minute interval
//        no  → don't poll at all
//   3. Each tick (skipped while tab is hidden):
//        - select rows with position > cursor → if any, advance cursor
//          and notify the caller via onNewMessages
//        - re-check pending count → if it dropped to 0, stop polling
//   4. Tab visibility change: when the tab becomes visible again, do
//      an immediate fetch (catches anything the worker wrote while
//      hidden).
//   5. refresh() — caller pokes this after creating a scheduled task
//      so polling kicks in immediately without waiting for the next
//      session change.

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

const POLL_INTERVAL_MS = 60_000;

export interface PolledMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface UseChatSessionPollingOpts {
  /** Current chat session being viewed; null/undefined disables polling. */
  sessionId: string | undefined;
  /** Called with newly-discovered messages, in position order. */
  onNewMessages: (newMessages: PolledMessage[]) => void;
}

export interface UseChatSessionPollingApi {
  /**
   * Re-check whether polling should be active. Call this after
   * scheduling a new task in the same session — otherwise polling
   * wouldn't start until the next session-change re-mount.
   */
  refresh: () => void;
}

export function useChatSessionPolling(
  opts: UseChatSessionPollingOpts,
): UseChatSessionPollingApi {
  const { sessionId } = opts;

  // Bumping this state re-runs the polling effect, which re-checks
  // pending tasks. This is the cleanest way to let `refresh()` from
  // outside reach inside the effect's closure.
  const [refreshKey, setRefreshKey] = useState(0);

  const onNewMessagesRef = useRef(opts.onNewMessages);
  useEffect(() => {
    onNewMessagesRef.current = opts.onNewMessages;
  }, [opts.onNewMessages]);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    let intervalHandle: number | null = null;
    let isPolling = false;
    let lastKnownPosition = -1;

    async function hasPendingTasks(): Promise<boolean> {
      const { count, error } = await supabase
        .from('agent_scheduled_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('source_session_id', sessionId)
        .eq('status', 'pending');
      if (error) {
        logger.error('useChatSessionPolling: pending check failed', error);
        return false;
      }
      return (count ?? 0) > 0;
    }

    async function fetchNewMessages(): Promise<void> {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('role, content, created_at, position')
        .eq('session_id', sessionId)
        .gt('position', lastKnownPosition)
        .order('position', { ascending: true });
      if (error) {
        logger.error('useChatSessionPolling: fetch failed', error);
        return;
      }
      if (!data || data.length === 0) return;
      lastKnownPosition = data[data.length - 1].position;
      if (cancelled) return;
      onNewMessagesRef.current(
        data.map((m) => ({
          role: m.role as PolledMessage['role'],
          content: m.content,
          timestamp: new Date(m.created_at),
        })),
      );
    }

    function startPolling(): void {
      if (isPolling) return;
      isPolling = true;
      logger.log(`useChatSessionPolling: starting for session ${sessionId}`);
      intervalHandle = window.setInterval(async () => {
        if (document.hidden) return;
        await fetchNewMessages();
        const stillPending = await hasPendingTasks();
        if (!stillPending) {
          logger.log('useChatSessionPolling: no more pending tasks, stopping');
          stopPolling();
        }
      }, POLL_INTERVAL_MS);
    }

    function stopPolling(): void {
      if (intervalHandle !== null) {
        clearInterval(intervalHandle);
        intervalHandle = null;
      }
      isPolling = false;
    }

    function onVisibilityChange(): void {
      if (!document.hidden && isPolling) fetchNewMessages();
    }

    async function initialize(): Promise<void> {
      // Baseline: the highest position currently stored. Anything
      // higher than this in future polls is genuinely new.
      const { data: maxRow } = await supabase
        .from('ai_chat_messages')
        .select('position')
        .eq('session_id', sessionId)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();
      lastKnownPosition = maxRow?.position ?? -1;
      if (cancelled) return;

      if (await hasPendingTasks()) {
        if (cancelled) return;
        startPolling();
      }
    }

    initialize();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
    // refreshKey re-triggers the effect so polling state is re-evaluated
    // after the caller schedules a new task.
  }, [sessionId, refreshKey]);

  const refresh = useCallback<UseChatSessionPollingApi['refresh']>(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return { refresh };
}
