import { logger } from '@/utils/logger';

// Legacy invitation utilities - kept for backward compatibility
// New invitation flow uses CompleteInvitation component directly

export class InvitationLogger {
  private static logs: string[] = [];

  static log(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}${data ? ` - ${JSON.stringify(data)}` : ''}`;
    logger.log(`🎫 ${logEntry}`);
    this.logs.push(logEntry);
  }

  static error(message: string, error?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ERROR: ${message}${error ? ` - ${JSON.stringify(error)}` : ''}`;
    logger.error(`🎫 ${logEntry}`);
    this.logs.push(logEntry);
  }

  static getLogs(): string[] {
    return [...this.logs];
  }

  static clearLogs() {
    this.logs = [];
  }
}

// Deprecated - use CompleteInvitation component instead
export const validateInvitationParams = () => {
  logger.warn('validateInvitationParams is deprecated. Use CompleteInvitation component instead.');
  return { isValid: false, error: null, data: null };
};

// Deprecated - use CompleteInvitation component instead
export const createInvitationError = () => {
  logger.warn('createInvitationError is deprecated. Use CompleteInvitation component instead.');
  return null;
};

// Deprecated - use CompleteInvitation component instead
export const getErrorDisplayInfo = () => {
  logger.warn('getErrorDisplayInfo is deprecated. Use CompleteInvitation component instead.');
  return {
    title: 'Deprecated Function',
    description: 'Please use the new CompleteInvitation component.',
    actionText: 'OK',
    showResendOption: false
  };
};
