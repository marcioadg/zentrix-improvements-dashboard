import * as amplitude from '@amplitude/analytics-browser';

const AMPLITUDE_API_KEY = import.meta.env.VITE_AMPLITUDE_API_KEY;

let isInitialized = false;

/**
 * Initialize Amplitude SDK
 * Called once from AmplitudeProvider on app mount
 */
export const initAmplitude = () => {
  if (!AMPLITUDE_API_KEY || isInitialized) return;

  amplitude.init(AMPLITUDE_API_KEY, {
    defaultTracking: {
      sessions: true,
      pageViews: true,
      formInteractions: false,
      fileDownloads: false,
    },
  });
  isInitialized = true;
};

/**
 * Identify user in Amplitude (call on login/signup)
 */
export const identifyAmplitudeUser = (userId: string, properties?: {
  email?: string;
  authProvider?: string;
  companyId?: string;
}) => {
  if (!isInitialized) return;

  amplitude.setUserId(userId);

  if (properties) {
    const identifyEvent = new amplitude.Identify();
    if (properties.email) identifyEvent.set('email', properties.email);
    if (properties.authProvider) identifyEvent.set('authProvider', properties.authProvider);
    if (properties.companyId) identifyEvent.set('companyId', properties.companyId);
    amplitude.identify(identifyEvent);
  }
};

/**
 * Reset Amplitude user (call on logout)
 */
export const resetAmplitudeUser = () => {
  if (!isInitialized) return;
  amplitude.reset();
};

// Helper to add timestamp to all event properties
const withTimestamp = (properties: Record<string, unknown>): Record<string, unknown> => ({
  ...properties,
  timestamp: new Date().toISOString(),
});

// Safe track wrapper
const track = (eventName: string, properties: Record<string, unknown> = {}) => {
  if (!isInitialized) return;
  try {
    amplitude.track(eventName, withTimestamp(properties));
  } catch {
    // Non-blocking
  }
};

// ============================================
// USER/COMPANY EVENTS
// ============================================

export const ampTrackUserProfileUpdated = (metadata: {
  user_id?: string;
  fields_updated?: string[];
}) => {
  track('user_profile_updated', metadata);
};

export const ampTrackCompanySettingsUpdated = (metadata: {
  user_id?: string;
  company_id?: string;
  settings_changed?: string[];
}) => {
  track('company_settings_updated', metadata);
};

export const ampTrackTeamMemberRemoved = (metadata: {
  user_id?: string;
  company_id?: string;
  removed_user_id?: string;
  removal_type: 'deleted' | 'deactivated';
}) => {
  track('team_member_removed', metadata);
};

export const ampTrackTeamMemberRoleChanged = (metadata: {
  user_id?: string;
  company_id?: string;
  target_user_id?: string;
  old_role?: string;
  new_role?: string;
}) => {
  track('team_member_role_changed', metadata);
};

// ============================================
// TASK EVENTS
// ============================================

export const ampTrackTaskCreated = (metadata: {
  user_id?: string;
  company_id?: string;
  task_id?: string;
  task_text?: string;
  assignee_id?: string | null;
  source?: string;
  due_date?: string;
}) => {
  track('task_created', metadata);
};

export const ampTrackTaskCompleted = (metadata: {
  user_id?: string;
  company_id?: string;
  task_id?: string;
  completed_on_time?: boolean;
  days_to_complete?: number;
  assignee_id?: string | null;
}) => {
  track('task_completed', metadata);
};

export const ampTrackTaskUpdated = (metadata: {
  user_id?: string;
  company_id?: string;
  task_id?: string;
  fields_changed?: string[];
  assignee_id?: string | null;
}) => {
  track('task_updated', metadata);
};

export const ampTrackTaskArchived = (metadata: {
  user_id?: string;
  company_id?: string;
  task_id?: string;
  was_completed?: boolean;
}) => {
  track('task_archived', metadata);
};

// ============================================
// PEOPLE ANALYZER EVENTS
// ============================================

export const ampTrackPeopleAnalyzerStarted = (metadata: {
  user_id?: string;
  company_id?: string;
  assessment_id?: string;
  team_size?: number;
}) => {
  track('people_analyzer_started', metadata);
};

export const ampTrackPeopleAnalyzerCompleted = (metadata: {
  user_id?: string;
  company_id?: string;
  assessment_id?: string;
  people_assessed?: number;
}) => {
  track('people_analyzer_completed', metadata);
};

// ============================================
// ACCOUNTABILITY CHART EVENTS
// ============================================

export const ampTrackAccountabilityChartCreated = (metadata: {
  user_id?: string;
  company_id?: string;
  chart_id?: string;
}) => {
  track('accountability_chart_created', metadata);
};

export const ampTrackAccountabilityChartUpdated = (metadata: {
  user_id?: string;
  company_id?: string;
  chart_id?: string;
  changes_made?: string;
}) => {
  track('accountability_chart_updated', metadata);
};

export const ampTrackSeatAdded = (metadata: {
  user_id?: string;
  company_id?: string;
  chart_id?: string;
  seat_id?: string;
  seat_name?: string;
}) => {
  track('seat_added', metadata);
};

export const ampTrackSeatFilled = (metadata: {
  user_id?: string;
  company_id?: string;
  seat_id?: string;
  assigned_user_id?: string;
}) => {
  track('seat_filled', metadata);
};

export const ampTrackSeatRemoved = (metadata: {
  user_id?: string;
  company_id?: string;
  seat_id?: string;
  was_filled?: boolean;
}) => {
  track('seat_removed', metadata);
};

// ============================================
// SESSION EVENTS
// ============================================

export const ampTrackUserLoggedIn = (metadata: {
  user_id?: string;
  company_id?: string | null;
  session_id?: string;
}) => {
  track('user_logged_in', metadata);
};

export const ampTrackUserLoggedOut = (metadata: {
  user_id?: string;
  session_id?: string;
  session_duration_minutes?: number;
  pages_viewed?: number;
  actions_taken?: number;
}) => {
  track('user_logged_out', metadata);
};

// ============================================
// GOAL EVENTS
// ============================================

export const ampTrackGoalCreated = (metadata: {
  user_id?: string;
  company_id?: string;
  goal_id?: string;
  goal_type?: string;
  goal_title?: string;
  teamId?: string;
}) => {
  track('goal_created', metadata);
};

export const ampTrackGoalStatusChanged = (metadata: {
  user_id?: string;
  company_id?: string;
  goal_id?: string;
  old_status?: string;
  new_status?: string;
}) => {
  track('goal_status_changed', metadata);
};

export const ampTrackGoalCompleted = (metadata: {
  user_id?: string;
  company_id?: string;
  goal_id?: string;
  days_to_complete?: number;
}) => {
  track('goal_completed', metadata);
};

// ============================================
// L10 MEETING EVENTS
// ============================================

export const ampTrackL10Started = (metadata: {
  user_id?: string;
  company_id?: string;
  meeting_id?: string;
  meeting_type?: string;
}) => {
  track('l10_started', metadata);
};

export const ampTrackL10Completed = (metadata: {
  user_id?: string;
  company_id?: string;
  meeting_id?: string;
  meeting_duration_minutes?: number;
  action_items_created?: number;
}) => {
  track('l10_completed', metadata);
};

// ============================================
// SIGNUP EVENTS
// ============================================

export const ampTrackSignupStarted = (metadata: {
  email?: string;
  signup_source?: string;
}) => {
  track('signup_started', metadata);
};

export const ampTrackUserAccountCreated = (metadata: {
  user_id?: string;
  email?: string;
  signup_source?: string;
  signup_type?: 'organic' | 'invited';
  invited_by_company_id?: string;
}) => {
  track('user_account_created', metadata);
};

// ============================================
// COMPANY EVENTS
// ============================================

export const ampTrackCompanyCreated = (metadata: {
  user_id?: string;
  company_id?: string;
  company_name?: string;
  industry?: string;
}) => {
  track('company_created', metadata);
};

// ============================================
// V/TO (Vision/Traction Organizer) EVENTS
// ============================================

export const ampTrackVTOStarted = (metadata: {
  user_id?: string;
  company_id?: string;
}) => {
  track('vto_started', metadata);
};

export const ampTrackVTOCompleted = (metadata: {
  user_id?: string;
  company_id?: string;
  completion_percentage?: number;
}) => {
  track('vto_completed', metadata);
};

export const ampTrackVTOSectionCompleted = (metadata: {
  user_id?: string;
  company_id?: string;
  section_name?: string;
}) => {
  track('vto_section_completed', metadata);
};

export const ampTrackVTOExported = (metadata: {
  user_id?: string;
  company_id?: string;
  export_format?: string;
}) => {
  track('vto_exported', metadata);
};

// ============================================
// METRICS EVENTS
// ============================================

export const ampTrackMetricsViewed = (metadata: {
  user_id?: string;
  company_id?: string;
}) => {
  track('metrics_viewed', metadata);
};

export const ampTrackMetricCreated = (metadata: {
  user_id?: string;
  company_id?: string;
  metric_id?: string;
  metric_name?: string;
  metric_type?: string;
}) => {
  track('metric_created', metadata);
};

export const ampTrackMetricUpdated = (metadata: {
  user_id?: string;
  company_id?: string;
  metric_id?: string;
  old_value?: number;
  new_value?: number;
}) => {
  track('metric_updated', metadata);
};

// ============================================
// ISSUE EVENTS
// ============================================

export const ampTrackIssueCreated = (metadata: {
  user_id?: string;
  company_id?: string;
  issue_id?: string;
  issue_title?: string;
  priority?: string;
}) => {
  track('issue_created', metadata);
};

export const ampTrackIssueResolved = (metadata: {
  user_id?: string;
  company_id?: string;
  issue_id?: string;
  days_to_resolve?: number;
}) => {
  track('issue_resolved', metadata);
};

// ============================================
// TEAM MEMBER EVENTS
// ============================================

export const ampTrackTeamMemberInvited = (metadata: {
  user_id?: string;
  company_id?: string;
  invited_email?: string;
  role?: string;
}) => {
  track('team_member_invited', metadata);
};

export const ampTrackTeamMemberJoined = (metadata: {
  user_id?: string;
  company_id?: string;
  invited_by_user_id?: string;
}) => {
  track('team_member_joined', metadata);
};

// ============================================
// QUARTERLY REVIEW EVENTS
// ============================================

export const ampTrackQuarterlyReviewStarted = (metadata: {
  user_id?: string;
  company_id?: string;
  review_id?: string;
  attendee_count?: number;
}) => {
  track('quarterly_review_started', metadata);
};

export const ampTrackQuarterlyReviewCompleted = (metadata: {
  user_id?: string;
  company_id?: string;
  review_id?: string;
  duration?: number;
  goals_set?: number;
}) => {
  track('quarterly_review_completed', metadata);
};

// ============================================
// ANNUAL REVIEW EVENTS
// ============================================

export const ampTrackAnnualReviewStarted = (metadata: {
  user_id?: string;
  company_id?: string;
  review_id?: string;
  attendee_count?: number;
}) => {
  track('annual_review_started', metadata);
};

export const ampTrackAnnualReviewCompleted = (metadata: {
  user_id?: string;
  company_id?: string;
  review_id?: string;
  duration?: number;
  objectives_set?: number;
}) => {
  track('annual_review_completed', metadata);
};

// ============================================
// CUSTOM MEETING EVENTS
// ============================================

export const ampTrackCustomMeetingCreated = (metadata: {
  user_id?: string;
  company_id?: string;
  meeting_id?: string;
  meeting_name?: string;
  is_recurring?: string;
  sections?: string;
  section_count?: number;
}) => {
  track('custom_meeting_created', metadata);
};

export const ampTrackCustomMeetingStarted = (metadata: {
  user_id?: string;
  company_id?: string;
  meeting_id?: string;
  team_id?: string;
  team_name?: string;
  attendee_count?: number;
}) => {
  track('custom_meeting_started', metadata);
};

export const ampTrackCustomMeetingCompleted = (metadata: {
  user_id?: string;
  company_id?: string;
  meeting_id?: string;
  duration?: number;
}) => {
  track('custom_meeting_completed', metadata);
};

export const ampTrackCustomMeetingDeleted = (metadata: {
  user_id?: string;
  company_id?: string;
  meeting_id?: string;
  meetings_held?: number;
}) => {
  track('custom_meeting_deleted', metadata);
};

// ============================================
// GENERIC EVENT
// ============================================

export const ampTrackCustomEvent = (
  eventName: string,
  properties?: Record<string, unknown>
) => {
  track(eventName, properties || {});
};
