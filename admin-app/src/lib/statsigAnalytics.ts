// Dual-tracking: Statsig + Amplitude
// Each event fires to both platforms during migration period.
// Once Amplitude is validated, Statsig event calls can be removed.

import {
  ampTrackUserProfileUpdated,
  ampTrackCompanySettingsUpdated,
  ampTrackTeamMemberRemoved,
  ampTrackTeamMemberRoleChanged,
  ampTrackTaskCreated,
  ampTrackTaskCompleted,
  ampTrackTaskUpdated,
  ampTrackTaskArchived,
  ampTrackPeopleAnalyzerStarted,
  ampTrackPeopleAnalyzerCompleted,
  ampTrackAccountabilityChartCreated,
  ampTrackAccountabilityChartUpdated,
  ampTrackSeatAdded,
  ampTrackSeatFilled,
  ampTrackSeatRemoved,
  ampTrackUserLoggedIn,
  ampTrackUserLoggedOut,
  ampTrackGoalCreated,
  ampTrackGoalStatusChanged,
  ampTrackGoalCompleted,
  ampTrackL10Started,
  ampTrackL10Completed,
  ampTrackSignupStarted,
  ampTrackUserAccountCreated,
  ampTrackCompanyCreated,
  ampTrackVTOStarted,
  ampTrackVTOCompleted,
  ampTrackVTOSectionCompleted,
  ampTrackVTOExported,
  ampTrackMetricsViewed,
  ampTrackMetricCreated,
  ampTrackMetricUpdated,
  ampTrackIssueCreated,
  ampTrackIssueResolved,
  ampTrackTeamMemberInvited,
  ampTrackTeamMemberJoined,
  ampTrackQuarterlyReviewStarted,
  ampTrackQuarterlyReviewCompleted,
  ampTrackAnnualReviewStarted,
  ampTrackAnnualReviewCompleted,
  ampTrackCustomMeetingCreated,
  ampTrackCustomMeetingStarted,
  ampTrackCustomMeetingCompleted,
  ampTrackCustomMeetingDeleted,
  ampTrackCustomEvent,
} from '@/lib/amplitudeAnalytics';

// Helper to convert metadata to Record<string, string> with timestamp
const toMetadata = (data: Record<string, string | number | boolean | string[] | undefined>): Record<string, string> => {
  const result: Record<string, string> = {
    timestamp: new Date().toISOString(),
  };

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        result[key] = JSON.stringify(value);
      } else {
        result[key] = String(value);
      }
    }
  }

  return result;
};

// Store for the Statsig client reference
let statsigClientRef: { logEvent: (name: string, value?: string | number, metadata?: Record<string, string>) => void } | null = null;

export const setStatsigClient = (client: typeof statsigClientRef) => {
  statsigClientRef = client;
};

// ============================================
// USER/COMPANY EVENTS (6)
// ============================================

export const trackUserProfileUpdated = (metadata: {
  user_id?: string;
  fields_updated?: string[];
}) => {
  try {
    statsigClientRef?.logEvent('user_profile_updated', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackUserProfileUpdated(metadata);
};

export const trackCompanySettingsUpdated = (metadata: {
  user_id?: string;
  company_id?: string;
  settings_changed?: string[];
}) => {
  try {
    statsigClientRef?.logEvent('company_settings_updated', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackCompanySettingsUpdated(metadata);
};

// REMOVED: trackUserJoinedCompany - replaced by signup_type in trackUserAccountCreated
// REMOVED: trackUserLeftCompany - users cannot leave companies, only delete accounts

export const trackTeamMemberRemoved = (metadata: {
  user_id?: string;
  company_id?: string;
  removed_user_id?: string;
  removal_type: 'deleted' | 'deactivated';
}) => {
  try {
    statsigClientRef?.logEvent('team_member_removed', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackTeamMemberRemoved(metadata);
};

export const trackTeamMemberRoleChanged = (metadata: {
  user_id?: string;
  company_id?: string;
  target_user_id?: string;
  old_role?: string;
  new_role?: string;
}) => {
  try {
    statsigClientRef?.logEvent('team_member_role_changed', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackTeamMemberRoleChanged(metadata);
};

// ============================================
// TASK EVENTS (5) - NEW UNIFIED TRACKING
// ============================================

export const trackTaskCreatedV2 = (metadata: {
  user_id?: string;
  company_id?: string;
  task_id?: string;
  task_text?: string;
  assignee_id?: string | null;
  source?: string;
  due_date?: string;
}) => {
  try {
    statsigClientRef?.logEvent('task_created', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackTaskCreated(metadata);
};

export const trackTaskCompletedV2 = (metadata: {
  user_id?: string;
  company_id?: string;
  task_id?: string;
  completed_on_time?: boolean;
  days_to_complete?: number;
  assignee_id?: string | null;
}) => {
  try {
    statsigClientRef?.logEvent('task_completed', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackTaskCompleted(metadata);
};

export const trackTaskUpdatedV2 = (metadata: {
  user_id?: string;
  company_id?: string;
  task_id?: string;
  fields_changed?: string[];
  assignee_id?: string | null;
}) => {
  try {
    statsigClientRef?.logEvent('task_updated', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackTaskUpdated(metadata);
};

export const trackTaskArchivedV2 = (metadata: {
  user_id?: string;
  company_id?: string;
  task_id?: string;
  was_completed?: boolean;
}) => {
  try {
    statsigClientRef?.logEvent('task_archived', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackTaskArchived(metadata);
};

// ============================================
// PEOPLE ANALYZER EVENTS (3)
// ============================================

export const trackPeopleAnalyzerStarted = (metadata: {
  user_id?: string;
  company_id?: string;
  assessment_id?: string;
  team_size?: number;
}) => {
  try {
    statsigClientRef?.logEvent('people_analyzer_started', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackPeopleAnalyzerStarted(metadata);
};

export const trackPeopleAnalyzerCompleted = (metadata: {
  user_id?: string;
  company_id?: string;
  assessment_id?: string;
  people_assessed?: number;
}) => {
  try {
    statsigClientRef?.logEvent('people_analyzer_completed', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackPeopleAnalyzerCompleted(metadata);
};

// ============================================
// ACCOUNTABILITY CHART EVENTS (6)
// ============================================

export const trackAccountabilityChartCreated = (metadata: {
  user_id?: string;
  company_id?: string;
  chart_id?: string;
}) => {
  try {
    statsigClientRef?.logEvent('accountability_chart_created', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackAccountabilityChartCreated(metadata);
};

export const trackAccountabilityChartUpdated = (metadata: {
  user_id?: string;
  company_id?: string;
  chart_id?: string;
  changes_made?: string;
}) => {
  try {
    statsigClientRef?.logEvent('accountability_chart_updated', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackAccountabilityChartUpdated(metadata);
};

export const trackSeatAdded = (metadata: {
  user_id?: string;
  company_id?: string;
  chart_id?: string;
  seat_id?: string;
  seat_name?: string;
}) => {
  try {
    statsigClientRef?.logEvent('seat_added', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackSeatAdded(metadata);
};

export const trackSeatFilled = (metadata: {
  user_id?: string;
  company_id?: string;
  seat_id?: string;
  assigned_user_id?: string;
}) => {
  try {
    statsigClientRef?.logEvent('seat_filled', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackSeatFilled(metadata);
};

export const trackSeatRemoved = (metadata: {
  user_id?: string;
  company_id?: string;
  seat_id?: string;
  was_filled?: boolean;
}) => {
  try {
    statsigClientRef?.logEvent('seat_removed', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackSeatRemoved(metadata);
};

// ============================================
// SESSION EVENTS (2)
// ============================================

export const trackUserLoggedIn = (metadata: {
  user_id?: string;
  company_id?: string | null;
  session_id?: string;
}) => {
  try {
    statsigClientRef?.logEvent('user_logged_in', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackUserLoggedIn(metadata);
};

export const trackUserLoggedOut = (metadata: {
  user_id?: string;
  session_id?: string;
  session_duration_minutes?: number;
  pages_viewed?: number;
  actions_taken?: number;
}) => {
  try {
    statsigClientRef?.logEvent('user_logged_out', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackUserLoggedOut(metadata);
};

// Goal Events
export const trackGoalCreated = (metadata: {
  user_id?: string;
  company_id?: string;
  goal_id?: string;
  goal_type?: string;
  goal_title?: string;
  teamId?: string;
}) => {
  try {
    statsigClientRef?.logEvent('goal_created', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackGoalCreated(metadata);
};

export const trackGoalStatusChanged = (metadata: {
  user_id?: string;
  company_id?: string;
  goal_id?: string;
  old_status?: string;
  new_status?: string;
}) => {
  try {
    statsigClientRef?.logEvent('goal_status_changed', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackGoalStatusChanged(metadata);
};

export const trackGoalCompleted = (metadata: {
  user_id?: string;
  company_id?: string;
  goal_id?: string;
  days_to_complete?: number;
}) => {
  try {
    statsigClientRef?.logEvent('goal_completed', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackGoalCompleted(metadata);
};

// L10 Meeting Events
export const trackL10Started = (metadata: {
  user_id?: string;
  company_id?: string;
  meeting_id?: string;
  meeting_type?: string;
}) => {
  try {
    statsigClientRef?.logEvent('l10_started', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackL10Started(metadata);
};

export const trackL10Completed = (metadata: {
  user_id?: string;
  company_id?: string;
  meeting_id?: string;
  meeting_duration_minutes?: number;
  action_items_created?: number;
}) => {
  try {
    statsigClientRef?.logEvent('l10_completed', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackL10Completed(metadata);
};

// Signup Events
export const trackSignupStarted = (metadata: {
  email?: string;
  signup_source?: string;
}) => {
  try {
    statsigClientRef?.logEvent('signup_started', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackSignupStarted(metadata);
};

export const trackUserAccountCreated = (metadata: {
  user_id?: string;
  email?: string;
  signup_source?: string;
  signup_type?: 'organic' | 'invited';
  invited_by_company_id?: string;
}) => {
  try {
    statsigClientRef?.logEvent('user_account_created', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackUserAccountCreated(metadata);
};

// Company Events
export const trackCompanyCreated = (metadata: {
  user_id?: string;
  company_id?: string;
  company_name?: string;
  industry?: string;
}) => {
  try {
    statsigClientRef?.logEvent('company_created', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackCompanyCreated(metadata);
};

// V/TO (Vision/Traction Organizer) Events
export const trackVTOStarted = (metadata: {
  user_id?: string;
  company_id?: string;
}) => {
  try {
    statsigClientRef?.logEvent('vto_started', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackVTOStarted(metadata);
};

export const trackVTOCompleted = (metadata: {
  user_id?: string;
  company_id?: string;
  completion_percentage?: number;
}) => {
  try {
    statsigClientRef?.logEvent('vto_completed', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackVTOCompleted(metadata);
};

// Metrics Events
export const trackMetricsViewed = (metadata: {
  user_id?: string;
  company_id?: string;
}) => {
  try {
    statsigClientRef?.logEvent('metrics_viewed', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackMetricsViewed(metadata);
};

export const trackMetricCreated = (metadata: {
  user_id?: string;
  company_id?: string;
  metric_id?: string;
  metric_name?: string;
  metric_type?: string;
}) => {
  try {
    statsigClientRef?.logEvent('metric_created', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackMetricCreated(metadata);
};

export const trackMetricUpdated = (metadata: {
  user_id?: string;
  company_id?: string;
  metric_id?: string;
  old_value?: number;
  new_value?: number;
}) => {
  try {
    statsigClientRef?.logEvent('metric_updated', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackMetricUpdated(metadata);
};

// Issue Events
export const trackIssueCreated = (metadata: {
  user_id?: string;
  company_id?: string;
  issue_id?: string;
  issue_title?: string;
  priority?: string;
}) => {
  try {
    statsigClientRef?.logEvent('issue_created', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackIssueCreated(metadata);
};

export const trackIssueResolved = (metadata: {
  user_id?: string;
  company_id?: string;
  issue_id?: string;
  days_to_resolve?: number;
}) => {
  try {
    statsigClientRef?.logEvent('issue_resolved', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackIssueResolved(metadata);
};

// Team Member Events
export const trackTeamMemberInvited = (metadata: {
  user_id?: string;
  company_id?: string;
  invited_email?: string;
  role?: string;
}) => {
  try {
    statsigClientRef?.logEvent('team_member_invited', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackTeamMemberInvited(metadata);
};

export const trackTeamMemberJoined = (metadata: {
  user_id?: string;
  company_id?: string;
  invited_by_user_id?: string;
}) => {
  try {
    statsigClientRef?.logEvent('team_member_joined', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackTeamMemberJoined(metadata);
};


// V/TO Events
export const trackVTOSectionCompleted = (metadata: {
  user_id?: string;
  company_id?: string;
  section_name?: string;
}) => {
  try {
    statsigClientRef?.logEvent('vto_section_completed', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackVTOSectionCompleted(metadata);
};

export const trackVTOExported = (metadata: {
  user_id?: string;
  company_id?: string;
  export_format?: string;
}) => {
  try {
    statsigClientRef?.logEvent('vto_exported', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackVTOExported(metadata);
};

// Quarterly Review Events
export const trackQuarterlyReviewStarted = (metadata: {
  user_id?: string;
  company_id?: string;
  review_id?: string;
  attendee_count?: number;
}) => {
  try {
    statsigClientRef?.logEvent('quarterly_review_started', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackQuarterlyReviewStarted(metadata);
};

export const trackQuarterlyReviewCompleted = (metadata: {
  user_id?: string;
  company_id?: string;
  review_id?: string;
  duration?: number;
  goals_set?: number;
}) => {
  try {
    statsigClientRef?.logEvent('quarterly_review_completed', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackQuarterlyReviewCompleted(metadata);
};

// Annual Review Events
export const trackAnnualReviewStarted = (metadata: {
  user_id?: string;
  company_id?: string;
  review_id?: string;
  attendee_count?: number;
}) => {
  try {
    statsigClientRef?.logEvent('annual_review_started', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackAnnualReviewStarted(metadata);
};

export const trackAnnualReviewCompleted = (metadata: {
  user_id?: string;
  company_id?: string;
  review_id?: string;
  duration?: number;
  objectives_set?: number;
}) => {
  try {
    statsigClientRef?.logEvent('annual_review_completed', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackAnnualReviewCompleted(metadata);
};

// Custom Meeting Events
export const trackCustomMeetingCreated = (metadata: {
  user_id?: string;
  company_id?: string;
  meeting_id?: string;
  meeting_name?: string;
  is_recurring?: string;
  sections?: string; // JSON array of section types/names added
  section_count?: number;
}) => {
  try {
    statsigClientRef?.logEvent('custom_meeting_created', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackCustomMeetingCreated(metadata);
};

export const trackCustomMeetingStarted = (metadata: {
  user_id?: string;
  company_id?: string;
  meeting_id?: string;
  team_id?: string;
  team_name?: string;
  attendee_count?: number;
}) => {
  try {
    statsigClientRef?.logEvent('custom_meeting_started', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackCustomMeetingStarted(metadata);
};

export const trackCustomMeetingCompleted = (metadata: {
  user_id?: string;
  company_id?: string;
  meeting_id?: string;
  duration?: number;
}) => {
  try {
    statsigClientRef?.logEvent('custom_meeting_completed', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackCustomMeetingCompleted(metadata);
};

export const trackCustomMeetingDeleted = (metadata: {
  user_id?: string;
  company_id?: string;
  meeting_id?: string;
  meetings_held?: number;
}) => {
  try {
    statsigClientRef?.logEvent('custom_meeting_deleted', undefined, toMetadata(metadata));
  } catch (e) {
    // Non-blocking
  }
  ampTrackCustomMeetingDeleted(metadata);
};

// Generic event logging
export const trackCustomEvent = (
  eventName: string,
  value?: string | number,
  metadata?: Record<string, string | number | undefined>
) => {
  statsigClientRef?.logEvent(eventName, value, metadata ? toMetadata(metadata) : undefined);
  ampTrackCustomEvent(eventName, metadata);
};
