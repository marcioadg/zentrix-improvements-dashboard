import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useUserCapabilities } from '@/hooks/useUserCapabilities';
import { logger } from '@/utils/logger';

export const useGoalsPermissions = (teamId?: string) => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompanyAccess();
  const { members: teamMembers } = useTeamMembers(teamId || '');
  const { hasCapability, permissionLevel } = useUserCapabilities();

  const permissionData = useMemo(() => {
    if (!user?.id || !currentCompany?.id) {
      return {
        isAuthenticated: false,
        userRole: null,
        isTeamMember: false,
        teamMemberIds: []
      };
    }

    const teamMember = teamMembers?.find(member => member.user_id === user.id);
    const isTeamMember = !!teamMember;
    const teamMemberIds = teamMembers?.map(member => member.user_id) || [];

    return {
      isAuthenticated: true,
      userRole: permissionLevel,
      isTeamMember,
      teamMemberIds
    };
  }, [user?.id, currentCompany?.id, teamId, teamMembers, permissionLevel]);

  const canEditGoal = (goal: any) => {
    const { isAuthenticated } = permissionData;
    
    if (!isAuthenticated) return false;

    // View-Only users cannot edit goals
    if (permissionLevel === 'view-only') return false;

    // Goal owner can always edit their own goal
    if (goal.owner_id === user?.id) return true;

    // Any team member can edit team goals (this is the key change)
    if (permissionData.isTeamMember) {
      return true;
    }

    // Users with manage_metrics capability can edit goals
    if (hasCapability('manage_metrics')) return true;

    return false;
  };

  const canEditMilestone = (goal: any, milestone: any) => {
    const { isAuthenticated } = permissionData;
    
    logger.log('🔑 Checking milestone edit permissions:', {
      isAuthenticated,
      permissionLevel,
      isTeamMember: permissionData.isTeamMember,
      goalId: goal?.id,
      milestoneId: milestone?.id
    });
    
    if (!isAuthenticated) return false;

    // View-Only users cannot edit milestones
    if (permissionLevel === 'view-only') return false;

    // Use same logic as goal editing for consistency
    const canEdit = canEditGoal(goal);
    logger.log('🔑 Can edit milestone result:', canEdit);
    return canEdit;
  };

  const canCreateGoals = () => {
    const { isAuthenticated } = permissionData;
    
    if (!isAuthenticated) return false;

    // View-Only users cannot create goals
    if (permissionLevel === 'view-only') return false;

    // Team members and above can create goals
    return permissionData.isTeamMember;
  };

  const canManageGoals = () => {
    const { isAuthenticated } = permissionData;
    
    if (!isAuthenticated) return false;

    // Managers and above can manage all team goals
    return ['manager', 'director', 'admin', 'owner', 'super_admin'].includes(permissionLevel || '');
  };

  return {
    canEditGoal,
    canEditMilestone,
    canCreateGoals,
    canManageGoals,
    permissionData,
  };
};