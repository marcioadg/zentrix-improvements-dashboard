/**
 * Facebook Tracking - Client-side pixel + Server-side CAPI with deduplication
 * 
 * Uses event_id for deduplication between client pixel and server CAPI.
 * The same event_id is sent to both, so Facebook deduplicates automatically.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

const FB_PIXEL_ID = '957288749969076';

/** Generate a unique event ID for deduplication */
function generateEventId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/** Get fbp (browser ID) cookie */
function getFbp(): string | null {
  const match = document.cookie.match(/_fbp=([^;]+)/);
  return match ? match[1] : null;
}

/** Get fbc (click ID) cookie */
function getFbc(): string | null {
  const match = document.cookie.match(/_fbc=([^;]+)/);
  if (match) return match[1];
  // Fallback: construct from fbclid in URL
  const params = new URLSearchParams(window.location.search);
  const fbclid = params.get('fbclid');
  if (fbclid) {
    return `fb.1.${Date.now()}.${fbclid}`;
  }
  return null;
}

/** Fire client-side pixel event with event_id for dedup */
function firePixelEvent(eventName: string, eventId: string, customData?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', eventName, customData || {}, { eventID: eventId });
  }
}

/** Fire custom pixel event with event_id for dedup */
function firePixelCustomEvent(eventName: string, eventId: string, customData?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('trackCustom', eventName, customData || {}, { eventID: eventId });
  }
}

/** Send server-side CAPI event (non-blocking) */
async function sendCapiEvent(params: {
  event_name: string;
  event_id: string;
  email?: string;
  first_name?: string;
  custom_data?: Record<string, unknown>;
}) {
  try {
    await supabase.functions.invoke('facebook-capi', {
      body: {
        event_name: params.event_name,
        event_id: params.event_id,
        event_source_url: window.location.href,
        email: params.email,
        first_name: params.first_name,
        user_agent: navigator.userAgent,
        fbc: getFbc(),
        fbp: getFbp(),
        custom_data: params.custom_data,
      },
    });
  } catch (error) {
    logger.warn('FB CAPI send failed (non-blocking):', error);
  }
}

// ─── Public API ───────────────────────────────────────────

/**
 * PageView - fires on every page (already handled by pixel in index.html,
 * this adds server-side CAPI for better attribution)
 */
export function trackFBPageView() {
  const eventId = generateEventId();
  // Don't fire client pixel again (index.html already does it)
  // Only send server-side
  sendCapiEvent({ event_name: 'PageView', event_id: eventId });
}

/**
 * ViewContent - when user views the signup/trial form page
 */
export function trackFBViewContent() {
  const eventId = generateEventId();
  firePixelEvent('ViewContent', eventId, {
    content_name: 'Trial Signup Form',
    content_category: 'signup',
  });
  sendCapiEvent({
    event_name: 'ViewContent',
    event_id: eventId,
    custom_data: {
      content_name: 'Trial Signup Form',
      content_category: 'signup',
    },
  });
}

type TrialSource = 'ad' | 'ad2' | 'adv2' | 'adv2b' | string;

const teamSizeExceedsEleven = (teamSize?: string): boolean => {
  if (!teamSize) return false;
  const normalized = teamSize.replace(/[–—]/g, '-').trim();
  if (/^\d+\+$/i.test(normalized)) {
    return Number(normalized.match(/\d+/)?.[0] || 0) > 11;
  }
  const numbers = normalized.match(/\d+/g)?.map(Number) || [];
  if (numbers.length === 0) return false;
  // Exact values must be strictly > 11. Ranges qualify when their upper bound
  // exceeds 11 (for example, "11-25" has users above the threshold).
  return Math.max(...numbers) > 11;
};

export const isFBMQLQualified = (params: { teamSize?: string; eosUsage?: string }): boolean => {
  return teamSizeExceedsEleven(params.teamSize) && params.eosUsage !== 'what_is_eos';
};

/**
 * Lead - when the first-page signup form is submitted.
 */
export function trackFBLead(params: {
  email?: string;
  firstName?: string;
  source?: TrialSource;
  status?: string;
}) {
  const eventId = generateEventId();
  const customData = {
    content_name: 'Trial Signup First Step',
    content_category: 'signup',
    source: params.source || 'unknown',
    status: params.status || 'first_step_submitted',
  };

  firePixelEvent('Lead', eventId, customData);
  sendCapiEvent({
    event_name: 'Lead',
    event_id: eventId,
    email: params.email,
    first_name: params.firstName,
    custom_data: customData,
  });
}

/**
 * CompleteRegistration - when account creation succeeds.
 */
export function trackFBCompleteRegistration(params: {
  email: string;
  firstName: string;
  userRole?: string;
  companySize?: string;
  teamSize?: string;
  eosUsage?: string;
  source?: TrialSource;
}) {
  const eventId = generateEventId();
  const customData = {
    content_name: 'Trial Registration',
    user_role: params.userRole || 'not_specified',
    company_size: params.companySize || params.teamSize || 'not_specified',
    team_size: params.teamSize || params.companySize || 'not_specified',
    eos_usage: params.eosUsage || 'not_specified',
    source: params.source || 'unknown',
  };

  firePixelEvent('CompleteRegistration', eventId, customData);
  sendCapiEvent({
    event_name: 'CompleteRegistration',
    event_id: eventId,
    email: params.email,
    first_name: params.firstName,
    custom_data: customData,
  });

  // Preserve the legacy /ad and /ad2 qualification behavior when only the old
  // role/companySize fields are provided. New adv2 qualification is fired after
  // its profiling questions complete, when team size + EOS are known.
  if (!params.teamSize && !params.eosUsage && params.userRole && params.companySize) {
    classifyLegacyLead(params as { email: string; firstName: string; userRole: string; companySize: string });
  }
}

export function trackFBMQL(params: {
  email?: string;
  firstName?: string;
  source?: TrialSource;
  userRole?: string;
  teamSize: string;
  eosUsage: string;
}) {
  const eventId = generateEventId();
  const customData = {
    lead_type: 'MQL',
    source: params.source || 'unknown',
    user_role: params.userRole || 'not_specified',
    team_size: params.teamSize,
    eos_usage: params.eosUsage,
  };
  firePixelCustomEvent('MQL', eventId, customData);
  sendCapiEvent({
    event_name: 'MQL',
    event_id: eventId,
    email: params.email,
    first_name: params.firstName,
    custom_data: customData,
  });
  logger.log('📘 FB: MQL event sent');
}

export function trackFBSQLOnce(params: {
  userId: string;
  meetingId: string;
  companyId?: string | null;
  teamId?: string;
  meetingType?: string;
}) {
  try {
    const guardKey = `fb_sql_first_meeting_sent:${params.userId}`;
    if (localStorage.getItem(guardKey) === '1') return;
    localStorage.setItem(guardKey, '1');

    const eventId = generateEventId();
    const customData = {
      status: 'first_meeting_created',
      meeting_id: params.meetingId,
      company_id: params.companyId || undefined,
      team_id: params.teamId,
      meeting_type: params.meetingType || 'unknown',
    };
    firePixelCustomEvent('SQL', eventId, customData);
    sendCapiEvent({
      event_name: 'SQL',
      event_id: eventId,
      custom_data: customData,
    });
    logger.log('📘 FB: SQL event sent');
  } catch (error) {
    logger.warn('FB SQL once tracking failed:', error);
  }
}

/**
 * Legacy /ad and /ad2 classifier based on role + company size.
 */
function classifyLegacyLead(params: {
  email: string;
  firstName: string;
  userRole: string;
  companySize: string;
}) {
  const qualifiedRoles = ['director_manager', 'team_lead'];
  const disqualifiedRoles = ['individual_contributor'];
  const smallSizes = ['1-5'];
  const qualifiedSizes = ['6-10', '11-15', '16-20', '21-30', '30-50'];

  const isQualifiedRole = qualifiedRoles.includes(params.userRole);
  const isDisqualifiedRole = disqualifiedRoles.includes(params.userRole);
  const isSmallSize = smallSizes.includes(params.companySize);
  const isQualifiedSize = qualifiedSizes.includes(params.companySize);

  if (isQualifiedRole && isQualifiedSize) {
    trackFBMQL({
      email: params.email,
      firstName: params.firstName,
      userRole: params.userRole,
      teamSize: params.companySize,
      eosUsage: 'not_specified',
      source: 'legacy',
    });
  } else if (isDisqualifiedRole || isSmallSize) {
    // Disqualified Lead
    const eventId = generateEventId();
    const customData = {
      lead_type: 'Disqualified',
      user_role: params.userRole,
      company_size: params.companySize,
      disqualification_reason: isDisqualifiedRole ? 'individual_contributor' : 'small_company',
    };
    firePixelCustomEvent('DisqualifiedLead', eventId, customData);
    sendCapiEvent({
      event_name: 'DisqualifiedLead',
      event_id: eventId,
      email: params.email,
      first_name: params.firstName,
      custom_data: customData,
    });
    logger.log('📘 FB: DisqualifiedLead event sent');
  }
}
