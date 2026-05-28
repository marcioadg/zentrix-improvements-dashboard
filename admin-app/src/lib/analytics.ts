import { logger } from '@/utils/logger';
/**
 * Google Analytics tracking utility
 * Centralizes all event tracking for the application
 * 
 * Uses direct GA4 implementation (gtag.js loaded in index.html)
 */

// Type-safe event tracking
interface EventParams {
  [key: string]: string | number | boolean;
}

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag?: (
      command: 'event' | 'config' | 'js',
      targetOrAction: string | Date,
      params?: EventParams
    ) => void;
    dataLayer?: any[];
  }
}

/**
 * Push event to dataLayer as fallback
 */
const pushToDataLayer = (eventName: string, params?: EventParams) => {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      ...params,
    });
    return true;
  }
  return false;
};

/**
 * Track a custom event in Google Analytics
 * Uses gtag directly, falls back to dataLayer.push
 */
export const trackEvent = (eventName: string, params?: EventParams) => {
  if (typeof window === 'undefined') {
    return;
  }

  // Add timestamp for debugging
  const enrichedParams = {
    ...params,
    event_timestamp: Date.now(),
  };

  // Try gtag first (primary method)
  if (typeof window.gtag === 'function') {
    try {
      window.gtag('event', eventName, enrichedParams);
      return;
    } catch (error) {
      logger.error('❌ GA4 gtag error:', error);
    }
  }

  // Fallback to dataLayer.push
  pushToDataLayer(eventName, enrichedParams);
};

// ============= Authentication Events =============

export const trackSignUp = (method: 'email' | 'google' = 'email') => {
  trackEvent('sign_up', { method });
};

export const trackLogin = (method: 'email' | 'google' = 'email') => {
  trackEvent('login', { method });
};

export const trackLogout = () => {
  trackEvent('logout');
};

// ============= Onboarding Events =============

export const trackOnboardingStart = () => {
  trackEvent('onboarding_start');
};

export const trackOnboardingComplete = () => {
  trackEvent('onboarding_complete');
};

export const trackOnboardingStep = (stepName: string) => {
  trackEvent('onboarding_step', { step_name: stepName });
};

// ============= Task Events =============

export const trackTaskCreated = (taskType: 'personal' | 'team', source: string = 'manual') => {
  trackEvent('task_created', { task_type: taskType, source });
};

export const trackTaskCompleted = (taskType: 'personal' | 'team') => {
  trackEvent('task_completed', { task_type: taskType });
};

export const trackTaskArchived = (taskType: 'personal' | 'team') => {
  trackEvent('task_archived', { task_type: taskType });
};

// Legacy alias for backwards compatibility
export const trackTaskDeleted = trackTaskArchived;

export const trackTaskStatusChanged = (
  taskType: 'personal' | 'team',
  oldStatus: string,
  newStatus: string
) => {
  trackEvent('task_status_changed', {
    task_type: taskType,
    old_status: oldStatus,
    new_status: newStatus,
  });
};

// ============= Team/Company Events =============

export const trackTeamCreated = () => {
  trackEvent('team_created');
};

export const trackTeamMemberInvited = (role: string) => {
  trackEvent('team_member_invited', { role });
};

export const trackCompanyCreated = () => {
  trackEvent('company_created');
};

// ============= Goal Events =============

export const trackGoalCreated = (goalType: 'company' | 'team') => {
  trackEvent('goal_created', { goal_type: goalType });
};

export const trackGoalCompleted = (goalType: 'company' | 'team') => {
  trackEvent('goal_completed', { goal_type: goalType });
};

export const trackGoalUpdated = (goalType: 'company' | 'team') => {
  trackEvent('goal_updated', { goal_type: goalType });
};

// ============= Metric Events =============

export const trackMetricCreated = () => {
  trackEvent('metric_created');
};

export const trackMetricUpdated = () => {
  trackEvent('metric_updated');
};

// ============= Issue Events =============

export const trackIssueCreated = (issueType: string = 'general') => {
  trackEvent('issue_created', { issue_type: issueType });
};

export const trackIssueResolved = () => {
  trackEvent('issue_resolved');
};

export const trackIssueVoted = () => {
  trackEvent('issue_voted');
};

// ============= Meeting Events =============

export const trackMeetingScheduled = (meetingType: string) => {
  trackEvent('meeting_scheduled', { meeting_type: meetingType });
};

export const trackMeetingStarted = (meetingType: string) => {
  trackEvent('meeting_started', { meeting_type: meetingType });
};

export const trackMeetingCompleted = (meetingType: string, duration?: number) => {
  trackEvent('meeting_completed', {
    meeting_type: meetingType,
    ...(duration && { duration_minutes: duration }),
  });
};

// ============= AI Chat Events =============

export const trackAIChatStarted = () => {
  trackEvent('ai_chat_started');
};

export const trackAIChatMessage = (messageType: 'user' | 'ai') => {
  trackEvent('ai_chat_message', { message_type: messageType });
};

// ============= Dashboard & Navigation Events =============

export const trackPageView = (pageName: string) => {
  trackEvent('page_view', { page_name: pageName });
};

export const trackDashboardView = () => {
  trackEvent('dashboard_view');
};

export const trackAnalyticsView = () => {
  trackEvent('analytics_view');
};

// ============= Collaboration Events =============

export const trackCommentAdded = (entityType: 'task' | 'goal' | 'issue') => {
  trackEvent('comment_added', { entity_type: entityType });
};

export const trackAttachmentUploaded = (entityType: 'task' | 'goal' | 'issue') => {
  trackEvent('attachment_uploaded', { entity_type: entityType });
};

// ============= Settings Events =============

export const trackSettingsChanged = (settingType: string) => {
  trackEvent('settings_changed', { setting_type: settingType });
};

export const trackProfileUpdated = () => {
  trackEvent('profile_updated');
};

// ============= Conversion Events (Critical) =============

export const trackUpgradeClick = (planType: string) => {
  trackEvent('upgrade_click', { plan_type: planType });
};

export const trackSubscriptionStarted = (planType: string) => {
  trackEvent('purchase', { plan_type: planType, value: 1 });
};

export const trackTrialStarted = () => {
  trackEvent('trial_started');
};

// ============= Feature Discovery Events =============

export const trackFeatureDiscovered = (featureName: string) => {
  trackEvent('feature_discovered', { feature_name: featureName });
};

export const trackTooltipViewed = (tooltipName: string) => {
  trackEvent('tooltip_viewed', { tooltip_name: tooltipName });
};

// ============= Error Events =============

export const trackError = (errorType: string, errorMessage?: string) => {
  trackEvent('error', {
    error_type: errorType,
    ...(errorMessage && { error_message: errorMessage }),
  });
};

// ============= Command Palette & Keyboard Events =============

export const trackCommandPaletteOpened = () => {
  trackEvent('command_palette_opened');
};

export const trackKeyboardShortcutUsed = (shortcutName: string) => {
  trackEvent('keyboard_shortcut_used', { shortcut_name: shortcutName });
};

// ============= Invitation Events =============

export const trackInvitationAccepted = () => {
  trackEvent('invitation_accepted');
};

// ============= Export Events =============

export const trackExportData = (exportType: string) => {
  trackEvent('export_data', { export_type: exportType });
};

// ============= Mobile Events =============

export const trackMobileAppAccessed = () => {
  trackEvent('mobile_app_accessed');
};

// ============= Integration Events =============

export const trackIntegrationConnected = (integrationType: string) => {
  trackEvent('integration_connected', { integration_type: integrationType });
};

// ============= Power User Events =============

export const trackBulkActionPerformed = (actionType: string, itemCount: number) => {
  trackEvent('bulk_action_performed', {
    action_type: actionType,
    item_count: itemCount,
  });
};

export const trackFilterApplied = (filterType: string, filterValue?: string) => {
  trackEvent('filter_applied', {
    filter_type: filterType,
    ...(filterValue && { filter_value: filterValue }),
  });
};

export const trackCustomViewCreated = (viewType: string) => {
  trackEvent('custom_view_created', { view_type: viewType });
};
