
import { UnifiedUser } from '@/hooks/useUserManagement';

// Transform user data functions
export const transformUserData = (users: any[], companyId: string): UnifiedUser[] => {
  return users.map(user => ({
    user_id: user.user_id,
    id: user.user_id, // Alias for compatibility
    email: user.email,
    full_name: user.full_name,
    avatar_url: user.avatar_url,
    role: user.role,
    permission_level: user.permission_level,
    capabilities: user.capabilities || [],
    joined_at: user.joined_at,
    created_at: user.joined_at, // Use joined_at for created_at compatibility
    email_confirmed_at: user.email_confirmed_at,
    access_type: 'direct' as const,
    company_memberships: [{
      company_id: companyId,
      permission_level: user.permission_level
    }],
    primary_company_id: companyId
  }));
};

// Permission validation helpers
export const validatePermissionUpdate = (
  userId: string,
  newRole: string,
  currentUserId: string | undefined
): { isValid: boolean; error?: string } => {
  const validRoles = ['view-only', 'member', 'manager', 'director', 'super_admin'];
  
  if (!validRoles.includes(newRole)) {
    return { 
      isValid: false, 
      error: 'The selected role is not valid' 
    };
  }

  if (userId === currentUserId) {
    return { 
      isValid: false, 
      error: 'You cannot modify your own role' 
    };
  }

  return { isValid: true };
};

// Data formatting utilities
export const formatUserForDisplay = (user: UnifiedUser) => {
  return {
    ...user,
    displayName: user.full_name || user.email,
    isActive: !!user.email_confirmed_at,
    roleDisplay: user.permission_level.charAt(0).toUpperCase() + user.permission_level.slice(1)
  };
};

// Query key generators
export const getUserQueryKey = (companyId: string | undefined) => {
  return ['unified-users', companyId];
};

export const getRelatedQueryKeys = () => {
  return [
    ['unified-users'],
    ['company-users'],
    ['userTeams'],
    ['teams'],
    ['team-management'],
    ['team-members'],
    ['optimized-user-teams'],
    ['company-members']
  ];
};
