
import React from 'react';
import { EnhancedInvitationLoadingScreen } from './EnhancedInvitationLoadingScreen';

interface InvitationLoadingScreenProps {
  debugLogs?: string[];
  onRetry?: () => void;
}

export const InvitationLoadingScreen: React.FC<InvitationLoadingScreenProps> = (props) => {
  return <EnhancedInvitationLoadingScreen {...props} />;
};
