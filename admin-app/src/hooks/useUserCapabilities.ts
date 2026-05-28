import { useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { PERMISSION_LEVEL_CAPABILITIES } from '@/utils/capabilityDefinitions';
import { mapDBRoleToUIPermission, type UIPermissionLevel } from '@/utils/permissionMapping';
import { useCompanyUsers } from '@/hooks/useCompanyUsers';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';

export const useUserCapabilities = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { currentCompany } = useMultiCompany();
  const { users } = useCompanyUsers();

  const getUserPermissionLevel = useCallback((): UIPermissionLevel => {
    if (!user || !profile) return 'view-only';

    // Check company-specific role via team membership (primary method)
    if (currentCompany) {
      const companyUser = users.find(u => u.user_id === user.id);
      if (companyUser) {
        // Use permission_level from company_members (preferred)
        const effectivePermission = companyUser.permission_level ? 
          mapDBRoleToUIPermission(companyUser.permission_level as any) : 
          mapDBRoleToUIPermission(companyUser.role as any);

        return effectivePermission;
      }
    }

    // Fallback for users without company membership (shouldn't happen in normal flow)
    return 'view-only';
  }, [user?.id, profile?.role, currentCompany?.id, users]);

  const hasCapability = useCallback((capability: string): boolean => {
    // Check global super_admin role first (overrides company permissions)
    if (profile?.role === 'super_admin') {
      const superAdminCapabilities = PERMISSION_LEVEL_CAPABILITIES['super_admin'] || [];
      if (superAdminCapabilities.includes(capability)) {
        return true;
      }
    }

    const permissionLevel = getUserPermissionLevel();
    const capabilities = PERMISSION_LEVEL_CAPABILITIES[permissionLevel] || [];
    return capabilities.includes(capability);
  }, [profile?.role, getUserPermissionLevel]);

  const hasAnyCapability = useCallback((capabilities: string[]): boolean => {
    return capabilities.some(capability => hasCapability(capability));
  }, [hasCapability]);

  const hasAllCapabilities = useCallback((capabilities: string[]): boolean => {
    return capabilities.every(capability => hasCapability(capability));
  }, [hasCapability]);

  const permissionLevel = useMemo(() => 
    profile?.role === 'super_admin' ? 'super_admin' : getUserPermissionLevel(),
    [profile?.role, getUserPermissionLevel]
  );

  const capabilities = useMemo(() => 
    PERMISSION_LEVEL_CAPABILITIES[permissionLevel] || [],
    [permissionLevel]
  );

  // ✅ Memoize the return object to prevent infinite re-renders
  return useMemo(() => ({
    hasCapability,
    hasAnyCapability,
    hasAllCapabilities,
    permissionLevel,
    capabilities
  }), [hasCapability, hasAnyCapability, hasAllCapabilities, permissionLevel, capabilities]);
};
