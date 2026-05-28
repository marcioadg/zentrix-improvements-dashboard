import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { CompanyUser } from '@/types/companyUser';
import { OrgChartPermissionsService } from '@/services/orgChartPermissionsService';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface OrgChartAnalyzerData {
  subordinateUsers: CompanyUser[];
  hasSubordinates: boolean;
  loading: boolean;
  error: string | null;
  userOrgRole: string | null;
}

export const useOrgChartAnalyzerData = (): OrgChartAnalyzerData => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const [subordinateUsers, setSubordinateUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userOrgRole, setUserOrgRole] = useState<string | null>(null);

  const userId = user?.id;
  const companyId = currentCompany?.id;

  const loadSubordinateUsers = useCallback(async () => {
    if (!userId || !companyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      logger.log('🏢 OrgChartAnalyzer: Loading subordinate users for:', userId);

      // Get user's org chart role assignment
      const { data: userRoleAssignment, error: roleError } = await supabase
        .from('role_assignments')
        .select(`
          role_id,
          org_role:org_roles!inner(
            id,
            title,
            company_id
          )
        `)
        .eq('user_id', userId);

      if (roleError) {
        logger.error('Error fetching user role assignment:', roleError);
        setError('Failed to load org chart data');
        return;
      }

      if (!userRoleAssignment || userRoleAssignment.length === 0) {
        logger.log('🏢 OrgChartAnalyzer: User has no org chart role assignment');
        setSubordinateUsers([]);
        setUserOrgRole(null);
        return;
      }

      // Filter for roles in the current company
      const companyRoles = userRoleAssignment.filter(assignment => {
        const orgRole = Array.isArray(assignment.org_role) ? assignment.org_role[0] : assignment.org_role;
        return orgRole?.company_id === companyId;
      });

      if (companyRoles.length === 0) {
        logger.log('🏢 OrgChartAnalyzer: User has no org chart role in current company');
        setSubordinateUsers([]);
        setUserOrgRole(null);
        return;
      }

      const orgRole = Array.isArray(companyRoles[0].org_role) ? companyRoles[0].org_role[0] : companyRoles[0].org_role;
      const userOrgRoleId = orgRole?.id;
      const userRoleTitle = orgRole?.title;

      setUserOrgRole(userRoleTitle || null);

      if (!userOrgRoleId) {
        logger.log('🏢 OrgChartAnalyzer: Invalid org role data');
        setSubordinateUsers([]);
        return;
      }

      logger.log('🏢 OrgChartAnalyzer: User org role:', userRoleTitle, 'ID:', userOrgRoleId);

      // Get all subordinate roles (direct and indirect reports)
      const subordinateRoles = await OrgChartPermissionsService.getSubordinateRoles(userOrgRoleId, companyId);
      
      logger.log('🏢 OrgChartAnalyzer: Found subordinate roles:', subordinateRoles.length);

      if (subordinateRoles.length === 0) {
        setSubordinateUsers([]);
        return;
      }

      // Get user IDs assigned to subordinate roles
      const subordinateRoleIds = subordinateRoles.map(role => role.id);
      const subordinateUserIds = await OrgChartPermissionsService.getUsersForRoles(subordinateRoleIds);

      logger.log('🏢 OrgChartAnalyzer: Found subordinate user IDs:', subordinateUserIds.length);

      if (subordinateUserIds.length === 0) {
        setSubordinateUsers([]);
        return;
      }

      // Fetch full user data for subordinates using the existing RPC
      const { data: usersData, error: usersError } = await supabase
        .rpc('get_company_accessible_users', {
          target_company_id: companyId,
          include_inactive: true
        });

      if (usersError) {
        logger.error('Error fetching users data:', usersError);
        setError('Failed to load user data');
        return;
      }

      // Filter to only include subordinate users
      const filteredSubordinates = (usersData || []).filter((user: CompanyUser) => 
        subordinateUserIds.includes(user.id)
      );

      logger.log('🏢 OrgChartAnalyzer: Final subordinate users:', filteredSubordinates.length);
      setSubordinateUsers(filteredSubordinates);

    } catch (err) {
      logger.error('Error loading subordinate users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load org chart data');
    } finally {
      setLoading(false);
    }
  }, [userId, companyId]);

  useEffect(() => {
    loadSubordinateUsers();
  }, [loadSubordinateUsers]);

  const hasSubordinates = subordinateUsers.length > 0;

  return {
    subordinateUsers,
    hasSubordinates,
    loading,
    error,
    userOrgRole,
  };
};