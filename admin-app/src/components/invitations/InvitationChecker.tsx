import { usePendingInvitations } from '@/hooks/usePendingInvitations';

// This component now only fetches invitations in the background
// The modal is controlled manually by buttons in the UI
export const InvitationChecker = () => {
  // Just trigger the hook to fetch invitations, but don't auto-show modal
  usePendingInvitations();
  
  return null;
};