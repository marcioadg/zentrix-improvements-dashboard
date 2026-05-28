import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import type { OnboardingEventRow } from '@/hooks/useOnboardingFunnel';

/**
 * Aggregates raw `onboarding_events` rows into one row per lead (= one row
 * per session_id). Joins post-onboarding signals (last_login_at,
 * meeting_count) so we can see whether converted users actually stuck
 * around or churned.
 *
 * Used by /company-management → Onboarding tab.
 */

/**
 * Unified status taxonomy across both /ad and /ad2. Source-specific detail
 * (which wizard step / which Q / meeting vs invites / MQL vs disqualified)
 * lives in dedicated columns (Steps badges, Activation, Qualification),
 * NOT here. The Status column answers a single question: "where did this
 * lead end up overall?".
 */
export type LeadStatus =
  | 'browsed'        // only fired page_viewed, never engaged further
  | 'signup_failed'  // tried to sign up but never completed
  | 'signed_up'      // account exists, no further progress in the funnel
  | 'in_funnel'      // working through the wizard (/ad2) or profiling (/ad)
  | 'setup_failed'   // workspace_creation_failed
  | 'converted'      // reached the end of onboarding, retention/activation TBD
  | 'activated'      // took a meaningful first action (meeting/invites/MQL); too recent to call retention
  | 'active'         // returned and engaged after creation (hard signal beats activated)
  | 'churned'        // 3+ days since creation, no return
  | 'disqualified';  // /ad terminal: failed qualification

export interface OnboardingLead {
  session_id: string;
  user_id: string | null;
  email: string | null;

  // Lifecycle timestamps
  first_seen_at: string;
  last_event_at: string;
  signup_completed_at: string | null;
  workspace_created_at: string | null;
  /**
   * Source-aware "end of onboarding" timestamp. null until the lead finishes
   * the full flow.
   *   /ad2 → workspace_created_at (the wizard ends with workspace creation;
   *          the post-creation tour is intentionally NOT counted here)
   *   /ad  → time of the Q3 (investment) step_completed event (profiling
   *          done; workspace already exists by this point)
   *
   * Used by the "Avg onboarding time" KPI so /ad's metric measures the full
   * onboarding journey (not just up to the early workspace creation).
   */
  onboarding_completed_at: string | null;

  // Step progression — set if the lead viewed/completed/skipped that step
  reached_foundation: boolean;
  completed_foundation: boolean;
  reached_metrics: boolean;
  completed_metrics: boolean;
  skipped_metrics: boolean;
  reached_goals: boolean;
  completed_goals: boolean;
  reached_review: boolean;
  clicked_create_workspace: boolean;
  workspace_created: boolean;
  workspace_failed: boolean;

  // /ad-only profiling steps (Q1 role / Q2 EOS / Q3 investment).
  // null/false for /ad2 leads.
  reached_q1_role: boolean;
  completed_q1_role: boolean;
  reached_q2_eos: boolean;
  completed_q2_eos: boolean;
  reached_q3_investment: boolean;
  completed_q3_investment: boolean;

  // Time-spent per step (ms). null if step never started or never finished.
  time_in_signup_ms: number | null;
  time_in_foundation_ms: number | null;
  time_in_metrics_ms: number | null;
  time_in_goals_ms: number | null;
  time_in_review_ms: number | null;
  time_in_q1_ms: number | null;
  time_in_q2_ms: number | null;
  time_in_q3_ms: number | null;
  total_time_ms: number;

  // Snapshot of submitted form data — /ad2 wizard fields
  industry: string | null;
  team_size: string | null;
  country: string | null;
  selected_metrics_count: number | null;
  custom_metrics_count: number | null;
  goals_count: number | null;
  ai_suggestion_added: boolean | null;

  // /ad profiling answers + qualification flags. null for /ad2 leads
  // (or for /ad leads who haven't reached the relevant question yet).
  profile_role: string | null;
  profile_eos: string | null;
  profile_investment: string | null;
  is_disqualified: boolean | null;
  is_mql: boolean | null;

  // Workspace details (if converted)
  company_id: string | null;
  team_id: string | null;
  workspace_failure_reason: string | null;

  // Post-workspace onboarding actions
  tour_completed: boolean;
  tour_skipped: boolean;
  activation_action: 'meeting' | 'invites' | null;

  // Post-onboarding retention signals
  last_login_at: string | null;
  meetings_started: number;
  returned_after_creation: boolean | null;
  days_since_creation: number | null;
  /**
   * Total minutes the lead's company has spent on the platform (summed
   * across all users in the company, all-time). Pulled from
   * company_usage_stats. null when the lead has no company yet.
   */
  total_minutes_on_platform: number | null;

  // Subscription tier (enriched from company_subscriptions for converted leads)
  subscription_tier: string | null;
  subscribed: boolean | null;

  // Computed status badge
  status: LeadStatus;
  // Furthest step the lead reached (for funnel slot)
  furthest_step: 'page_view' | 'signup' | 'foundation' | 'metrics' | 'goals' | 'review' | 'workspace';
  raw_event_count: number;
}

interface UseOnboardingLeadsOptions {
  source?: string;
  windowDays?: number;
}

const FURTHEST_STEP_ORDER: OnboardingLead['furthest_step'][] = [
  'page_view', 'signup', 'foundation', 'metrics', 'goals', 'review', 'workspace',
];

const stepRank = (step: OnboardingLead['furthest_step']): number =>
  FURTHEST_STEP_ORDER.indexOf(step);

/** Picks the most-advanced of two steps. */
const maxStep = (
  a: OnboardingLead['furthest_step'],
  b: OnboardingLead['furthest_step'],
): OnboardingLead['furthest_step'] => (stepRank(a) >= stepRank(b) ? a : b);

// Hard signals — used by both flows. Returns null if no terminal call
// can be made yet (lead is still fresh). Order matters: returned/active
// beats churned-by-time, so a returned-after-3-days lead is 'active' not
// 'churned'.
const retentionVerdict = (lead: OnboardingLead): 'active' | 'churned' | null => {
  if (lead.returned_after_creation === true || lead.meetings_started > 0) return 'active';
  if (
    lead.returned_after_creation === false &&
    lead.days_since_creation !== null &&
    lead.days_since_creation >= 3
  ) return 'churned';
  return null;
};

const computeAd2Status = (lead: OnboardingLead): LeadStatus => {
  if (lead.workspace_created) {
    const retention = retentionVerdict(lead);
    if (retention) return retention;
    // No retention call yet — fall back to the soft signals.
    if (lead.activation_action === 'meeting' || lead.activation_action === 'invites') return 'activated';
    return 'converted';
  }
  if (lead.workspace_failed) return 'setup_failed';
  if (lead.reached_review || lead.reached_goals || lead.reached_metrics || lead.reached_foundation) return 'in_funnel';
  if (lead.signup_completed_at) return 'signed_up';
  if (lead.raw_event_count > 1) return 'signup_failed';
  return 'browsed';
};

const computeAdStatus = (lead: OnboardingLead): LeadStatus => {
  // Q3 completed = profiling done. Disqualification is terminal — does
  // not get retention treatment (we don't track retention for users we
  // don't want anyway).
  if (lead.completed_q3_investment) {
    if (lead.is_disqualified) return 'disqualified';
    const retention = retentionVerdict(lead);
    if (retention) return retention;
    if (lead.is_mql) return 'activated';
    return 'converted';
  }
  if (lead.workspace_created) {
    if (lead.reached_q1_role || lead.reached_q2_eos || lead.reached_q3_investment) return 'in_funnel';
    return 'signed_up';
  }
  if (lead.workspace_failed) return 'setup_failed';
  if (lead.signup_completed_at) return 'signed_up';
  if (lead.raw_event_count > 1) return 'signup_failed';
  return 'browsed';
};

const computeStatus = (lead: OnboardingLead, source: string): LeadStatus =>
  source === 'ad' ? computeAdStatus(lead) : computeAd2Status(lead);

const ms = (a: string, b: string) => new Date(a).getTime() - new Date(b).getTime();

const findFirstEventAt = (
  events: OnboardingEventRow[],
  predicate: (e: OnboardingEventRow) => boolean,
): string | null => {
  for (const e of events) if (predicate(e)) return e.occurred_at;
  return null;
};

const aggregateOneLead = (sessionId: string, events: OnboardingEventRow[], source: string): OnboardingLead => {
  // Events arrive sorted ascending by occurred_at (caller's responsibility).
  const first = events[0];
  const last = events[events.length - 1];

  const firstUserId = events.find(e => e.user_id)?.user_id ?? null;
  const firstEmail = events.find(e => e.email)?.email ?? null;

  const signupCompletedAt = findFirstEventAt(events, e => e.event_type === 'signup_completed');
  const workspaceCreatedAt = findFirstEventAt(events, e => e.event_type === 'workspace_created');

  const reachedFoundation = events.some(e => e.event_type === 'step_viewed' && e.step === 'foundation');
  const completedFoundation = events.some(e => e.event_type === 'step_completed' && e.step === 'foundation');
  const reachedMetrics = events.some(e => e.event_type === 'step_viewed' && e.step === 'metrics');
  const completedMetrics = events.some(e => e.event_type === 'step_completed' && e.step === 'metrics');
  const skippedMetrics = events.some(e => e.event_type === 'step_skipped' && e.step === 'metrics');
  const reachedGoals = events.some(e => e.event_type === 'step_viewed' && e.step === 'goals');
  const completedGoals = events.some(e => e.event_type === 'step_completed' && e.step === 'goals');
  const reachedReview = events.some(e => e.event_type === 'step_viewed' && e.step === 'review');
  const clickedCreate = events.some(e => e.event_type === 'workspace_creation_started');
  const workspaceCreated = !!workspaceCreatedAt;
  const workspaceFailed = events.some(e => e.event_type === 'workspace_creation_failed');

  // /ad profiling questions — match by metadata.question on step events.
  const isProfilingQ = (e: OnboardingEventRow, question: string) =>
    e.step === 'profiling' && (e.metadata as Record<string, unknown>)?.question === question;
  const reachedQ1 = events.some(e => e.event_type === 'step_viewed' && isProfilingQ(e, 'role'));
  const completedQ1 = events.some(e => e.event_type === 'step_completed' && isProfilingQ(e, 'role'));
  const reachedQ2 = events.some(e => e.event_type === 'step_viewed' && isProfilingQ(e, 'eos'));
  const completedQ2 = events.some(e => e.event_type === 'step_completed' && isProfilingQ(e, 'eos'));
  const reachedQ3 = events.some(e => e.event_type === 'step_viewed' && isProfilingQ(e, 'investment'));
  const completedQ3 = events.some(e => e.event_type === 'step_completed' && isProfilingQ(e, 'investment'));

  const q1CompletedEv = events.find(e => e.event_type === 'step_completed' && isProfilingQ(e, 'role'));
  const q2CompletedEv = events.find(e => e.event_type === 'step_completed' && isProfilingQ(e, 'eos'));
  const q3CompletedEv = events.find(e => e.event_type === 'step_completed' && isProfilingQ(e, 'investment'));
  const q1Meta = (q1CompletedEv?.metadata ?? {}) as Record<string, unknown>;
  const q2Meta = (q2CompletedEv?.metadata ?? {}) as Record<string, unknown>;
  const q3Meta = (q3CompletedEv?.metadata ?? {}) as Record<string, unknown>;

  const profileRole = (q1Meta.answer as string) ?? null;
  const profileInvestment = (q3Meta.answer as string) ?? null;
  const isDisqualified = q3CompletedEv ? ((q3Meta.is_disqualified as boolean) ?? null) : null;
  const isMql = q3CompletedEv ? ((q3Meta.is_mql as boolean) ?? null) : null;

  // EOS answer can come from either flow:
  //   /ad  → profiling Q2 (step='profiling', metadata.question='eos', metadata.answer=...)
  //   /ad2 → foundation step (step='foundation', metadata.eos_usage=...)
  // Prefer /ad's value when both are present; fall back to /ad2's foundation field.
  const foundationCompletedEv = events.find(
    e => e.event_type === 'step_completed' && e.step === 'foundation',
  );
  const foundationMeta = (foundationCompletedEv?.metadata ?? {}) as Record<string, unknown>;
  const profileEos =
    ((q2Meta.answer as string) ?? null) ||
    ((foundationMeta.eos_usage as string) ?? null) ||
    null;

  const tourCompleted = events.some(e => e.event_type === 'tour_completed');
  const tourSkipped = events.some(e => e.event_type === 'tour_skipped');

  // Read the first_meeting_choice event's metadata.choice to figure out
  // exactly what the user did after the tour.
  const choiceEvent = events.find(e => e.event_type === 'first_meeting_choice');
  const choiceValue = choiceEvent
    ? ((choiceEvent.metadata as Record<string, unknown>)?.choice as string | undefined)
    : undefined;
  let activationAction: OnboardingLead['activation_action'] = null;
  if (choiceValue === 'solo' || choiceValue === 'invite_then_meeting') activationAction = 'meeting';
  else if (choiceValue === 'invite_only') activationAction = 'invites';

  // Per-step durations: from step_viewed to step_completed (or step_skipped)
  const timeBetween = (
    startEv: (e: OnboardingEventRow) => boolean,
    endEv: (e: OnboardingEventRow) => boolean,
  ): number | null => {
    const start = events.find(startEv);
    const end = events.find(endEv);
    if (!start || !end) return null;
    const diff = new Date(end.occurred_at).getTime() - new Date(start.occurred_at).getTime();
    return diff > 0 ? diff : null;
  };

  const timeInSignup = timeBetween(
    e => e.event_type === 'page_viewed',
    e => e.event_type === 'signup_completed',
  );
  const timeInFoundation = timeBetween(
    e => e.event_type === 'step_viewed' && e.step === 'foundation',
    e => e.event_type === 'step_completed' && e.step === 'foundation',
  );
  const timeInMetrics = timeBetween(
    e => e.event_type === 'step_viewed' && e.step === 'metrics',
    e => (e.event_type === 'step_completed' || e.event_type === 'step_skipped') && e.step === 'metrics',
  );
  const timeInGoals = timeBetween(
    e => e.event_type === 'step_viewed' && e.step === 'goals',
    e => e.event_type === 'step_completed' && e.step === 'goals',
  );
  const timeInReview = timeBetween(
    e => e.event_type === 'step_viewed' && e.step === 'review',
    e => e.event_type === 'workspace_created',
  );
  const timeInQ1 = timeBetween(
    e => e.event_type === 'step_viewed' && isProfilingQ(e, 'role'),
    e => e.event_type === 'step_completed' && isProfilingQ(e, 'role'),
  );
  const timeInQ2 = timeBetween(
    e => e.event_type === 'step_viewed' && isProfilingQ(e, 'eos'),
    e => e.event_type === 'step_completed' && isProfilingQ(e, 'eos'),
  );
  const timeInQ3 = timeBetween(
    e => e.event_type === 'step_viewed' && isProfilingQ(e, 'investment'),
    e => e.event_type === 'step_completed' && isProfilingQ(e, 'investment'),
  );

  // Pull form snapshot from the latest step_completed metadata when available
  const metricsCompletedEv = events.find(e => e.event_type === 'step_completed' && e.step === 'metrics');
  const goalsCompletedEv = events.find(e => e.event_type === 'step_completed' && e.step === 'goals');
  const wsEv = events.find(e => e.event_type === 'workspace_created');
  const wsFailEv = events.find(e => e.event_type === 'workspace_creation_failed');

  const meta = (ev: OnboardingEventRow | undefined) => (ev?.metadata ?? {}) as Record<string, unknown>;
  const fMeta = meta(foundationCompletedEv);
  const mMeta = meta(metricsCompletedEv);
  const gMeta = meta(goalsCompletedEv);
  const wMeta = meta(wsEv);
  const wFMeta = meta(wsFailEv);

  // Furthest step
  let furthest: OnboardingLead['furthest_step'] = 'page_view';
  if (signupCompletedAt) furthest = maxStep(furthest, 'signup');
  if (reachedFoundation) furthest = maxStep(furthest, 'foundation');
  if (reachedMetrics) furthest = maxStep(furthest, 'metrics');
  if (reachedGoals) furthest = maxStep(furthest, 'goals');
  if (reachedReview) furthest = maxStep(furthest, 'review');
  if (workspaceCreated) furthest = maxStep(furthest, 'workspace');

  const lead: OnboardingLead = {
    session_id: sessionId,
    user_id: firstUserId,
    email: firstEmail,
    first_seen_at: first.occurred_at,
    last_event_at: last.occurred_at,
    signup_completed_at: signupCompletedAt,
    workspace_created_at: workspaceCreatedAt,
    onboarding_completed_at:
      source === 'ad'
        ? (q3CompletedEv?.occurred_at ?? null)
        : workspaceCreatedAt,
    reached_foundation: reachedFoundation,
    completed_foundation: completedFoundation,
    reached_metrics: reachedMetrics,
    completed_metrics: completedMetrics,
    skipped_metrics: skippedMetrics,
    reached_goals: reachedGoals,
    completed_goals: completedGoals,
    reached_review: reachedReview,
    clicked_create_workspace: clickedCreate,
    workspace_created: workspaceCreated,
    workspace_failed: workspaceFailed,
    reached_q1_role: reachedQ1,
    completed_q1_role: completedQ1,
    reached_q2_eos: reachedQ2,
    completed_q2_eos: completedQ2,
    reached_q3_investment: reachedQ3,
    completed_q3_investment: completedQ3,
    time_in_signup_ms: timeInSignup,
    time_in_foundation_ms: timeInFoundation,
    time_in_metrics_ms: timeInMetrics,
    time_in_goals_ms: timeInGoals,
    time_in_review_ms: timeInReview,
    time_in_q1_ms: timeInQ1,
    time_in_q2_ms: timeInQ2,
    time_in_q3_ms: timeInQ3,
    total_time_ms: ms(last.occurred_at, first.occurred_at),
    industry: (fMeta.industry as string) ?? null,
    team_size: (fMeta.team_size as string) ?? null,
    country: (fMeta.country as string) ?? null,
    selected_metrics_count: (mMeta.selected_metrics_count as number) ?? null,
    custom_metrics_count: (mMeta.custom_metrics_count as number) ?? null,
    goals_count: (gMeta.goals_count as number) ?? null,
    ai_suggestion_added: (gMeta.ai_suggestion_added as boolean) ?? null,
    profile_role: profileRole,
    profile_eos: profileEos,
    profile_investment: profileInvestment,
    is_disqualified: isDisqualified,
    is_mql: isMql,
    company_id: (wMeta.company_id as string) ?? null,
    team_id: (wMeta.team_id as string) ?? null,
    workspace_failure_reason: (wFMeta.error as string) ?? null,
    tour_completed: tourCompleted,
    tour_skipped: tourSkipped,
    activation_action: activationAction,
    last_login_at: null,
    meetings_started: 0,
    returned_after_creation: null,
    days_since_creation: workspaceCreatedAt
      ? Math.floor((Date.now() - new Date(workspaceCreatedAt).getTime()) / (1000 * 60 * 60 * 24))
      : null,
    total_minutes_on_platform: null,
    subscription_tier: null,
    subscribed: null,
    status: 'browsed',
    furthest_step: furthest,
    raw_event_count: events.length,
  };

  lead.status = computeStatus(lead, source);
  return lead;
};

export const useOnboardingLeads = ({
  source = 'ad2',
  windowDays = 30,
}: UseOnboardingLeadsOptions = {}) => {
  const [events, setEvents] = useState<OnboardingEventRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, { last_login_at: string | null }>>({});
  const [meetingCountByCompany, setMeetingCountByCompany] = useState<Record<string, number>>({});
  const [subscriptionByCompany, setSubscriptionByCompany] = useState<Record<string, { tier: string | null; subscribed: boolean }>>({});
  const [usageMinutesByCompany, setUsageMinutesByCompany] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch raw events
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
          logger.error('useOnboardingLeads: events fetch failed', err);
          setError(err instanceof Error ? err.message : 'Failed to load lead data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchEvents();
    return () => { cancelled = true; };
  }, [source, windowDays]);

  // 2. Once we have events, fetch retention signals (last_login_at + meetings)
  useEffect(() => {
    if (events.length === 0) return;
    let cancelled = false;

    const fetchEnrichment = async () => {
      try {
        const userIds = [...new Set(events.map(e => e.user_id).filter(Boolean) as string[])];
        const companyIds = [...new Set(events
          .map(e => (e.metadata as Record<string, unknown>)?.company_id as string | undefined)
          .filter(Boolean) as string[])];

        const [profilesRes, meetingsRes, subsRes, usageRes] = await Promise.all([
          userIds.length > 0
            ? supabase
                .from('profiles')
                .select('id, last_login_at')
                .in('id', userIds)
            : Promise.resolve({ data: [] as Array<{ id: string; last_login_at: string | null }>, error: null }),
          companyIds.length > 0
            ? supabase
                .from('meetings_state')
                .select('company_id')
                .in('company_id', companyIds)
            : Promise.resolve({ data: [] as Array<{ company_id: string }>, error: null }),
          companyIds.length > 0
            ? supabase
                .from('company_subscriptions')
                .select('company_id, subscription_tier, subscribed')
                .in('company_id', companyIds)
            : Promise.resolve({ data: [] as Array<{ company_id: string; subscription_tier: string | null; subscribed: boolean }>, error: null }),
          companyIds.length > 0
            ? supabase
                .from('company_usage_stats')
                .select('company_id, total_minutes')
                .in('company_id', companyIds)
            : Promise.resolve({ data: [] as Array<{ company_id: string; total_minutes: number | null }>, error: null }),
        ]);

        if (cancelled) return;

        const pmap: Record<string, { last_login_at: string | null }> = {};
        ((profilesRes as { data: Array<{ id: string; last_login_at: string | null }> | null }).data ?? []).forEach(p => {
          pmap[p.id] = { last_login_at: p.last_login_at };
        });
        setProfilesById(pmap);

        const mmap: Record<string, number> = {};
        ((meetingsRes as { data: Array<{ company_id: string }> | null }).data ?? []).forEach(row => {
          mmap[row.company_id] = (mmap[row.company_id] ?? 0) + 1;
        });
        setMeetingCountByCompany(mmap);

        const smap: Record<string, { tier: string | null; subscribed: boolean }> = {};
        ((subsRes as { data: Array<{ company_id: string; subscription_tier: string | null; subscribed: boolean }> | null }).data ?? []).forEach(row => {
          smap[row.company_id] = { tier: row.subscription_tier, subscribed: row.subscribed };
        });
        setSubscriptionByCompany(smap);

        // Aggregate company_usage_stats rows (one per company/user/day) into
        // a single total-minutes-per-company number. All users in the company,
        // all-time — the broadest "is this team actually using the platform?"
        // signal we can compute without an extra time filter.
        const umap: Record<string, number> = {};
        ((usageRes as { data: Array<{ company_id: string; total_minutes: number | null }> | null }).data ?? []).forEach(row => {
          umap[row.company_id] = (umap[row.company_id] ?? 0) + (row.total_minutes ?? 0);
        });
        setUsageMinutesByCompany(umap);
      } catch (err) {
        if (!cancelled) logger.warn('useOnboardingLeads: enrichment fetch failed', err);
      }
    };

    fetchEnrichment();
    return () => { cancelled = true; };
  }, [events]);

  // 3. Aggregate events into one lead per session, then enrich
  const leads: OnboardingLead[] = useMemo(() => {
    if (events.length === 0) return [];

    const bySession = new Map<string, OnboardingEventRow[]>();
    for (const ev of events) {
      const key = ev.session_id || ev.user_id || ev.email || ev.id;
      if (!bySession.has(key)) bySession.set(key, []);
      bySession.get(key)!.push(ev);
    }

    const out: OnboardingLead[] = [];
    for (const [sessionId, sessionEvents] of bySession.entries()) {
      // Already sorted ascending — just defensive sort in case
      sessionEvents.sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
      const lead = aggregateOneLead(sessionId, sessionEvents, source);

      // Enrichment
      if (lead.user_id && profilesById[lead.user_id]) {
        lead.last_login_at = profilesById[lead.user_id].last_login_at;
        if (lead.workspace_created_at && lead.last_login_at) {
          lead.returned_after_creation =
            new Date(lead.last_login_at).getTime() > new Date(lead.workspace_created_at).getTime() + 60_000;
        } else if (lead.workspace_created_at) {
          lead.returned_after_creation = false;
        }
      }
      if (lead.company_id) {
        lead.meetings_started = meetingCountByCompany[lead.company_id] ?? 0;
        const sub = subscriptionByCompany[lead.company_id];
        if (sub) {
          lead.subscription_tier = sub.tier;
          lead.subscribed = sub.subscribed;
        }
        if (lead.company_id in usageMinutesByCompany) {
          lead.total_minutes_on_platform = usageMinutesByCompany[lead.company_id];
        }
      }

      // Recompute status with enrichment data folded in
      lead.status = computeStatus(lead, source);
      out.push(lead);
    }

    // Sort newest first by default
    out.sort((a, b) => new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime());
    return out;
  }, [events, profilesById, meetingCountByCompany, subscriptionByCompany, usageMinutesByCompany, source]);

  return { leads, events, loading, error };
};
