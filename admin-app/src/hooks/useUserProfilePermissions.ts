
import { usePeopleManagement } from '@/hooks/usePeopleManagement';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { CompanyUser } from '@/types/companyUser';
import { logger } from '@/utils/logger';

interface UseUserProfilePermissionsProps {
  user: CompanyUser | null;
}

export const useUserProfilePermissions = ({ user }: UseUserProfilePermissionsProps) => {
  const { currentUserId, hasManagerAccess, isSuperAdmin } = usePeopleManagement();
  const { currentCompany } = useMultiCompanyAccess();

  logger.log('🔍 useUserProfilePermissions: Checking permissions:', {
    targetUser: user?.full_name,
    targetUserId: user?.id,
    targetUserRole: user?.role,
    targetUserAccessType: user?.access_type,
    currentUserId,
    hasManagerAccess,
    isSuperAdmin,
    isEditingSelf: currentUserId === user?.id,
    currentCompanyId: currentCompany?.id
  });

  // Role editing permissions - only for direct users and not self
  const canEditRole = hasManagerAccess && currentUserId !== user?.id && user?.access_type === 'direct';
  
  // Team editing permissions - more permissive approach
  // Managers can edit teams for all users in their company, including themselves
  // Super admins can edit teams for anyone
  // Users with manager access can manage team assignments
  const canEditTeams = hasManagerAccess || isSuperAdmin;
  
  // Overall editing capability - can edit if any specific permission is granted
  const canEdit = canEditRole || canEditTeams;

  logger.log('🔍 useUserProfilePermissions: Permission results:', {
    canEdit,
    canEditRole,
    canEditTeams,
    reasoning: {
      canEditRole: `hasManagerAccess(${hasManagerAccess}) && notSelf(${currentUserId !== user?.id}) && directAccess(${user?.access_type === 'direct'})`,
      canEditTeams: `hasManagerAccess(${hasManagerAccess}) || isSuperAdmin(${isSuperAdmin})`
    }
  });

  return {
    canEdit,
    canEditRole,
    canEditTeams,
    currentUserId,
    hasManagerAccess,
    isSuperAdmin
  };
};
