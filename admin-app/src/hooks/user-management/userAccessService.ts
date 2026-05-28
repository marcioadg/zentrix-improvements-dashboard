
import { UnifiedUser } from '@/hooks/useUserManagement';

// Centralized access control logic
export const hasManagerAccess = (
  profile: any,
  currentCompany: any,
  userId: string | undefined,
  users: UnifiedUser[],
  queryClient: any,
  queryKey: any[]
): boolean => {
  if (!profile || !currentCompany || !userId) {
    return false;
  }

  // Get current users data to check for super admin access
  const currentUsers = (queryClient.getQueryData(queryKey) as UnifiedUser[]) || [];
  const currentUserData = currentUsers.find(u => u.user_id === userId);
  
  // Check for super admin permission level
  if (currentUserData?.permission_level === 'super_admin') {
    return true;
  }

  // Check for manager-level access in current company
  if (currentUserData) {
    const managerRoles = ['manager', 'director', 'admin', 'owner', 'super_admin'];
    const hasCompanyManagerRole = managerRoles.includes(currentUserData.permission_level);
    if (hasCompanyManagerRole) {
      return true;
    }
  }
  // Default: no manager access
  return false;
};

// Role hierarchy validation
export const validateRoleHierarchy = (
  requestingUserRole: string,
  targetUserRole: string
): boolean => {
  const roleHierarchy = {
    'view-only': 1,
    'member': 2,
    'manager': 3,
    'director': 4,
    'admin': 5,
    'owner': 6,
    'super_admin': 7
  };

  const requestingLevel = roleHierarchy[requestingUserRole as keyof typeof roleHierarchy] || 0;
  const targetLevel = roleHierarchy[targetUserRole as keyof typeof roleHierarchy] || 0;

  return requestingLevel > targetLevel;
};
