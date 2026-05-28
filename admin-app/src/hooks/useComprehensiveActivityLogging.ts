import { useCallback } from 'react';
import { logAdminAction, logAccessDenied } from '@/services/adminActionService';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { logger } from '@/utils/logger';

export const useComprehensiveActivityLogging = () => {
  const { currentCompany } = useMultiCompany();

  const logActivity = useCallback(async (
    actionType: string,
    description: string,
    options?: {
      targetType?: string;
      targetId?: string;
      userAffectedId?: string;
      success?: boolean;
      details?: any;
    }
  ) => {
    try {
      await logAdminAction(
        actionType,
        description,
        options?.details,
        options?.targetType,
        options?.targetId,
        currentCompany?.id,
        options?.userAffectedId,
        options?.success ?? true
      );
    } catch (error) {
      logger.error('Failed to log activity:', error);
    }
  }, [currentCompany?.id]);

  const logUserManagementAction = useCallback(async (
    action: 'create' | 'update' | 'delete' | 'role_change' | 'permission_change',
    userAffectedId: string,
    description: string,
    details?: any
  ) => {
    await logActivity('user_management', description, {
      targetType: 'user',
      targetId: userAffectedId,
      userAffectedId,
      details
    });
  }, [logActivity]);

  const logCompanyManagementAction = useCallback(async (
    action: 'create' | 'update' | 'delete' | 'settings_change',
    companyId: string,
    description: string,
    details?: any
  ) => {
    await logActivity('company_management', description, {
      targetType: 'company',
      targetId: companyId,
      details
    });
  }, [logActivity]);

  const logSystemConfigAction = useCallback(async (
    description: string,
    details?: any
  ) => {
    await logActivity('system_config', description, {
      targetType: 'system',
      details
    });
  }, [logActivity]);

  const logAccessDeniedAttempt = useCallback(async (
    description: string,
    targetType?: string,
    targetId?: string,
    details?: any
  ) => {
    try {
      await logAccessDenied(description, targetType, targetId, currentCompany?.id, details);
    } catch (error) {
      logger.error('Failed to log access denied:', error);
    }
  }, [currentCompany?.id]);

  const logAuthenticationAction = useCallback(async (
    action: 'login' | 'logout' | 'failed_login' | 'password_reset' | 'email_verification',
    userAffectedId?: string,
    description?: string,
    success: boolean = true
  ) => {
    await logActivity('authentication', description || `User ${action}`, {
      targetType: 'user',
      targetId: userAffectedId,
      userAffectedId,
      success
    });
  }, [logActivity]);

  return {
    logActivity,
    logUserManagementAction,
    logCompanyManagementAction,
    logSystemConfigAction,
    logAccessDeniedAttempt,
    logAuthenticationAction
  };
};