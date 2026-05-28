import { useCallback } from 'react';
import { useComprehensiveActivityLogging } from './useComprehensiveActivityLogging';

export const useAccessDeniedLogger = () => {
  const { logAccessDeniedAttempt } = useComprehensiveActivityLogging();

  const logRouteAccess = useCallback(async (route: string, requiredPermission: string) => {
    await logAccessDeniedAttempt(
      `Access denied to route: ${route} (requires: ${requiredPermission})`,
      'route',
      route,
      { requiredPermission, attempted_route: route }
    );
  }, [logAccessDeniedAttempt]);

  const logFeatureAccess = useCallback(async (featureName: string, requiredPermission: string, details?: any) => {
    await logAccessDeniedAttempt(
      `Access denied to feature: ${featureName} (requires: ${requiredPermission})`,
      'feature',
      featureName,
      { requiredPermission, featureName, ...details }
    );
  }, [logAccessDeniedAttempt]);

  const logDataAccess = useCallback(async (resourceType: string, resourceId: string, operation: string) => {
    await logAccessDeniedAttempt(
      `Access denied: ${operation} on ${resourceType} (ID: ${resourceId})`,
      resourceType,
      resourceId,
      { operation, attempted_action: operation }
    );
  }, [logAccessDeniedAttempt]);

  const logCompanyAccess = useCallback(async (companyId: string, operation: string) => {
    await logAccessDeniedAttempt(
      `Access denied: ${operation} on company (ID: ${companyId})`,
      'company',
      companyId,
      { operation, attempted_action: operation }
    );
  }, [logAccessDeniedAttempt]);

  return {
    logRouteAccess,
    logFeatureAccess,
    logDataAccess,
    logCompanyAccess
  };
};