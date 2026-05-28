import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

/**
 * Fetches onboarding_events for a given source (default 'ad2') and time
 * window, then aggregates them into a funnel: distinct sessions that hit
 * each stage. Used by the admin funnel viz.
 *
 * Stages are defined in the order the user moves through them. The count
 * for each stage = distinct session_ids (or user_ids when session_id is
 * missing) that reached that stage.
 */

export interface FunnelStage {
  key: string;
  label: string;
  matcher: (row: OnboardingEventRow) => boolean;
}

export interface OnboardingEventRow {
  id: string;
  user_id: string | null;
  email: string | null;
  source: string;
  event_type: string;
  step: string | null;
  metadata: Record<string, unknown>;
  session_id: string | null;
  occurred_at: string;
}

export interface FunnelStageResult {
  key: string;
  label: string;
  count: number;
  /** % of the FIRST stage (top of funnel) that reached this stage. */
  conversionFromTop: number;
  /** % of the IMMEDIATE PREVIOUS stage that reached this stage. */
  conversionFromPrev: number;
}

export interface ActivationSplit {
  /** Sessions that completed or skipped the post-creation tour. */
  tourDone: number;
  /** Of those, chose to start a meeting. */
  startedMeeting: number;
  /** Of those, sent invitations (and did not start a meeting). */
  sentInvitations: number;
  /** Of those, took no activation action. */
  noAction: number;
}

const AD2_FUNNEL_STAGES: FunnelStage[] = [
  {
    key: 'page_viewed',
    label: '/ad2 page view',
    matcher: r => r.event_type === 'page_viewed',
  },
  {
    key: 'signup_started',
    label: 'Signup attempted',
    matcher: r => r.event_type === 'signup_started',
  },
  {
    key: 'signup_completed',
    label: 'Account created',
    matcher: r => r.event_type === 'signup_completed',
  },
  {
    key: 'foundation_completed',
    label: 'Step 1 (Foundation) done',
    matcher: r => r.event_type === 'step_completed' && r.step === 'foundation',
  },
  {
    key: 'metrics_done',
    label: 'Step 2 (Metrics) done or skipped',
    matcher: r =>
      (r.event_type === 'step_completed' || r.event_type === 'step_skipped') &&
      r.step === 'metrics',
  },
  {
    key: 'goals_completed',
    label: 'Step 3 (Goals) done',
    matcher: r => r.event_type === 'step_completed' && r.step === 'goals',
  },
  {
    key: 'review_viewed',
    label: 'Step 4 (Review) viewed',
    matcher: r => r.event_type === 'step_viewed' && r.step === 'review',
  },
  {
    key: 'workspace_creation_started',
    label: 'Clicked Create workspace',
    matcher: r => r.event_type === 'workspace_creation_started',
  },
  {
    key: 'workspace_created',
    label: 'Workspace created',
    matcher: r => r.event_type === 'workspace_created',
  },
  {
    key: 'tour_done',
    label: 'Tour completed or skipped',
    matcher: r => r.event_type === 'tour_completed' || r.event_type === 'tour_skipped',
  },
];

// /ad has a much shorter flow: signup form → workspace auto-created →
// 3 profiling questions → /dashboard. No wizard, no tour.
const AD_FUNNEL_STAGES: FunnelStage[] = [
  {
    key: 'page_viewed',
    label: '/ad page view',
    matcher: r => r.event_type === 'page_viewed',
  },
  {
    key: 'signup_started',
    label: 'Signup submitted',
    matcher: r => r.event_type === 'signup_started',
  },
  {
    key: 'signup_completed',
    label: 'Account created',
    matcher: r => r.event_type === 'signup_completed',
  },
  {
    key: 'workspace_created',
    label: 'Workspace created',
    matcher: r => r.event_type === 'workspace_created',
  },
  {
    key: 'profile_role',
    label: 'Q1 (Role) answered',
    matcher: r =>
      r.event_type === 'step_completed' &&
      r.step === 'profiling' &&
      (r.metadata as Record<string, unknown>)?.question === 'role',
  },
  {
    key: 'profile_eos',
    label: 'Q2 (EOS usage) answered',
    matcher: r =>
      r.event_type === 'step_completed' &&
      r.step === 'profiling' &&
      (r.metadata as Record<string, unknown>)?.question === 'eos',
  },
  {
    key: 'profile_investment',
    label: 'Q3 (Investment) answered',
    matcher: r =>
      r.event_type === 'step_completed' &&
      r.step === 'profiling' &&
      (r.metadata as Record<string, unknown>)?.question === 'investment',
  },
];

const stagesForSource = (source: string): FunnelStage[] =>
  source === 'ad' ? AD_FUNNEL_STAGES : AD2_FUNNEL_STAGES;

interface UseOnboardingFunnelOptions {
  source?: string;
  /** Number of days back from today to query. Default 30. */
  windowDays?: number;
}

export function useOnboardingFunnel({ source = 'ad2', windowDays = 30 }: UseOnboardingFunnelOptions = {}) {
  const [events, setEvents] = useState<OnboardingEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const since = new Date();
        since.setDate(since.getDate() - windowDays);

        const { data, error: fetchErr } = await supabase
          .from('onboarding_events')
          .select('*')
          .eq('source', source)
          .gte('occurred_at', since.toISOString())
          .order('occurred_at', { ascending: true })
          .limit(50000);

        if (cancelled) return;
        if (fetchErr) throw fetchErr;
        setEvents((data as OnboardingEventRow[]) ?? []);
      } catch (err) {
        if (!cancelled) {
          logger.error('useOnboardingFunnel: fetch failed', err);
          setError(err instanceof Error ? err.message : 'Failed to load funnel data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchEvents();
    return () => { cancelled = true; };
  }, [source, windowDays]);

  const identityFor = (r: OnboardingEventRow) => r.session_id || r.user_id || r.email || r.id;

  const funnel: FunnelStageResult[] = useMemo(() => {
    const stages = stagesForSource(source);
    const stageIdentities = stages.map(stage => {
      const ids = new Set<string>();
      for (const ev of events) {
        if (stage.matcher(ev)) ids.add(identityFor(ev));
      }
      return { stage, ids };
    });

    const top = stageIdentities[0]?.ids.size || 0;

    return stageIdentities.map((entry, i) => {
      const count = entry.ids.size;
      const prev = i === 0 ? count : stageIdentities[i - 1].ids.size;
      return {
        key: entry.stage.key,
        label: entry.stage.label,
        count,
        conversionFromTop: top > 0 ? (count / top) * 100 : 0,
        conversionFromPrev: prev > 0 ? (count / prev) * 100 : 0,
      };
    });
  }, [events, source]);

  const activation: ActivationSplit = useMemo(() => {
    // Per-session: track whether they completed the tour and which action they
    // took. The decision is keyed on first_meeting_choice's metadata.choice
    // value (solo / invite_then_meeting / invite_only / dismissed) — the
    // single event captures all four outcomes cleanly.
    const byId = new Map<string, { tourDone: boolean; meeting: boolean; invites: boolean }>();
    for (const ev of events) {
      const id = identityFor(ev);
      if (!byId.has(id)) byId.set(id, { tourDone: false, meeting: false, invites: false });
      const entry = byId.get(id)!;
      if (ev.event_type === 'tour_completed' || ev.event_type === 'tour_skipped') entry.tourDone = true;
      if (ev.event_type === 'first_meeting_choice') {
        const choice = (ev.metadata as Record<string, unknown>)?.choice;
        if (choice === 'solo' || choice === 'invite_then_meeting') entry.meeting = true;
        else if (choice === 'invite_only') entry.invites = true;
        // 'dismissed' (or missing/unknown choice) → leaves both false
      }
    }

    let tourDone = 0, startedMeeting = 0, sentInvitations = 0, noAction = 0;
    for (const entry of byId.values()) {
      if (!entry.tourDone) continue;
      tourDone++;
      if (entry.meeting) startedMeeting++;
      else if (entry.invites) sentInvitations++;
      else noAction++;
    }
    return { tourDone, startedMeeting, sentInvitations, noAction };
  }, [events]);

  return { funnel, activation, events, loading, error };
}
