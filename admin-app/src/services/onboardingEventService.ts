import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

/**
 * Internal product-funnel telemetry for /ad2 (and any future onboarding flow).
 *
 * Writes to the `onboarding_events` table in Supabase. Inserts are
 * fire-and-forget — we never let a tracking failure break the user's flow.
 * Reads from this table happen on /admin (super-admin only).
 *
 * The marketing pixels (Facebook, LinkedIn) and Statsig analytics keep
 * firing alongside this — they serve different purposes (ad attribution +
 * cross-product analytics).
 */

const SESSION_STORAGE_KEY = 'onboarding_session_id';

/** Stable per-tab session id used to group events from the same visit. */
const getOrCreateSessionId = (): string => {
  try {
    const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const fresh = `obs_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_STORAGE_KEY, fresh);
    return fresh;
  } catch {
    // sessionStorage may be unavailable (private mode); fall back to per-call id.
    return `obs_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
};

/** Wipes the session id — call this after a successful signup so the next
 * visit (if any) gets a fresh id. */
export const resetOnboardingSession = (): void => {
  try { sessionStorage.removeItem(SESSION_STORAGE_KEY); } catch { /* ignore */ }
};

export type OnboardingSource = 'ad2' | 'ad' | 'signup' | (string & {});

export type OnboardingEventType =
  | 'page_viewed'
  | 'signup_started'
  | 'signup_completed'
  | 'signup_failed'
  | 'step_viewed'
  | 'step_completed'
  | 'step_skipped'
  | 'workspace_creation_started'
  | 'workspace_created'
  | 'workspace_creation_failed'
  | 'tour_started'
  | 'tour_step_viewed'
  | 'tour_completed'
  | 'tour_skipped'
  | 'first_meeting_modal_opened'
  | 'first_meeting_choice'
  | 'invites_sent';

export type OnboardingStep =
  | 'signup'
  | 'foundation'
  | 'metrics'
  | 'goals'
  | 'review'
  | 'profiling';

export interface TrackOnboardingEventInput {
  source: OnboardingSource;
  eventType: OnboardingEventType;
  step?: OnboardingStep;
  userId?: string | null;
  email?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Inserts a single event row. Errors are swallowed and logged — the user's
 * onboarding flow MUST keep working even if telemetry is down.
 */
export const trackOnboardingEvent = async (input: TrackOnboardingEventInput): Promise<void> => {
  const sessionId = getOrCreateSessionId();
  const row = {
    user_id: input.userId ?? null,
    email: input.email ?? null,
    source: input.source,
    event_type: input.eventType,
    step: input.step ?? null,
    metadata: input.metadata ?? {},
    session_id: sessionId,
  };

  try {
    const { error } = await supabase.from('onboarding_events').insert(row);
    if (error) {
      logger.warn('trackOnboardingEvent insert failed', { error, row });
    }
  } catch (err) {
    logger.warn('trackOnboardingEvent threw', err);
  }
};

/**
 * Fire-and-forget variant that survives an imminent `window.location` change.
 *
 * Uses `fetch(..., { keepalive: true })` against the Supabase REST endpoint.
 * The browser commits to completing the request even after the current
 * document is torn down, so events fired immediately before a navigation
 * (e.g. `signup_completed` right before redirecting from /ad2 to
 * /onboardingmobile, or `workspace_created` / `mobile_onboarding_completed`
 * right before /m/tasks) reach Postgres reliably instead of being aborted
 * mid-flight.
 *
 * Reads the access token synchronously from Supabase's localStorage entry
 * so we don't depend on an async getSession() call landing first.
 */
export const trackOnboardingEventBeacon = (input: TrackOnboardingEventInput): void => {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
  try {
    const sessionId = getOrCreateSessionId();
    const row = {
      user_id: input.userId ?? null,
      email: input.email ?? null,
      source: input.source,
      event_type: input.eventType,
      step: input.step ?? null,
      metadata: input.metadata ?? {},
      session_id: sessionId,
    };

    // Pull the user's access token straight from the Supabase v2 storage
    // entry so the insert respects RLS. Falls back to the anon key for
    // unauthenticated visitors (the table accepts anon inserts).
    let authToken = SUPABASE_PUBLISHABLE_KEY;
    try {
      const projectRef = SUPABASE_URL.replace(/^https?:\/\//, '').split('.')[0];
      const sessionRaw = localStorage.getItem(`sb-${projectRef}-auth-token`);
      if (sessionRaw) {
        const parsed = JSON.parse(sessionRaw);
        const token = parsed?.access_token || parsed?.currentSession?.access_token;
        if (typeof token === 'string' && token) authToken = token;
      }
    } catch { /* fall back to anon key */ }

    fetch(`${SUPABASE_URL}/rest/v1/onboarding_events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${authToken}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
      keepalive: true,
    }).catch(() => { /* swallowed — telemetry never breaks UX */ });
  } catch (err) {
    logger.warn('trackOnboardingEventBeacon threw', err);
  }
};
