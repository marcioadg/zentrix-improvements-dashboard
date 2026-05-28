
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface UserRole {
  role: string;
  level: 'executive' | 'manager' | 'member';
  permissions: {
    canViewCrossTeamData: boolean;
    canViewFinancialMetrics: boolean;
    canViewStrategicInsights: boolean;
    canAccessConstraintAnalysis: boolean;
  };
}

export const getUserRoleInCompany = async (userId: string, companyId: string): Promise<UserRole> => {
  try {
    // Get user's role in the company
    const { data: companyMember } = await supabase
      .from('company_members')
      .select('permission_level')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .single();

    // Get user's team roles in this company
    const { data: teamRoles } = await supabase
      .from('team_members')
      .select(`
        teams!inner(company_id, is_leadership)
      `)
      .eq('user_id', userId)
      .eq('teams.company_id', companyId);

    // Determine user level and permissions
    const companyRole = companyMember?.permission_level || 'member';
    const hasLeadershipRole = teamRoles?.some(tr => 
      (tr.teams as any)?.is_leadership
    );

    let level: 'executive' | 'manager' | 'member' = 'member';
    
    if (companyRole === 'director') {
      level = 'executive';
    } else if (companyRole === 'manager' || hasLeadershipRole) {
      level = 'manager';
    }

    const permissions = {
      canViewCrossTeamData: level === 'executive' || level === 'manager',
      canViewFinancialMetrics: level === 'executive',
      canViewStrategicInsights: level === 'executive' || level === 'manager',
      canAccessConstraintAnalysis: level === 'executive'
    };

    return {
      role: companyRole,
      level,
      permissions
    };
  } catch (error) {
    logger.error('Error getting user role in company:', error);
    return {
      role: 'member',
      level: 'member',
      permissions: {
        canViewCrossTeamData: false,
        canViewFinancialMetrics: false,
        canViewStrategicInsights: false,
        canAccessConstraintAnalysis: false
      }
    };
  }
};

export const getAccessibleTeamsForUser = async (userId: string, companyId: string, userRole: UserRole): Promise<string[]> => {
  try {
    if (userRole.permissions.canViewCrossTeamData) {
      // Executives and managers can see all teams in the company
      const { data: teams } = await supabase
        .from('teams')
        .select('id')
        .eq('company_id', companyId);
      
      return teams?.map(t => t.id) || [];
    } else {
      // Regular members can only see their own teams
      const { data: userTeams } = await supabase
        .from('team_members')
        .select('team_id, teams!inner(company_id)')
        .eq('user_id', userId)
        .eq('teams.company_id', companyId);
      
      return userTeams?.map(ut => ut.team_id) || [];
    }
  } catch (error) {
    logger.error('Error getting accessible teams:', error);
    return [];
  }
};
