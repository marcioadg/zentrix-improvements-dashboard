
export enum InvitationErrorType {
  EXPIRED = 'EXPIRED',
  INVALID_PARAMS = 'INVALID_PARAMS', 
  ALREADY_USED = 'ALREADY_USED',
  AUTH_FAILED = 'AUTH_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  EMAIL_VERIFICATION_TIMEOUT = 'EMAIL_VERIFICATION_TIMEOUT',
  COMPANY_ACCESS_DENIED = 'COMPANY_ACCESS_DENIED',
  UNKNOWN = 'UNKNOWN'
}

export interface InvitationError {
  type: InvitationErrorType;
  message: string;
  details?: string;
  timestamp: number;
  recoverable: boolean;
  retryable: boolean;
  email?: string; // Added for resend functionality
}

export interface InvitationData {
  email: string;
  fullName: string;
  companyName: string;
  invitedBy: string;
  companyId?: string;
  teamIds?: string[];
}

export interface InvitationFlowState {
  invitationData: InvitationData | null;
  isInvitationFlow: boolean;
  readyForPasswordSetup: boolean;
  loading: boolean;
  error: InvitationError | null;
  debugLogs: string[];
}
