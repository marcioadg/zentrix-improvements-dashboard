
import { type UIPermissionLevel } from '@/utils/permissionMapping';
import { logger } from '@/utils/logger';

// Define role hierarchy levels (higher number = higher authority)
const ROLE_HIERARCHY: Record<UIPermissionLevel, number> = {
  'inactive': -1,
  'view-only': 0,
  'member': 1,
  'manager': 2,
  'director': 3,
  'super_admin': 4
};

/**
 * Check if a user can manage another user's password based on role hierarchy
 */
export const canManageUserPassword = (
  managerRole: UIPermissionLevel,
  targetRole: UIPermissionLevel,
  managerId: string,
  targetId: string
): boolean => {
  logger.log('🔐 canManageUserPassword: Checking permissions:', {
    managerRole,
    targetRole,
    managerId,
    targetId,
    isSameUser: managerId === targetId
  });

  // Users can always manage their own password
  if (managerId === targetId) {
    logger.log('✅ canManageUserPassword: Same user - allowing');
    return true;
  }

  // Get hierarchy levels
  const managerLevel = ROLE_HIERARCHY[managerRole] || 0;
  const targetLevel = ROLE_HIERARCHY[targetRole] || 0;

  logger.log('🔐 canManageUserPassword: Role levels:', {
    managerRole,
    managerLevel,
    targetRole,
    targetLevel,
    managerLevelRequired: ROLE_HIERARCHY.manager,
    canManage: managerLevel >= ROLE_HIERARCHY.manager && managerLevel > targetLevel
  });

  // Super admin can manage anyone's password
  if (managerRole === 'super_admin') {
    logger.log('✅ canManageUserPassword: Super admin - allowing all');
    return true;
  }

  // Manager must be at least 'manager' level and higher than target
  // Updated to include 'director' as a manager-level role
  const canManage = managerLevel >= ROLE_HIERARCHY.manager && managerLevel > targetLevel;
  
  if (canManage) {
    logger.log('✅ canManageUserPassword: Permission granted');
  } else {
    logger.log('❌ canManageUserPassword: Permission denied');
  }
  
  return canManage;
};

/**
 * Check if a user has manager-level access or above
 */
export const hasManagerAccess = (role: UIPermissionLevel): boolean => {
  const userLevel = ROLE_HIERARCHY[role] || 0;
  return userLevel >= ROLE_HIERARCHY.manager;
};

/**
 * Get the role hierarchy level for a given role
 */
export const getRoleLevel = (role: UIPermissionLevel): number => {
  return ROLE_HIERARCHY[role] || 0;
};

/**
 * Check if one role is higher than another in the hierarchy
 */
export const isRoleHigher = (role1: UIPermissionLevel, role2: UIPermissionLevel): boolean => {
  return getRoleLevel(role1) > getRoleLevel(role2);
};
