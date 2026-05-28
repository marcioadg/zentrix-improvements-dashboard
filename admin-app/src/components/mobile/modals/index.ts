// Mobile-specific modal components
// These are completely separate from desktop modals to prevent cross-effects
// IMPORTANT: These components are ONLY for use on /m mobile pages
// DO NOT import these in desktop components

export { MobileBaseModal, MobileModalInputFocusContext, useMobileModalInputFocus } from './MobileBaseModal';
export { MobileAddTaskModal } from './MobileAddTaskModal';
export { MobileAddGoalModal } from './MobileAddGoalModal';
export { MobileAddMetricModal } from './MobileAddMetricModal';
export { MobileAddHeadlineModal } from './MobileAddHeadlineModal';
export { MobileAddIssueModal } from './MobileAddIssueModal';
export { MobileEditFastTaskModal } from './MobileEditFastTaskModal';

// Mobile edit modals
export { MobileEditIssueModal } from './MobileEditIssueModal';
export { MobileMetricConfigurationModal } from './MobileMetricConfigurationModal';
export { MobileGoalStatusModal } from './MobileGoalStatusModal';

// Mobile settings modals
export { MobileDeleteAccountDialog } from './MobileDeleteAccountDialog';

// Mobile company modals
export { MobileInviteMemberSheet } from './MobileInviteMemberSheet';
