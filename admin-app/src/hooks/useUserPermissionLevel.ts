import { useMemo } from 'react';
import { useUserManagement } from '@/hooks/useUserManagement';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { UIPermissionLevel, hasManagerAccess, hasDirectorAccess } from '@/utils/permissionMapping';

export interface UserPermissionInfo {
  permissionLevel: UIPermissionLevel | null;
  hasManagerAccess: boolean;
  hasDirectorAccess: boolean;
  isSuperAdmin: boolean;
  isDirector: boolean;
  isManager: boolean;
}

export const useUserPermissionLevel = (userId?: string): UserPermissionInfo => {
  const { users } = useUserManagement();
  const { currentCompany } = useMultiCompanyAccess();

  return useMemo(() => {
    if (!currentCompany?.id || !userId || !users.length) {
      return {
        permissionLevel: null,
        hasManagerAccess: false,
        hasDirectorAccess: false,
        isSuperAdmin: false,
        isDirector: false,
        isManager: false,
      };
    }

    // Find user in company users list
    const userInCompany = users.find(u => u.user_id === userId);
    const permissionLevel = userInCompany?.permission_level as UIPermissionLevel || null;

    if (!permissionLevel) {
      return {
        permissionLevel: null,
        hasManagerAccess: false,
        hasDirectorAccess: false,
        isSuperAdmin: false,
        isDirector: false,
        isManager: false,
      };
    }

    return {
      permissionLevel,
      hasManagerAccess: hasManagerAccess(permissionLevel),
      hasDirectorAccess: hasDirectorAccess(permissionLevel),
      isSuperAdmin: permissionLevel === 'super_admin',
      isDirector: permissionLevel === 'director',
      isManager: permissionLevel === 'manager',
    };
  }, [currentCompany?.id, userId, users]);
};

// Hook for current user's permission level
export const useCurrentUserPermissionLevel = (): UserPermissionInfo => {
  const { currentUserId } = useUserManagement();
  return useUserPermissionLevel(currentUserId);
};