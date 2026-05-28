
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedUser } from '@/hooks/useUserManagement';
import { logger } from '@/utils/logger';

export const useUserData = (includeInactive: boolean = true) => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const queryClient = useQueryClient();

  // Consistent query key for React Query
  const queryKey = ['unified-users', currentCompany?.id, includeInactive];

  const fetchUsers = useCallback(async (): Promise<UnifiedUser[]> => {
    if (!currentCompany?.id) {
      return [];
    }

    try {
      // Use the updated RPC function with configurable include_inactive parameter
      const { data, error } = await supabase
        .rpc('get_company_accessible_users', { 
          target_company_id: currentCompany?.id,
          include_inactive: includeInactive
        });

      if (error) {
        logger.error('❌ useUserData: Error fetching users:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Transform to unified format
      const transformedUsers: UnifiedUser[] = data.map(user => ({
        user_id: user.user_id,
        id: user.user_id || user.id, // Use temp ID for pending users
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        role: user.role,
        permission_level: user.permission_level,
        capabilities: user.capabilities || [],
        joined_at: user.joined_at,
        created_at: user.created_at,
        email_confirmed_at: user.email_confirmed_at,
        access_type: user.access_type as 'direct',
        company_memberships: [{
          company_id: currentCompany?.id,
          permission_level: user.permission_level
        }],
        primary_company_id: user.status === 'active' ? currentCompany?.id : null,
        status: user.status,
        invited_at: user.invited_at
      }));

      // Fetch personality profile chart (image_url) from company_members
      // Note: personality_color is now on org_roles, not company_members
      const userIds = transformedUsers.map(u => u.user_id).filter(Boolean);
      if (userIds.length > 0) {
        const { data: companyMembers } = await supabase
          .from('company_members')
          .select('user_id, image_url')
          .eq('company_id', currentCompany?.id)
          .in('user_id', userIds);
        
        // Create a map for quick lookup
        const memberDataMap = new Map(
          companyMembers?.map(cm => [cm.user_id, cm]) || []
        );
        
        // Attach personality profile chart (image_url) to each user
        transformedUsers.forEach(user => {
          const memberData = memberDataMap.get(user.user_id);
          if (memberData) {
            user.image_url = memberData.image_url;
          }
        });
      }

      logger.log(`✅ useUserData: Successfully fetched ${transformedUsers.length} users for company ${currentCompany?.id}`);
      logger.log('🔍 useUserData: User details:', transformedUsers.map(u => ({
        user_id: u.user_id,
        email: u.email,
        full_name: u.full_name,
        status: u.status,
        permission_level: u.permission_level,
        personality_color: u.personality_color,
        image_url: u.image_url,
        company_id: currentCompany?.id
      })));
      return transformedUsers;

    } catch (error) {
      logger.error('❌ useUserData: Failed to fetch users:', error);
      throw error;
    }
  }, [currentCompany?.id, includeInactive]);

  const {
    data: users = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery<UnifiedUser[]>({
    queryKey,
    queryFn: fetchUsers,
    retry: false,
  });

  // Helper function to invalidate all related queries for comprehensive sync
  const invalidateAllRelatedData = useCallback(() => {
    logger.log('🔄 useUserData: Invalidating all related data for comprehensive two-way sync');
    
    // Invalidate user-related queries
    queryClient.invalidateQueries({ queryKey: ['unified-users'] });
    queryClient.invalidateQueries({ queryKey: ['company-users'] });
    queryClient.invalidateQueries({ queryKey: ['userTeams'] });
    
    // ENHANCED: Invalidate team-related queries for sync with Teams tab
    queryClient.invalidateQueries({ queryKey: ['teams'] });
    queryClient.invalidateQueries({ queryKey: ['team-management'] });
    queryClient.invalidateQueries({ queryKey: ['team-members'] });
    queryClient.invalidateQueries({ queryKey: ['optimized-user-teams'] });
    
    // Invalidate company member queries
    queryClient.invalidateQueries({ queryKey: ['company-members'] });
    
    logger.log('✅ useUserData: All related data invalidated for two-way sync');
  }, [queryClient]);

  return {
    users,
    loading,
    error,
    refetch,
    queryKey,
    queryClient,
    invalidateAllRelatedData,
    currentUserId: user?.id
  };
};
