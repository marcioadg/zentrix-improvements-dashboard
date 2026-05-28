
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface OrgChartRole {
  id: string;
  title: string;
  reports_to_role_id: string | null;
  user_id?: string;
}

export interface UserOrgPermissions {
  canSeeUserIds: string[];
  userRole?: OrgChartRole;
}

export class OrgChartPermissionsService {
  /**
   * Get the user's assigned role in the org chart
   */
  static async getUserOrgRole(userId: string, companyId: string): Promise<OrgChartRole | null> {
    try {
      const { data: roleAssignment, error } = await supabase
        .from('role_assignments')
        .select(`
          role_id,
          org_roles!inner(
            id,
            title,
            reports_to_role_id,
            company_id
          )
        `)
        .eq('user_id', userId)
        .eq('org_roles.company_id', companyId)
        .maybeSingle();

      if (error) {
        logger.log('🔍 OrgChart Permissions: Error fetching org role (table may not exist):', error.message);
        return null;
      }

      if (!roleAssignment?.org_roles) return null;

    // Fix array access for org_roles relationship
    const orgRolesArray = Array.isArray(roleAssignment.org_roles) ? roleAssignment.org_roles : [roleAssignment.org_roles];
    const orgRole = orgRolesArray?.[0];
    
    if (!orgRole) return null;

    return {
      id: orgRole.id,
      title: orgRole.title,
      reports_to_role_id: orgRole.reports_to_role_id,
      user_id: userId,
    };
    } catch (error) {
      logger.log('🔍 OrgChart Permissions: Exception fetching org role:', error);
      return null;
    }
  }

  /**
   * Get all roles that report to a given role (direct and indirect)
   */
  static async getSubordinateRoles(roleId: string, companyId: string): Promise<OrgChartRole[]> {
    const allRoles: OrgChartRole[] = [];
    const visited = new Set<string>();
    
    // Get all roles for the company first
    const { data: companyRoles } = await supabase
      .from('org_roles')
      .select('id, title, reports_to_role_id')
      .eq('company_id', companyId);

    if (!companyRoles) return [];

    // Build a map for efficient lookups
    const roleMap = new Map(companyRoles.map(role => [role.id, role]));

    // Recursive function to find all subordinates
    const findSubordinates = (currentRoleId: string) => {
      if (visited.has(currentRoleId)) return;
      visited.add(currentRoleId);

      for (const role of companyRoles) {
        if (role.reports_to_role_id === currentRoleId && !visited.has(role.id)) {
          allRoles.push({
            id: role.id,
            title: role.title,
            reports_to_role_id: role.reports_to_role_id,
          });
          findSubordinates(role.id);
        }
      }
    };

    findSubordinates(roleId);
    return allRoles;
  }

  /**
   * Get users assigned to specific roles
   */
  static async getUsersForRoles(roleIds: string[]): Promise<string[]> {
    if (roleIds.length === 0) return [];

    const { data: assignments } = await supabase
      .from('role_assignments')
      .select('user_id')
      .in('role_id', roleIds);

    return assignments?.map(a => a.user_id) || [];
  }

  /**
   * Get all roles that are above a given role in the hierarchy (managers, their managers, etc.)
   */
  static async getManagerHierarchy(roleId: string, companyId: string): Promise<OrgChartRole[]> {
    const managersAbove: OrgChartRole[] = [];
    const visited = new Set<string>();
    
    // Get all roles for the company first
    const { data: companyRoles } = await supabase
      .from('org_roles')
      .select('id, title, reports_to_role_id')
      .eq('company_id', companyId);

    if (!companyRoles) return [];

    // Build a map for efficient lookups
    const roleMap = new Map(companyRoles.map(role => [role.id, role]));

    // Recursive function to find all managers above
    const findManagersAbove = (currentRoleId: string) => {
      if (visited.has(currentRoleId)) return;
      visited.add(currentRoleId);

      const currentRole = roleMap.get(currentRoleId);
      if (!currentRole || !currentRole.reports_to_role_id) return;

      const managerRole = roleMap.get(currentRole.reports_to_role_id);
      if (managerRole && !visited.has(managerRole.id)) {
        managersAbove.push({
          id: managerRole.id,
          title: managerRole.title,
          reports_to_role_id: managerRole.reports_to_role_id,
        });
        findManagersAbove(managerRole.id);
      }
    };

    findManagersAbove(roleId);
    return managersAbove;
  }

  /**
   * Get all user IDs that a given user can see based on org chart hierarchy,
   * excluding anyone above them in the hierarchy
   */
  static async getUserVisiblePeopleWithHierarchy(userId: string, companyId: string): Promise<UserOrgPermissions> {
    logger.log('🔍 OrgChart Permissions: Getting visible people with hierarchy for user:', userId, 'in company:', companyId);

    // Get user's role in org chart
    const userRole = await this.getUserOrgRole(userId, companyId);
    logger.log('🔍 OrgChart Permissions: User role found:', userRole);

    if (!userRole) {
      // No org chart role found, fallback to permission-level based visibility
      logger.log('🔍 OrgChart Permissions: No org role found, falling back to permission-level visibility');
      return this.getUserVisiblePeopleByPermissionLevel(userId, companyId);
    }

    // Get all subordinate roles
    const subordinateRoles = await this.getSubordinateRoles(userRole.id, companyId);
    logger.log('🔍 OrgChart Permissions: Found subordinate roles:', subordinateRoles.length);

    // Get users assigned to subordinate roles
    const subordinateRoleIds = subordinateRoles.map(role => role.id);
    const subordinateUserIds = await this.getUsersForRoles(subordinateRoleIds);
    logger.log('🔍 OrgChart Permissions: Found subordinate users:', subordinateUserIds.length);

    // Get manager hierarchy to exclude superiors
    const superiorRoles = await this.getManagerHierarchy(userRole.id, companyId);
    const superiorUserIds = await this.getUsersForRoles(superiorRoles.map(role => role.id));
    logger.log('🔍 OrgChart Permissions: Found superior users to exclude:', superiorUserIds.length);

    // Include the user themselves + all their subordinates, then remove any superiors
    // (This handles edge cases where someone might be both in subordinates and superiors due to data issues)
    const preliminaryUserIds = [userId, ...subordinateUserIds];
    const canSeeUserIds = preliminaryUserIds.filter(id => !superiorUserIds.includes(id) || id === userId);
    
    logger.log('🔍 OrgChart Permissions: Final visible user count:', canSeeUserIds.length);

    return {
      canSeeUserIds,
      userRole,
    };
  }

  /**
   * Get all user IDs that a given user can see based on permission levels when no org chart exists
   */
  static async getUserVisiblePeopleByPermissionLevel(userId: string, companyId: string): Promise<UserOrgPermissions> {
    logger.log('🔍 OrgChart Permissions: Using permission-level based visibility for user:', userId);

    // Get current user's permission level
    const { data: currentUserMember } = await supabase
      .from('company_members')
      .select('permission_level')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .eq('status', 'active')
      .single();

    if (!currentUserMember) {
      logger.log('🔍 OrgChart Permissions: User not found in company members');
      return { canSeeUserIds: [userId], userRole: undefined };
    }

    const userPermissionLevel = currentUserMember.permission_level;
    logger.log('🔍 OrgChart Permissions: User permission level:', userPermissionLevel);

    // Define hierarchy levels (higher number = higher permission)
    const permissionHierarchy: Record<string, number> = {
      'view-only': 1,
      'member': 2,
      'manager': 3,
      'director': 4,
      'super_admin': 5
    };

    const userLevel = permissionHierarchy[userPermissionLevel] || 2;

    // Get all company members
    const { data: allMembers } = await supabase
      .from('company_members')
      .select('user_id, permission_level')
      .eq('company_id', companyId)
      .eq('status', 'active');

    if (!allMembers) {
      logger.log('🔍 OrgChart Permissions: No company members found');
      return { canSeeUserIds: [userId], userRole: undefined };
    }

    // Apply visibility rules based on permission level
    let visibleUserIds: string[] = [];

    if (userPermissionLevel === 'super_admin') {
      // Super admins can see everyone
      visibleUserIds = allMembers.map(m => m.user_id);
      logger.log('🔍 OrgChart Permissions: Super admin - can see all users:', visibleUserIds.length);
    } else if (userPermissionLevel === 'director') {
      // Directors can see everyone except super_admins
      visibleUserIds = allMembers
        .filter(m => m.permission_level !== 'super_admin')
        .map(m => m.user_id);
      logger.log('🔍 OrgChart Permissions: Director - can see all except super_admins:', visibleUserIds.length);
    } else if (userPermissionLevel === 'manager') {
      // Managers can only see team members (excluding directors and super_admins)
      logger.log('🔍 OrgChart Permissions: Manager - applying team-based visibility');
      
      // Get teams that the manager belongs to
      const { data: managerTeams } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId);
      
      if (managerTeams && managerTeams.length > 0) {
        const teamIds = managerTeams.map(tm => tm.team_id);
        
        // Get all team members from manager's teams
        const { data: teamMembers } = await supabase
          .from('team_members')
          .select('user_id')
          .in('team_id', teamIds);
        
        if (teamMembers) {
          const teamMemberIds = teamMembers.map(tm => tm.user_id);
          
          // Filter out directors and super_admins from team members
          visibleUserIds = allMembers
            .filter(m => {
              return teamMemberIds.includes(m.user_id) && 
                     !['director', 'super_admin'].includes(m.permission_level);
            })
            .map(m => m.user_id);
        } else {
          visibleUserIds = [userId]; // Fallback to self-only
        }
      } else {
        visibleUserIds = [userId]; // No teams, can only see self
      }
      
      logger.log('🔍 OrgChart Permissions: Manager - can see team members (excluding directors/super_admins):', visibleUserIds.length);
    } else {
      // Members and view-only users can only see themselves for now
      // (This can be expanded later if needed)
      visibleUserIds = [userId];
      logger.log('🔍 OrgChart Permissions: Member/View-only - can only see themselves');
    }

    return {
      canSeeUserIds: visibleUserIds,
      userRole: undefined,
    };
  }

  /**
   * Get all user IDs that a given user can see based on org chart hierarchy (original method for compatibility)
   */
  static async getUserVisiblePeople(userId: string, companyId: string): Promise<UserOrgPermissions> {
    return this.getUserVisiblePeopleWithHierarchy(userId, companyId);
  }
}
