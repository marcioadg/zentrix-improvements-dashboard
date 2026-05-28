
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserCapabilities } from '@/hooks/useUserCapabilities';
import { PERMISSION_LEVEL_CAPABILITIES } from '@/utils/capabilityDefinitions';
import { logger } from '@/utils/logger';
import { useCurrentUserRoles } from '@/hooks/useUserRoles';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface SuperAdminRouteProps {
  children: React.ReactNode;
}

export const SuperAdminRoute: React.FC<SuperAdminRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { hasCapability, permissionLevel } = useUserCapabilities();
  const { isSuperAdminAssistant } = useCurrentUserRoles();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  logger.debug('SuperAdminRoute check:', { 
    user: user?.email, 
    permissionLevel, 
    hasAdminPanel: hasCapability('access_admin_panel'),
    hasSystemAccess: hasCapability('system_wide_access'),
    isSuperAdminAssistant: isSuperAdminAssistant(),
    allCapabilities: PERMISSION_LEVEL_CAPABILITIES[permissionLevel] || []
  });

  // Only allow global admins: super_admin or super_admin_assistant
  // Directors no longer have access to this page
  const hasAdminAccess = user && (
    permissionLevel === 'super_admin' ||
    isSuperAdminAssistant()
  );

  if (!user || !hasAdminAccess) {
    logger.debug('Access denied to company-management - requires super_admin or super_admin_assistant role, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
