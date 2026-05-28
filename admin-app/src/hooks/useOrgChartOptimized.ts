
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { 
  trackAccountabilityChartCreated, 
  trackSeatAdded, 
  trackSeatFilled, 
  trackSeatRemoved 
} from '@/lib/statsigAnalytics';

export interface OrgRole {
  id: string;
  title: string;
  responsibilities: string;
  personality_color: 'red' | 'yellow' | 'green' | 'blue';
  company_id: string;
  reports_to_role_id: string | null;
  position_x: number | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  assignments?: Array<{
    id: string;
    user_id: string;
    role_id: string;
    assigned_at: string;
    profile?: {
      id: string;
      full_name: string;
      avatar_url: string | null;
      email: string;
    };
  }>;
  reports_to_role?: OrgRole | null;
}

export interface CompanyProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
  role: string;
}

export const useOrgChartOptimized = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { currentCompany } = useMultiCompanyAccess();
  const { toast } = useToast();

  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Ref to track current roles for real-time subscription filtering
  // This prevents subscription churn when roles change
  const rolesRef = useRef<OrgRole[]>([]);
  useEffect(() => {
    rolesRef.current = roles;
  }, [roles]);

  const isSuperAdmin = profile?.role === 'super_admin';

  // Optimized single query for roles with assignments
  const fetchRolesOptimized = useCallback(async () => {
    if (!user || !currentCompany?.id) {
      setRoles([]);
      setIsLoading(false);
      return;
    }

    logger.log('🚀 OrgChart: Fast fetch starting for company:', currentCompany?.id);
    setIsLoading(true);
    setFetchError(null);

    try {
      // Single optimized query - fetch roles and assignments separately for better performance
      const { data: rolesData, error: rolesError } = await supabase
        .from('org_roles')
        .select('*')
        .eq('company_id', currentCompany?.id)
        .order('title');

      if (rolesError) throw rolesError;

      // Fetch assignments separately with active user filter
      const roleIds = rolesData?.map(r => r.id) || [];
      let assignmentsData: any[] = [];
      
      if (roleIds.length > 0) {
        const { data: assignments, error: assignmentsError } = await supabase
          .from('role_assignments')
          .select(`
            *,
            profile:profiles!inner(id, full_name, avatar_url, email, role)
          `)
          .in('role_id', roleIds)
          .neq('profile.role', 'inactive'); // Exclude only inactive users, include all active roles

        if (assignmentsError) {
          logger.warn('⚠️ Assignments fetch failed:', assignmentsError);
        } else {
          // Additional filter for active company members
          const filteredAssignments = assignments?.filter(assignment => {
            return assignment.profile && assignment.profile.role !== 'inactive';
          }) || [];
          
          // Fetch company_members data for assigned users
          if (filteredAssignments.length > 0) {
            const userIds = filteredAssignments.map(a => a.user_id);
            const { data: companyMembers, error: companyMembersError } = await supabase
              .from('company_members')
              .select('user_id, image_url')
              .eq('company_id', currentCompany?.id)
              .in('user_id', userIds);
            
            if (companyMembersError) {
              logger.warn('⚠️ Company members fetch failed:', companyMembersError);
              // Fallback: keep all assignments without company member filtering
              assignmentsData = filteredAssignments.map(assignment => ({
                ...assignment,
                company_member: null
              }));
            } else {
              // Create a map for quick lookup
              const memberDataMap = new Map(
                companyMembers?.map(cm => [cm.user_id, cm]) || []
              );
              
              // MULTI-COMPANY FIX: Only keep assignments for users who are active
              // members of the current company. This prevents users assigned to roles
              // in one company from appearing in another company's org chart.
              const companyActiveAssignments = filteredAssignments.filter(assignment =>
                memberDataMap.has(assignment.user_id)
              );
              
              logger.log(`🔍 Multi-company filter: ${filteredAssignments.length} assignments → ${companyActiveAssignments.length} active in this company`);
              
              // Attach company_member data to each assignment
              assignmentsData = companyActiveAssignments.map(assignment => ({
                ...assignment,
                company_member: memberDataMap.get(assignment.user_id) || null
              }));
            }
          } else {
            assignmentsData = filteredAssignments;
          }
        }
      }

      // Combine roles with their assignments with enhanced data validation
      const rolesWithAssignments = rolesData?.map(role => {
        const roleAssignments = assignmentsData.filter(a => a.role_id === role.id);
        
        // Get personality profile chart (image_url) from first assigned member (if any)
        const firstAssignment = roleAssignments[0];
        const memberData = firstAssignment?.company_member;
        
        // Determine if role is vacant
        const isVacant = roleAssignments.length === 0;
        
        // Critical fix: preserve the EXACT data from database without transformation
        // Personality color comes from org_roles (not company_members)
        // Personality profile chart (image_url) comes from company_members when member is assigned
        const processedRole = {
          ...role,
          assignments: roleAssignments,
          // Keep exact database values - DO NOT override unless truly null/undefined
          title: role.title ?? 'Untitled Role',
          responsibilities: role.responsibilities ?? '', // Keep exact string value
          // Personality color comes from org_roles, default to 'green' if null
          personality_color: (['red', 'yellow', 'green', 'blue'].includes(role.personality_color))
            ? (role.personality_color as 'red' | 'yellow' | 'green' | 'blue')
            : ('green' as 'red' | 'yellow' | 'green' | 'blue'),
          reports_to_role_id: role.reports_to_role_id ?? null,
          // Personality profile chart: use role-level image_url from org_roles; fallback to company_member's image
          image_url: role.image_url ?? (isVacant ? null : (memberData?.image_url ?? null)),
          // Insights scores saved via Insights picker (overrides image on hover)
          insights_scores: role.insights_scores ?? null,
          insights_candidate_id: role.insights_candidate_id ?? null,
        };
        
        logger.log(`🔍 Role "${role.title}" EXACT data preservation:`, {
          id: role.id,
          title: processedRole.title,
          responsibilities: processedRole.responsibilities,
          responsibilitiesRaw: JSON.stringify(processedRole.responsibilities),
          responsibilitiesType: typeof processedRole.responsibilities,
          responsibilitiesLength: processedRole.responsibilities?.length || 0,
          assignments: roleAssignments.length,
          assignmentsData: roleAssignments.map(a => ({ user_id: a.user_id, profile: a.profile?.full_name })),
          isVacant,
          personality_color: processedRole.personality_color,
          personality_color_source: 'org_roles',
          image_url: processedRole.image_url,
          image_url_source: isVacant ? 'null (vacant)' : (memberData?.image_url ? 'company_member' : 'null')
        });
        
        return processedRole;
      }) || [];

      logger.log('✅ OrgChart: Fast fetch complete:', rolesWithAssignments.length, 'roles');
      logger.log('✅ OrgChart: All roles summary:', rolesWithAssignments.map(r => ({
        id: r.id,
        title: r.title,
        hasResponsibilities: !!(r.responsibilities && r.responsibilities.trim()),
        hasAssignments: r.assignments.length > 0
      })));
      
      setRoles(rolesWithAssignments);

    } catch (error) {
      logger.error('❌ OrgChart: Fast fetch failed:', error);
      const errorMessage = (error as any)?.message || 'Unknown error';
      setFetchError(errorMessage);
      setRoles([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, currentCompany?.id]);

  // Simplified profiles fetch
  const fetchProfilesOptimized = useCallback(async () => {
    if (!user || !currentCompany?.id) {
      setProfiles([]);
      setProfilesLoading(false);
      return;
    }

    logger.log('🚀 OrgChart: Fast profiles fetch starting');
    setProfilesLoading(true);

    try {
      // Try company_members first, only get active members
      const { data: companyMembers } = await supabase
        .from('company_members')
        .select(`
          profiles!inner(id, full_name, avatar_url, email, role)
        `)
        .eq('company_id', currentCompany?.id)
        .eq('status', 'active');

      if (companyMembers && companyMembers.length > 0) {
        const formattedProfiles = companyMembers
          .map(member => member.profiles)
          .filter(Boolean)
          .flat() // Flatten the array in case profiles is an array
          .map(profile => ({
            id: profile.id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            email: profile.email,
            role: 'member' // Legacy field removed - check company_members for actual permission
          }));

        logger.log('✅ OrgChart: Fast profiles fetch complete:', formattedProfiles.length);
        setProfiles(formattedProfiles);
      } else {
        // Fallback to direct profiles query
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email')
          .eq('company_id', currentCompany?.id);

        const formattedProfiles = profilesData?.map(profile => ({
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          email: profile.email,
          role: 'member' // Legacy field removed - check company_members for actual permission
        })) || [];

        logger.log('✅ OrgChart: Fallback profiles fetch complete:', formattedProfiles.length);
        setProfiles(formattedProfiles);
      }

    } catch (error) {
      logger.warn('⚠️ OrgChart: Profiles fetch failed:', error);
      setProfiles([]);
    } finally {
      setProfilesLoading(false);
    }
  }, [currentCompany?.id, user]);

  // Permission check - using proper database function
  const checkUserPermissions = useCallback(async () => {
    if (!user || !currentCompany?.id) {
      return { canManage: false, reason: 'No user or company selected' };
    }

    try {
      logger.log('🔍 Checking org management permissions for user:', user.id, 'company:', currentCompany?.id);
      
      const { data: hasPermission, error } = await supabase
        .rpc('check_org_management_permission', {
          p_user_id: user.id,
          p_company_id: currentCompany?.id
        });

      if (error) {
        logger.error('🚨 Permission check failed:', error);
        return { canManage: false, reason: 'Permission check failed' };
      }

      if (!hasPermission) {
        return { 
          canManage: false, 
          reason: 'Insufficient permissions - you need director, manager, or super_admin role to manage org chart' 
        };
      }

      return { canManage: true, reason: 'Permission granted' };
    } catch (error) {
      logger.error('🚨 Permission check error:', error);
      return { canManage: false, reason: 'Permission check error' };
    }
  }, [user, currentCompany]);

  // Optimistic update functions (simplified)
  const createRole = async (roleData: any) => {
    if (!currentCompany?.id || !user) {
      throw new Error('No company selected or user not authenticated.');
    }

    logger.log('🔄 Creating role:', roleData.title);
    
    // Dispatch optimistic event for onboarding
    logger.log('🎯 useOrgChartOptimized: Dispatching optimistic org chart creation event for onboarding');
    window.dispatchEvent(new CustomEvent('optimistic-org-chart-creation'));
    
  // Get next position_x for new role (append at end of siblings)
    const parentId = roleData.reports_to_role_id;
    const siblings = roles.filter(r => r.reports_to_role_id === parentId);
    const maxPosition = Math.max(...siblings.map(s => s.position_x ?? 0), -1);
    const newPositionX = maxPosition + 1;

    const { data: newRole, error: roleError } = await supabase
      .from('org_roles')
      .insert({
        title: roleData.title,
        responsibilities: roleData.responsibilities,
        personality_color: roleData.personality_color || 'green',
        company_id: currentCompany?.id,
        reports_to_role_id: roleData.reports_to_role_id || null,
        position_x: newPositionX,
        image_url: roleData.image_url || null,
        insights_candidate_id: roleData.insights_candidate_id || null,
        insights_scores: roleData.insights_scores || null,
      })
      .select()
      .single();

    if (roleError) throw roleError;

    // Track org chart analytics - first role = chart created, subsequent = seat added
    try {
      const isFirstRole = roles.length === 0;
      if (isFirstRole) {
        trackAccountabilityChartCreated({
          user_id: user.id,
          company_id: currentCompany?.id,
          chart_id: newRole.id,
        });
        logger.log('📊 Analytics: accountability_chart_created tracked');
      } else {
        trackSeatAdded({
          user_id: user.id,
          company_id: currentCompany?.id,
          seat_id: newRole.id,
          seat_name: roleData.title,
        });
        logger.log('📊 Analytics: seat_added tracked');
      }
    } catch (e) {
      // Non-blocking
    }

    // Handle assignment if user was assigned during role creation
    const hasAssignment = roleData.assigned_user_ids && roleData.assigned_user_ids.length > 0;

    if (hasAssignment) {
      logger.log('🔄 Creating assignments for new role:', roleData.assigned_user_ids);
      const assignments = roleData.assigned_user_ids.map((userId: string) => ({
        user_id: userId,
        role_id: newRole.id,
      }));
      
      const { error: assignmentError } = await supabase
        .from('role_assignments')
        .insert(assignments);
        
      if (assignmentError) {
        logger.error('❌ Assignment creation error:', assignmentError);
        throw assignmentError;
      }
      logger.log('✅ Successfully created assignments for new role');

      // Track seat_filled ONLY when a person is assigned to the role
      // This is separate from seat_added which tracks the role creation
      try {
        trackSeatFilled({
          user_id: user.id,
          company_id: currentCompany?.id,
          seat_id: newRole.id,
          assigned_user_id: roleData.assigned_user_ids[0],
        });
        logger.log('📊 Analytics: seat_filled tracked (person assigned during creation)');
      } catch (e) {
        // Non-blocking
      }
    }

    // Refresh data
    await fetchRolesOptimized();
  };

  const updateRole = async (roleId: string, roleData: any) => {
    if (!currentCompany?.id) {
      throw new Error('No company selected.');
    }

    logger.log('🔄 Updating role:', roleId, 'with data:', roleData);
    
    // Update role data (personality_color goes to org_roles, image_url stays in company_members)
    // IMPORTANT: Use explicit values, NOT `|| null` which strips intentional empty values
    // e.g. removing all responsibilities should set '' not be ignored
    const updateData: Record<string, any> = {
      title: roleData.title?.trim() || 'Untitled Role',
      responsibilities: roleData.responsibilities ?? '', // Allow empty string (all responsibilities removed)
      personality_color: roleData.personality_color || 'green',
      reports_to_role_id: roleData.reports_to_role_id ?? null, // Allow null (top-level role)
      updated_at: new Date().toISOString(),
    };

    // Persist image_url directly on org_roles (role-level personality chart)
    if (roleData.image_url !== undefined) {
      updateData.image_url = roleData.image_url || null;
    }

    // Persist Insights candidate — scores override the manual image on hover
    if (roleData.insights_candidate_id !== undefined) {
      updateData.insights_candidate_id = roleData.insights_candidate_id || null;
      updateData.insights_scores = roleData.insights_scores || null;
    }
    
    logger.log('🔄 Update data (all fields sent, including empty):', updateData);

    const { error: roleError } = await supabase
      .from('org_roles')
      .update(updateData)
      .eq('id', roleId);

    if (roleError) throw roleError;

    // Handle assignment changes - only when explicitly updating assignments
    if (roleData.assigned_user_ids !== undefined && roleData.intentional_assignment_update === true) {
      // Check if this role was previously empty (for seat_filled tracking)
      const existingRole = roles.find(r => r.id === roleId);
      const wasEmpty = !existingRole?.assignments || existingRole.assignments.length === 0;
      
      logger.log('🔄 Deleting existing assignments for role:', roleId);
      const { error: deleteError } = await supabase.from('role_assignments').delete().eq('role_id', roleId);
      if (deleteError) {
        logger.error('❌ Delete assignments error:', deleteError);
        throw deleteError;
      }

      if (roleData.assigned_user_ids && roleData.assigned_user_ids.length > 0) {
        logger.log('🔄 Creating new assignments:', roleData.assigned_user_ids);
        const assignments = roleData.assigned_user_ids.map((userId: string) => ({
          user_id: userId,
          role_id: roleId,
        }));
        
        const { error: insertError } = await supabase
          .from('role_assignments')
          .insert(assignments);
        
        if (insertError) {
          logger.error('❌ Insert assignments error:', insertError);
          throw insertError;
        }
        logger.log('✅ Successfully created assignments');

        // Track seat_filled only on FIRST assignment (was empty, now has someone)
        if (wasEmpty) {
          try {
            trackSeatFilled({
              user_id: user?.id,
              company_id: currentCompany?.id,
              seat_id: roleId,
              assigned_user_id: roleData.assigned_user_ids[0],
            });
            logger.log('📊 Analytics: seat_filled tracked (via update)');
          } catch (e) {
            // Non-blocking
          }
        }
      }
    }

    // Note: Personality profile (color and image) is now managed per user in company_members,
    // not per role. Users can update their personality profile in the UserProfileModal.

    // Refresh data and ensure UI updates immediately
    await fetchRolesOptimized();
    logger.log('✅ Role update complete, data refreshed');
  };

  const deleteRole = async (roleId: string) => {
    const hasChildren = roles.some(r => r.reports_to_role_id === roleId);
    if (hasChildren) {
      throw new Error('Cannot delete role with direct reports. Please reassign or delete child roles first.');
    }

    // Get role info before deletion for analytics
    const roleToDelete = roles.find(r => r.id === roleId);
    const wasFilled = roleToDelete?.assignments && roleToDelete.assignments.length > 0;

    await supabase.from('role_assignments').delete().eq('role_id', roleId);
    const { error } = await supabase.from('org_roles').delete().eq('id', roleId);
    
    if (error) throw error;

    // Track seat_removed event
    try {
      trackSeatRemoved({
        user_id: user?.id,
        company_id: currentCompany?.id,
        seat_id: roleId,
        was_filled: wasFilled,
      });
      logger.log('📊 Analytics: seat_removed tracked');
    } catch (e) {
      // Non-blocking
    }

    // Refresh data
    await fetchRolesOptimized();
  };

  const deleteAllRoles = async () => {
    if (!currentCompany?.id) {
      throw new Error('No company selected.');
    }

    logger.log('🗑️ Deleting all roles for company:', currentCompany?.id);

    try {
      // First delete all role assignments for this company's roles
      const roleIds = roles.map(r => r.id);
      
      if (roleIds.length > 0) {
        const { error: assignmentsError } = await supabase
          .from('role_assignments')
          .delete()
          .in('role_id', roleIds);
        
        if (assignmentsError) throw assignmentsError;
      }

      // Then delete all roles for this company
      const { error: rolesError } = await supabase
        .from('org_roles')
        .delete()
        .eq('company_id', currentCompany?.id);
      
      if (rolesError) throw rolesError;

      logger.log('✅ All roles deleted successfully');
      
      // Refresh data
      await fetchRolesOptimized();
      
      return { success: true };
    } catch (error) {
      logger.error('❌ Error deleting all roles:', error);
      throw error;
    }
  };

  const moveRole = async (roleId: string, newParentId: string | null, newPositionX?: number) => {
    // If no specific position provided, append at end of new parent's children
    let finalPositionX = newPositionX;
    if (finalPositionX === undefined) {
      const newSiblings = roles.filter(r => r.reports_to_role_id === newParentId);
      const maxPosition = Math.max(...newSiblings.map(s => s.position_x ?? 0), -1);
      finalPositionX = maxPosition + 1;
    }

    const { error } = await supabase
      .from('org_roles')
      .update({ 
        reports_to_role_id: newParentId,
        position_x: finalPositionX,
        updated_at: new Date().toISOString()
      })
      .eq('id', roleId);

    if (error) throw error;

    // Refresh data
    await fetchRolesOptimized();
  };

  // Function to reorder siblings by updating their position_x values
  const reorderSiblings = async (roleId: string, targetSiblingId: string, direction: 'left' | 'right') => {
    if (!currentCompany?.id) {
      throw new Error('No company selected');
    }

    const draggedRole = roles.find(r => r.id === roleId);
    const targetRole = roles.find(r => r.id === targetSiblingId);
    
    if (!draggedRole || !targetRole) {
      throw new Error('Roles not found');
    }

    // Ensure they're siblings
    if (draggedRole.reports_to_role_id !== targetRole.reports_to_role_id) {
      throw new Error('Can only reorder siblings');
    }

    // Get all siblings and sort them by current position
    const siblings = roles
      .filter(r => r.reports_to_role_id === draggedRole.reports_to_role_id)
      .sort((a, b) => (a.position_x ?? 0) - (b.position_x ?? 0));

    // Remove dragged role from current position
    const filteredSiblings = siblings.filter(s => s.id !== roleId);
    
    // Find target index
    const targetIndex = filteredSiblings.findIndex(s => s.id === targetSiblingId);
    const insertIndex = direction === 'left' ? targetIndex : targetIndex + 1;
    
    // Insert dragged role at new position
    filteredSiblings.splice(insertIndex, 0, draggedRole);
    
    // Update position_x for all affected siblings
    const updates = filteredSiblings.map((role, index) => ({
      id: role.id,
      position_x: index
    }));

    // Batch update all positions
    for (const update of updates) {
      const { error } = await supabase
        .from('org_roles')
        .update({ position_x: update.position_x })
        .eq('id', update.id)
        .eq('company_id', currentCompany?.id);

      if (error) throw error;
    }

    await fetchRolesOptimized();
  };

  // Function to backfill position_x for existing roles (one-time operation)
  const backfillPositions = async () => {
    if (!currentCompany?.id) {
      throw new Error('No company selected');
    }

    // Group roles by parent
    const rolesByParent = new Map<string | null, OrgRole[]>();
    
    roles.forEach(role => {
      const parentId = role.reports_to_role_id;
      if (!rolesByParent.has(parentId)) {
        rolesByParent.set(parentId, []);
      }
      rolesByParent.get(parentId)!.push(role);
    });

    // Process each parent group
    for (const [parentId, siblings] of rolesByParent) {
      // Sort by current position_x (nulls first), then by created_at
      siblings.sort((a, b) => {
        const aPos = a.position_x ?? -1;
        const bPos = b.position_x ?? -1;
        if (aPos !== bPos) return aPos - bPos;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      // Update positions sequentially
      for (let i = 0; i < siblings.length; i++) {
        if (siblings[i].position_x !== i) {
          const { error } = await supabase
            .from('org_roles')
            .update({ position_x: i })
            .eq('id', siblings[i].id)
            .eq('company_id', currentCompany?.id);

          if (error) throw error;
        }
      }
    }

    await fetchRolesOptimized();
  };

  // Memoized role hierarchy calculations
  const roleHierarchy = useMemo(() => {
    const rootRoles = roles.filter(role => !role.reports_to_role_id);
    const rolesWithChildren = new Set<string>();
    
    roles.forEach(role => {
      if (roles.some(r => r.reports_to_role_id === role.id)) {
        rolesWithChildren.add(role.id);
      }
    });

    return { rootRoles, rolesWithChildren };
  }, [roles]);

  // Load data when company changes
  useEffect(() => {
    if (currentCompany?.id) {
      logger.log('🔄 OrgChart: Company changed, fast loading:', currentCompany?.name);
      fetchRolesOptimized();
      fetchProfilesOptimized();
    } else {
      setRoles([]);
      setProfiles([]);
      setFetchError(null);
    }
  }, [currentCompany?.id, fetchRolesOptimized, fetchProfilesOptimized]);

  // Simplified real-time subscriptions
  useEffect(() => {
    if (!currentCompany?.id) return;

    logger.log('🔄 OrgChart: Setting up simplified real-time for:', currentCompany?.id);

    const channel = supabase
      .channel(`org-chart-${currentCompany?.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'org_roles',
          filter: `company_id=eq.${currentCompany?.id}`,
        },
        () => {
          logger.log('🔄 Real-time: Roles changed, refreshing...');
          setTimeout(() => fetchRolesOptimized(), 500);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'role_assignments',
        },
        (payload) => {
          // Filter to only handle changes relevant to current company's roles
          // This prevents cross-company subscription noise for multi-company users
          const changedRoleId = (payload.new as any)?.role_id || (payload.old as any)?.role_id;
          const isRelevantToCurrentCompany = changedRoleId && rolesRef.current.some(r => r.id === changedRoleId);
          
          if (isRelevantToCurrentCompany) {
            logger.log('🔄 Real-time: Company-relevant assignment changed, refreshing...');
            setTimeout(() => fetchRolesOptimized(), 500);
          } else {
            logger.log('🔄 Real-time: Ignoring assignment change from other company');
          }
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentCompany?.id, fetchRolesOptimized]);

  return {
    roles,
    profiles,
    isLoading,
    profilesLoading,
    realtimeConnected,
    isSuperAdmin,
    fetchError,
    roleHierarchy,
    fetchRoles: fetchRolesOptimized,
    fetchProfiles: fetchProfilesOptimized,
    createRole,
    updateRole,
    deleteRole,
    deleteAllRoles,
    moveRole,
    reorderSiblings,
    backfillPositions,
    checkUserPermissions,
  };
};
