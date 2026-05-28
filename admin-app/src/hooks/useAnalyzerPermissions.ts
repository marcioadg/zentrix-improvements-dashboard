
import { useMemo, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { CompanyUser } from '@/types/companyUser';
import { OrgChartPermissionsService, UserOrgPermissions } from '@/services/orgChartPermissionsService';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface PersonVisibility {
  userId: string;
  visibilityLabel: string;
  visibleToCount: number;
  visiblePeople?: Array<{ name: string; role: string }>;
  directManager?: {
    name: string;
    role: string;
  };
}

export const useAnalyzerPermissions = (users: CompanyUser[]) => {
  logger.log('🔍 useAnalyzerPermissions: Hook called with users count:', users.length);
  const { user } = useAuth();
  const { profile } = useProfile();
  const { currentCompany } = useMultiCompany();
  const [orgPermissions, setOrgPermissions] = useState<UserOrgPermissions | null>(null);
  const [peopleVisibility, setPeopleVisibility] = useState<PersonVisibility[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Version tracking to synchronize user list changes with permission calculations
  // This prevents flickering by ensuring filtered list only appears after permissions are resolved
  const [usersVersion, setUsersVersion] = useState(0);
  const [permissionsForVersion, setPermissionsForVersion] = useState(-1);

  // Stable references for expensive calculations
  const userId = useMemo(() => user?.id, [user?.id]);
  const companyId = useMemo(() => currentCompany?.id, [currentCompany?.id]);
  const usersArray = useMemo(() => users, [users]);
  
  // Increment version when users array changes to trigger re-sync
  useEffect(() => {
    setUsersVersion(v => v + 1);
    logger.log('🔍 useAnalyzerPermissions: Users changed, incrementing version');
  }, [usersArray]);
  
  // Get user's permission level from company membership
  const userRole = useMemo(() => {
    if (!userId || !companyId || !usersArray.length) return null;
    const currentUserData = usersArray.find(u => u.id === userId);
    return currentUserData?.permission_level || null;
  }, [userId, companyId, usersArray]);

  // Block access for members and view-only users
  useEffect(() => {
    if (userRole && ['member', 'view-only'].includes(userRole)) {
      logger.log('🔍 useAnalyzerPermissions: Member/View-only user detected, blocking access');
      setOrgPermissions({
        canSeeUserIds: [],
        userRole: undefined,
      });
      setPeopleVisibility([]);
      setLoading(false);
      return;
    }
  }, [userRole]);

  // Memoized visibility calculation function
  const calculateImprovedPeopleVisibility = useCallback(async (
    people: CompanyUser[],
    companyId: string,
    isSuperAdminView: boolean,
    currentUserId: string,
    subordinateUserIds: string[] = [],
    companyMembers: {user_id: string, permission_level: string}[] = [],
    prefetchedOrgRoles: any[] = []
  ): Promise<PersonVisibility[]> => {
    const visibility: PersonVisibility[] = [];

    // Use pre-fetched company member permissions instead of querying again
    const userPermissions = new Map(
      companyMembers.map(cm => [cm.user_id, cm.permission_level])
    );

    // Use pre-fetched org roles instead of querying again
    const orgRoles = prefetchedOrgRoles;

    // Create maps for efficient lookups
    const roleMap = new Map(orgRoles?.map(role => [role.id, role]) || []);
    const userToRoleMap = new Map();
    
    // Build user to role mapping
    orgRoles?.forEach(role => {
      role.assignments?.forEach(assignment => {
        if (assignment.profile) {
          const profileArray = Array.isArray(assignment.profile) ? assignment.profile : [assignment.profile];
          const profile = profileArray?.[0];
          
          if (profile) {
            const roleInfo = {
              roleId: role.id,
              roleTitle: role.title,
              reportsToRoleId: role.reports_to_role_id
            };
            userToRoleMap.set(assignment.user_id, roleInfo);
            
            logger.log('🔍 User to Role Mapping:', {
              userId: assignment.user_id,
              userName: profile.full_name,
              roleInfo
            });
          }
        }
      });
    });

    for (const person of people) {
      // Skip self - we don't calculate visibility for the current user
      if (person.id === currentUserId) {
        continue;
      }

      let visibleToCount = 0;
      let directManager: { name: string; role: string } | undefined;
      let visibilityLabel = '';
      const visiblePeople: Array<{ name: string; role: string }> = [];

      // Helper function to format names as "FirstName L."
      const formatName = (fullName: string): string => {
        const parts = fullName.trim().split(' ');
        if (parts.length === 1) return parts[0];
        const firstName = parts[0];
        const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
        return `${firstName} ${lastInitial}.`;
      };

      // Check if the current user can see this person based on org hierarchy
      const currentUserOrgInfo = userToRoleMap.get(currentUserId);
      const personOrgInfo = userToRoleMap.get(person.id);
      
      logger.log('🔍 Hierarchical Visibility Check:', {
        currentUserId,
        currentUserRole: currentUserOrgInfo?.roleTitle,
        personId: person.id,
        personName: person.full_name,
        personRole: personOrgInfo?.roleTitle
      });

      // Helper function to check if current user is above person in hierarchy (recursive)
      const isCurrentUserAbovePerson = (personRoleId: string): boolean => {
        if (!currentUserOrgInfo?.roleId) return false;
        
        // Helper function to recursively check if user role is above target role
        const isAboveInTree = (userRoleId: string, targetRoleId: string, visited = new Set<string>()): boolean => {
          if (visited.has(targetRoleId)) return false; // Prevent infinite loops
          visited.add(targetRoleId);
          
          const targetRole = roleMap.get(targetRoleId);
          if (!targetRole) return false;
          
          // Direct match - user is the direct manager
          if (targetRole.reports_to_role_id === userRoleId) {
            return true;
          }
          
          // Recursive check - check if user is above the manager of this role
          if (targetRole.reports_to_role_id) {
            return isAboveInTree(userRoleId, targetRole.reports_to_role_id, visited);
          }
          
          return false;
        };
        
        const canSee = isAboveInTree(currentUserOrgInfo.roleId, personRoleId);
        if (canSee) {
          logger.log('🔍 Hierarchy match found: Current user can see', person.full_name);
        }
        return canSee;
      };

      // Super admins and owners can see everyone
      const isSuperAdmin = userPermissions.get(currentUserId) === 'super_admin' || userPermissions.get(currentUserId) === 'owner';
      
      // Check if current user is above this person in hierarchy
      const isAboveInHierarchy = personOrgInfo?.roleId ? isCurrentUserAbovePerson(personOrgInfo.roleId) : false;
      
      // Current user is at top level (CEO-like) if they have no reports_to_role_id
      const isTopLevel = currentUserOrgInfo && currentUserOrgInfo.reportsToRoleId === null;
      
      // Also check if this person is in the subordinate user IDs we found earlier
      const isInSubordinateList = subordinateUserIds.includes(person.id);

      logger.log('🔍 Visibility Decision Factors:', {
        isSuperAdmin,
        isAboveInHierarchy,
        isTopLevel,
        isInSubordinateList,
        personName: person.full_name,
        personId: person.id
      });

      if (isSuperAdmin || isTopLevel || isAboveInHierarchy || isInSubordinateList) {
        logger.log('🔍 Current user can see', person.full_name, '- adding all relevant managers to visibility list');
        
        // Add all managers and leadership who can also see this person
        const allWhoCanSee = people.filter(u => {
          if (u.id === currentUserId) return false;
          const userOrgInfo = userToRoleMap.get(u.id);
          const permission = userPermissions.get(u.id);
          
          // Include super admins and owners
          if (permission === 'super_admin' || permission === 'owner') return true;
          
          // Include top-level people (CEOs, Presidents, etc.)
          if (userOrgInfo && userOrgInfo.reportsToRoleId === null) return true;
          
          // Include anyone who is above this person in the hierarchy
          if (personOrgInfo?.roleId && userOrgInfo?.roleId) {
            return isUserAbovePersonInHierarchy(userOrgInfo.roleId, personOrgInfo.roleId);
          }
          
          return false;
        });
        
        // Helper function to check if one user is above another in hierarchy
        function isUserAbovePersonInHierarchy(managerRoleId: string, personRoleId: string): boolean {
          let currentRole = roleMap.get(personRoleId);
          const visited = new Set<string>();
          
          while (currentRole && !visited.has(currentRole.id)) {
            visited.add(currentRole.id);
            if (currentRole.reports_to_role_id === managerRoleId) return true;
            currentRole = currentRole.reports_to_role_id ? roleMap.get(currentRole.reports_to_role_id) : null;
          }
          return false;
        }
        
        allWhoCanSee.forEach(manager => {
          visibleToCount++;
          const permission = userPermissions.get(manager.id);
          const managerOrgInfo = userToRoleMap.get(manager.id);
          
          let roleDisplay = 'Manager';
          if (permission === 'super_admin') roleDisplay = 'Super Admin';
          else if (permission === 'owner') roleDisplay = 'Owner';
          else if (permission === 'director') roleDisplay = 'Director';
          else if (managerOrgInfo && managerOrgInfo.reportsToRoleId === null) roleDisplay = managerOrgInfo.roleTitle || 'Executive';
          else if (managerOrgInfo) roleDisplay = managerOrgInfo.roleTitle;
          
          visiblePeople.push({
            name: manager.full_name,
            role: roleDisplay
          });
          
          // Set direct manager if this is a direct report
          if (!directManager && managerOrgInfo?.roleId === personOrgInfo?.reportsToRoleId) {
            directManager = {
              name: manager.full_name,
              role: roleDisplay
            };
          }
        });
      } else {
        // For users who can't see this person through hierarchy, use existing team-based logic
        logger.log('🔍 Using team-based visibility for', person.full_name);
        
        // Super admins and owners can see everyone (fallback)
        const leadership = people.filter(u => {
          if (u.id === currentUserId) return false;
          const permission = userPermissions.get(u.id);
          return permission === 'super_admin' || permission === 'owner';
        });
        
        if (leadership.length > 0) {
          visibleToCount += leadership.length;
          leadership.forEach(leader => {
            const permission = userPermissions.get(leader.id);
            const roleDisplay = permission === 'super_admin' ? 'Super Admin' : 'Owner';
            visiblePeople.push({
              name: leader.full_name,
              role: roleDisplay
            });
            if (!directManager && leadership.length === 1) {
              directManager = {
                name: leader.full_name,
                role: roleDisplay
              };
            }
          });
        }
      }

      // Create user-friendly visibility label showing all visible people
      if (visiblePeople.length === 0) {
        visibilityLabel = 'Private';
      } else if (visiblePeople.length === 1) {
        visibilityLabel = `Visible to: ${formatName(visiblePeople[0].name)}`;
      } else if (visiblePeople.length <= 3) {
        const names = visiblePeople.map(p => formatName(p.name)).join(', ');
        visibilityLabel = `Visible to: ${names}`;
      } else {
        const firstTwo = visiblePeople.slice(0, 2).map(p => formatName(p.name)).join(', ');
        const remaining = visiblePeople.length - 2;
        visibilityLabel = `Visible to: ${firstTwo} +${remaining} more`;
      }

      visibility.push({
        userId: person.id,
        visibilityLabel,
        visibleToCount,
        visiblePeople: [...visiblePeople],
        directManager,
      });
    }

    return visibility;
  }, []);

  // Load org chart permissions and calculate visibility - memoized effect
  useEffect(() => {
    const loadPermissionsAndVisibility = async () => {
      if (!userId || !companyId || !profile) {
        setLoading(false);
        return;
      }

      // Super admins and owners bypass org chart restrictions - use company permissions  
      const userPermission = usersArray.find(u => u.id === userId);
      const companyPermission = userPermission ? await supabase
        .from('company_members')
        .select('permission_level')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .single() : null;

      const effectiveRole = companyPermission?.data?.permission_level || userRole;

      // OPTIMIZED: Fetch all needed data in parallel — company members, org roles (rich + simple), and role assignments
      const [
        { data: allCompanyMembers },
        { data: allOrgRolesWithAssignments },
        { data: allOrgRoles },
        { data: allRoleAssignments }
      ] = await Promise.all([
        supabase
          .from('company_members')
          .select('user_id, permission_level')
          .eq('company_id', companyId),
        supabase
          .from('org_roles')
          .select(`
            id,
            title,
            reports_to_role_id,
            assignments:role_assignments(
              id,
              user_id,
              profile:profiles(
                id,
                full_name,
                email
              )
            )
          `)
          .eq('company_id', companyId),
        supabase
          .from('org_roles')
          .select('id, title, reports_to_role_id')
          .eq('company_id', companyId),
        supabase
          .from('role_assignments')
          .select(`
            user_id,
            role_id,
            org_role:org_roles!inner(
              id,
              title,
              reports_to_role_id,
              company_id
            )
          `)
      ]);
      
      // Filter role assignments to only include this company
      const companyRoleAssignments = allRoleAssignments?.filter(assignment => {
        const orgRole = Array.isArray(assignment.org_role) ? assignment.org_role[0] : assignment.org_role;
        return orgRole?.company_id === companyId;
      }) || [];
      
      // Build role lookup map for in-memory hierarchy traversal
      const roleMap = new Map(allOrgRoles?.map(role => [role.id, role]) || []);
      
      // Find current user's role assignment
      const userRoleAssignment = companyRoleAssignments.find(a => a.user_id === userId);
      const currentUserOrgRole = userRoleAssignment ? (
        Array.isArray(userRoleAssignment.org_role) ? userRoleAssignment.org_role[0] : userRoleAssignment.org_role
      ) : null;
      
      let currentUserOrgInfo: any = null;
      if (currentUserOrgRole) {
        currentUserOrgInfo = {
          roleId: currentUserOrgRole.id,
          roleTitle: currentUserOrgRole.title,
          reportsToRoleId: currentUserOrgRole.reports_to_role_id
        };
      }
      
      logger.log('🔍 User org role:', currentUserOrgInfo);

      // OPTIMIZED: In-memory subordinate role calculation (no additional DB calls)
      const getSubordinateRolesInMemory = (roleId: string): Array<{ id: string; title: string }> => {
        const subordinates: Array<{ id: string; title: string }> = [];
        const visited = new Set<string>();
        
        const findSubordinates = (parentId: string) => {
          if (visited.has(parentId)) return;
          visited.add(parentId);
          
          const directReports = allOrgRoles?.filter(r => r.reports_to_role_id === parentId) || [];
          for (const role of directReports) {
            subordinates.push({ id: role.id, title: role.title });
            findSubordinates(role.id);
          }
        };
        
        findSubordinates(roleId);
        return subordinates;
      };
      
      let subordinateUserIds: string[] = [];
      
      if (currentUserOrgInfo?.roleId) {
        logger.log('🔍 Getting subordinate roles for role:', currentUserOrgInfo.roleId);
        const subordinateRoles = getSubordinateRolesInMemory(currentUserOrgInfo.roleId);
        logger.log('🔍 Subordinate roles found:', subordinateRoles.length);
        
        if (subordinateRoles.length > 0) {
          const subordinateRoleIds = new Set(subordinateRoles.map(role => role.id));
          
          // Get users from subordinate roles (in-memory lookup)
          subordinateUserIds = companyRoleAssignments
            .filter(a => subordinateRoleIds.has(a.role_id))
            .map(a => a.user_id);
          
          logger.log('🔍 Final subordinate user IDs:', subordinateUserIds.length);
        }
      }

      // Top-level users (CEOs, owners, super admins) and those with subordinates bypass team filtering
      const isTopLevelUser = effectiveRole === 'super_admin' || effectiveRole === 'owner' || 
                            (currentUserOrgInfo && currentUserOrgInfo.reportsToRoleId === null) ||
                            subordinateUserIds.length > 0;
      
      if (isTopLevelUser) {
        logger.log('🔍 Analyzer Permissions: Top-level user or user with subordinates detected');
        
        // Get superior roles to EXCLUDE from visibility (you should never see people you report to)
        let superiorUserIds: string[] = [];
        if (currentUserOrgInfo?.roleId && currentUserOrgInfo.reportsToRoleId !== null) {
          logger.log('🔍 Analyzer Permissions: Getting superior roles to exclude...');
          const superiorRoles = await OrgChartPermissionsService.getManagerHierarchy(
            currentUserOrgInfo.roleId, 
            companyId
          );
          superiorUserIds = await OrgChartPermissionsService.getUsersForRoles(
            superiorRoles.map(r => r.id)
          );
          logger.log('🔍 Analyzer Permissions: Superior user IDs to exclude:', superiorUserIds);
        }
        
        // For top-level users, include all active users EXCEPT superiors and pending users
        const allActiveUsers = usersArray.filter(u => 
          u.id !== userId && 
          u.status !== 'inactive' &&
          u.status !== 'pending' &&  // Exclude pending users from analyzer
          !superiorUserIds.includes(u.id)  // Exclude superiors
        );
        const visibleUserIds = allActiveUsers.map(u => u.id);
        
        logger.log('🔍 Analyzer Permissions: Visible user IDs for top-level user:', visibleUserIds.length);
        
        setOrgPermissions({
          canSeeUserIds: visibleUserIds,
          userRole: currentUserOrgInfo || undefined,
        });
        
        // Calculate people visibility
        const visibility = await calculateImprovedPeopleVisibility(
          allActiveUsers,
          companyId,
          effectiveRole === 'super_admin',
          userId,
          subordinateUserIds,
          allCompanyMembers || [],
          allOrgRolesWithAssignments || []
        );
        setPeopleVisibility(visibility);
        
      } else if (effectiveRole === 'manager') {
        // Managers can only see members from teams they belong to
        logger.log('🔍 Analyzer Permissions: Manager detected, applying team-based visibility');
        
        try {
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
              
              // For managers, also include all their subordinates from org chart
              const allVisibleIds = Array.from(new Set([...teamMemberIds, ...subordinateUserIds]));
              
              // Filter to only include users that exist in usersArray and exclude self and pending users
              const visibleUserIds = allVisibleIds.filter(id => {
                if (id === userId) return false;
                return usersArray.some(u => u.id === id && u.status !== 'inactive' && u.status !== 'pending');
              });
              
              logger.log('🔍 Analyzer Permissions: Manager can see team members:', visibleUserIds.length, 'including subordinates with same level');
              
              setOrgPermissions({
                canSeeUserIds: visibleUserIds,
                userRole: undefined,
              });
            } else {
              // No team members found, can only see subordinates
              setOrgPermissions({
                canSeeUserIds: subordinateUserIds,
                userRole: undefined,
              });
            }
          } else {
            // Manager belongs to no teams, can only see subordinates
            logger.log('🔍 Analyzer Permissions: Manager belongs to no teams, can see subordinates only');
            setOrgPermissions({
              canSeeUserIds: subordinateUserIds,
              userRole: undefined,
            });
          }
        } catch (error) {
          logger.error('Error loading manager team visibility:', error);
          // Fallback: manager can see subordinates only
          setOrgPermissions({
            canSeeUserIds: subordinateUserIds,
            userRole: undefined,
          });
        }
      } else {
        // Filter users by hierarchy: see lower-level users; same-level only if they report to you; never see higher-level (superiors)
        const permissionHierarchy: Record<string, number> = {
          'view-only': 1,
          'member': 2,
          'manager': 3,
          'director': 4,
          'admin': 5,
          'owner': 6,
          'super_admin': 7
        };
        const currentUserLevel = permissionHierarchy[effectiveRole as keyof typeof permissionHierarchy] || 0;

        const visibleUserIds = usersArray
          .filter(u => {
            if (u.id === userId) return false;
            if (u.status === 'inactive' || u.status === 'pending') return false; // Exclude inactive and pending users
            const userLevel = permissionHierarchy[u.permission_level as keyof typeof permissionHierarchy] || 0;

            if (userLevel < currentUserLevel) return true; // Lower-level users are visible
            if (userLevel === currentUserLevel) return subordinateUserIds.includes(u.id); // Same-level only if subordinate
            // userLevel > currentUserLevel => superior (someone you report to) -> not visible
            return false;
          })
          .map(u => u.id);
        
        logger.log('🔍 Analyzer Permissions: User can see:', visibleUserIds.length, 'by hierarchy/subordinates rule');

        setOrgPermissions({
          canSeeUserIds: visibleUserIds,
          userRole: undefined,
        });
      }

      // Calculate visibility for each person (excluding self)
      const visibility = await calculateImprovedPeopleVisibility(usersArray, companyId, true, userId, subordinateUserIds, allCompanyMembers || [], allOrgRolesWithAssignments || []);
      setPeopleVisibility(visibility);
      
      // Mark permissions as calculated for the current users version
      setPermissionsForVersion(usersVersion);
      logger.log('🔍 useAnalyzerPermissions: Permissions calculated for version:', usersVersion);
      setLoading(false);
    };

    loadPermissionsAndVisibility();
  }, [userId, companyId, userRole, usersArray, usersVersion, calculateImprovedPeopleVisibility, profile]);

  // Memoized visible people calculation - only return data when permissions are synchronized with current users
  const canViewPeople = useMemo(() => {
    // Guard: Don't return any users until permissions are calculated for the CURRENT user list
    // This prevents flickering where stale permissions are applied to new user data
    if (loading || !orgPermissions || !userId || permissionsForVersion !== usersVersion) {
      logger.log('🔍 useAnalyzerPermissions: canViewPeople guard - waiting for sync', { 
        loading, 
        hasPermissions: !!orgPermissions, 
        permissionsForVersion, 
        usersVersion 
      });
      return [];
    }

    // Filter out self and only include users in the permissions list
    return usersArray.filter(u => u.id !== userId && orgPermissions.canSeeUserIds.includes(u.id));
  }, [loading, orgPermissions, userId, usersArray, permissionsForVersion, usersVersion]);

  // Everyone can edit scores and bars
  const canEditScores = useMemo(() => {
    logger.log('🔒 canEditScores: No restrictions - everyone can edit');
    return true;
  }, []);

  const canEditBars = useMemo(() => {
    logger.log('🔒 canEditBars: No restrictions - everyone can edit');
    return true;
  }, []);

  // Compute effective loading state that includes version synchronization
  // This prevents the "No People" empty state from showing during the sync gap
  const effectiveLoading = loading || permissionsForVersion !== usersVersion;

  return {
    visiblePeople: canViewPeople,
    peopleVisibility,
    canEditScores,
    canEditBars,
    loading: effectiveLoading,
    userOrgRole: orgPermissions?.userRole,
  };
};
