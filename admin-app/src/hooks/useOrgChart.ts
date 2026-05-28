
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

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
  assignments?: any[];
}

export interface CompanyProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
  role: string;
}

export const useOrgChart = () => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompanyAccess();
  const { toast } = useToast();

  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Prevent multiple simultaneous requests
  const fetchingProfiles = useRef(false);
  const fetchingRoles = useRef(false);
  const lastCompanyId = useRef<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (fetchingProfiles.current || !currentCompany?.id) {
      return;
    }

    fetchingProfiles.current = true;
    logger.log('🔄 Starting profiles fetch for company:', currentCompany?.id);
    setProfilesLoading(true);
    setFetchError(null);

    try {
      // Join with company_members to only get active users in the company
      const { data, error } = await supabase
        .from('company_members')
        .select(`
          user_id,
          profiles:user_id (
            id,
            full_name,
            avatar_url,
            email,
            role
          )
        `)
        .eq('company_id', currentCompany?.id)
        .eq('status', 'active');

      if (error) {
        logger.error('❌ Profiles query error:', error);
        throw new Error(`Profiles query failed: ${error.message}`);
      }

      const validProfiles = (data || [])
        .map(cm => {
          // Handle profiles relationship properly - it's an array from joins
          const profileArray = Array.isArray(cm.profiles) ? cm.profiles : [cm.profiles];
          const profile = profileArray?.[0];
          return profile;
        })
        .filter(profile => profile?.id && profile?.full_name && profile?.email)
        .map(profile => ({
            id: profile.id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            email: profile.email,
            role: profile.role || 'member'
          }));

      logger.log('✅ Profiles loaded successfully (active only):', validProfiles.length);
      setProfiles(validProfiles);

    } catch (error: any) {
      logger.error('❌ Profiles fetch failed:', error);
      setFetchError(error.message || 'Failed to load profiles');
      
      toast({
        title: "Error Loading Users",
        description: "Failed to load company users. Please refresh the page.",
        variant: "destructive"
      });
    } finally {
      setProfilesLoading(false);
      fetchingProfiles.current = false;
    }
  }, []); // EMPTY DEPS - will be called manually

  const fetchRoles = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (fetchingRoles.current || !currentCompany?.id) {
      return;
    }

    fetchingRoles.current = true;
    logger.log('🔄 Starting roles fetch for company:', currentCompany?.id);
    setIsLoading(true);
    setFetchError(null);

    try {
      const { data, error } = await supabase
        .from('org_roles')
        .select(`
          *,
          assignments:role_assignments(
            id,
            user_id,
            profile:profiles(
              id,
              full_name,
              email,
              avatar_url
            )
          )
        `)
        .eq('company_id', currentCompany?.id);

      if (error) {
        logger.error('❌ Roles query error:', error);
        throw new Error(`Roles query failed: ${error.message}`);
      }

      logger.log('✅ Roles loaded successfully:', data?.length || 0);
      setRoles(data || []);

    } catch (error: any) {
      logger.error('❌ Roles fetch failed:', error);
      setFetchError(error.message || 'Failed to load roles');
      
      toast({
        title: "Error Loading Roles",
        description: "Failed to load organizational roles. Please refresh the page.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      fetchingRoles.current = false;
    }
  }, []); // EMPTY DEPS - will be called manually

  // Single effect that only runs when company actually changes
  useEffect(() => {
    // Only run if company actually changed
    if (currentCompany?.id === lastCompanyId.current) {
      return;
    }

    logger.log('🔄 Company changed from', lastCompanyId.current, 'to', currentCompany?.id);
    lastCompanyId.current = currentCompany?.id || null;

    if (currentCompany?.id) {
      // Clear previous data
      setRoles([]);
      setProfiles([]);
      setFetchError(null);
      
      // Fetch new data with a small delay to prevent race conditions
      setTimeout(() => {
        fetchRoles();
        fetchProfiles();
      }, 100);
    } else {
      // No company selected, clear everything
      setRoles([]);
      setProfiles([]);
      setFetchError(null);
    }
  }, [currentCompany?.id]); // ONLY depend on company ID

  // Manual refresh functions
  const refreshData = useCallback(() => {
    if (currentCompany?.id) {
      fetchRoles();
      fetchProfiles();
    }
  }, [currentCompany?.id, fetchRoles, fetchProfiles]);

  // CRUD operations
  const createRole = useCallback(async (roleData: any) => {
    if (!currentCompany?.id) {
      throw new Error('No company selected');
    }

    // Dispatch optimistic event for onboarding
    logger.log('🎯 useOrgChart: Dispatching optimistic org chart creation event for onboarding');
    window.dispatchEvent(new CustomEvent('optimistic-org-chart-creation'));

    // Get next position_x for new role (append at end of siblings)
    const parentId = roleData.reports_to_role_id;
    const siblings = roles.filter(r => r.reports_to_role_id === parentId);
    const maxPosition = Math.max(...siblings.map(s => s.position_x ?? 0), -1);
    const newPositionX = maxPosition + 1;

    const { error } = await supabase
      .from('org_roles')
      .insert({
        ...roleData,
        company_id: currentCompany?.id,
        position_x: newPositionX
      });

    if (error) throw error;
    await fetchRoles();
  }, [currentCompany?.id, fetchRoles, roles]);

  const updateRole = useCallback(async (roleId: string, roleData: any) => {
    if (!currentCompany?.id) {
      throw new Error('No company selected');
    }

    const { error } = await supabase
      .from('org_roles')
      .update(roleData)
      .eq('id', roleId)
      .eq('company_id', currentCompany?.id);

    if (error) throw error;
    await fetchRoles();
  }, [currentCompany?.id, fetchRoles]);

  const deleteRole = useCallback(async (roleId: string) => {
    if (!currentCompany?.id) {
      throw new Error('No company selected');
    }

    const { error } = await supabase
      .from('org_roles')
      .delete()
      .eq('id', roleId)
      .eq('company_id', currentCompany?.id);

    if (error) throw error;
    await fetchRoles();
  }, [currentCompany?.id, fetchRoles]);

  const moveRole = useCallback(async (roleId: string, newParentId: string | null, newPositionX?: number) => {
    if (!currentCompany?.id) {
      throw new Error('No company selected');
    }

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
        position_x: finalPositionX
      })
      .eq('id', roleId)
      .eq('company_id', currentCompany?.id);

    if (error) throw error;
    await fetchRoles();
  }, [currentCompany?.id, fetchRoles, roles]);

  // Function to reorder siblings by updating their position_x values
  const reorderSiblings = useCallback(async (roleId: string, targetSiblingId: string, direction: 'left' | 'right') => {
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

    await fetchRoles();
  }, [currentCompany?.id, fetchRoles, roles]);

  // Function to backfill position_x for existing roles (one-time operation)
  const backfillPositions = useCallback(async () => {
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

    await fetchRoles();
  }, [currentCompany?.id, fetchRoles, roles]);

  const checkUserPermissions = useCallback(async () => {
    logger.log('Permission check - debug mode always returns true');
    return { canManage: true, reason: 'Debug mode - permissions temporarily bypassed' };
  }, []);

  return {
    roles,
    profiles,
    isLoading,
    profilesLoading,
    fetchError,
    fetchRoles,
    fetchProfiles,
    refreshData,
    createRole,
    updateRole,
    deleteRole,
    moveRole,
    reorderSiblings,
    backfillPositions,
    checkUserPermissions,
    isSuperAdmin: false,
    realtimeConnected: false,
  };
};
