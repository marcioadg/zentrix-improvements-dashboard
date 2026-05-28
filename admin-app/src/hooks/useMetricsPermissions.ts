
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useMemo } from 'react';
import { useUserCapabilities } from '@/hooks/useUserCapabilities';
import { logger } from '@/utils/logger';

export const useMetricsPermissions = (teamId?: string, meetingRole?: 'scriber' | 'participant' | null) => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const { members: teamMembers } = useTeamMembers(teamId || '');
  const { hasCapability, permissionLevel } = useUserCapabilities();

  // Enhanced permission checking with team-level access
  const permissionData = useMemo(() => {
    const isAuthenticated = !!(user && currentCompany);
    
    if (!isAuthenticated) {
      logger.log('🔍 useMetricsPermissions: No access - not authenticated');
      return {
        isAuthenticated: false,
        userRole: null,
        teamRole: null,
        isTeamMember: false,
        teamMemberIds: []
      };
    }

    // Find current user's role in the team
    const currentUserTeamMembership = teamMembers.find(member => member.user_id === user.id);
    // Team roles deprecated - all team members have equal permissions now
    const teamRole = 'member';
    const isTeamMember = !!currentUserTeamMembership;
    
    // Get all team member user IDs for permission checks
    const teamMemberIds = teamMembers.map(member => member.user_id);

    // Reduced logging frequency to prevent performance issues
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
      logger.log('🔍 useMetricsPermissions: Permission data calculated:', {
        userId: user.id,
        teamId,
        isTeamMember,
        teamRole,
        meetingRole,
        teamMembersCount: teamMembers.length,
        teamMemberIds: teamMemberIds.length
      });
    }

    return {
      isAuthenticated: true,
      userRole: permissionLevel || 'member',
      teamRole,
      isTeamMember,
      teamMemberIds
    };
  }, [user?.id, currentCompany?.id, teamId, teamMembers, permissionLevel]);

  return useMemo(() => {
    const canChangeMetricOwner = (metric: any) => {
      const { isAuthenticated } = permissionData;
      if (!isAuthenticated) return false;
      if (permissionLevel === 'view-only') return false;
      return hasCapability('manage_metrics');
    };

    const canEditMetricValue = (metric: any) => {
      const { isAuthenticated } = permissionData;
      if (!isAuthenticated) return false;
      if (permissionLevel === 'view-only') return false;
      if (meetingRole === 'scriber') return true;
      if (!hasCapability('edit_metrics')) return false;
      return true;
    };

    const canEditMetric = (metric: any) => canEditMetricValue(metric);

    const canManageMetrics = () => {
      const { isAuthenticated } = permissionData;
      if (!isAuthenticated) return false;
      if (permissionLevel === 'view-only') return false;
      return hasCapability('manage_metrics');
    };

    const canCreateMetrics = () => {
      const { isAuthenticated } = permissionData;
      if (!isAuthenticated) return false;
      if (permissionLevel === 'view-only') return false;
      return hasCapability('edit_metrics');
    };

    const canDeleteMetrics = () => canManageMetrics();

    return {
      canManageMetrics,
      canEditMetricValue,
      canEditMetric,
      canChangeMetricOwner,
      canCreateMetrics,
      canDeleteMetrics,
    };
  }, [permissionData, permissionLevel, meetingRole, hasCapability, user?.id]);
};
