
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedUser } from '@/hooks/useUserManagement';
import { hasManagerAccess as checkManagerAccess } from './userAccessService';
import { logger } from '@/utils/logger';

interface UseUserPermissionsProps {
  users: UnifiedUser[];
  currentCompany: any;
  queryClient: any;
  queryKey: any[];
  invalidateAllRelatedData: () => void;
}

export const useUserPermissions = ({
  users,
  currentCompany,
  queryClient,
  queryKey,
  invalidateAllRelatedData
}: UseUserPermissionsProps) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null);

  // Enhanced permission checking
  const hasManagerAccess = useCallback(() => {
    return checkManagerAccess(profile, currentCompany, user?.id, users, queryClient, queryKey);
  }, [profile, currentCompany, user?.id, users, queryClient, queryKey]);

  // Enhanced permission update function with better error handling
  const updateUserPermission = async (userId: string, field: 'permission_level', value: string) => {
    if (!currentCompany?.id || !user?.id) {
      throw new Error('Missing company or user information');
    }

    // Enhanced permission check
    const userHasAccess = hasManagerAccess();
    if (!userHasAccess) {
      const errorMsg = "You don't have permission to change user permissions";
      logger.error('❌ useUserPermissions: Permission denied:', errorMsg);
      toast({
        title: "Access Denied",
        description: errorMsg,
        variant: "destructive",
      });
      throw new Error(errorMsg);
    }

    logger.log('🔄 useUserPermissions: Starting enhanced permission update:', { 
      userId, 
      field,
      value,
      companyId: currentCompany?.id,
      updatedBy: user.id
    });

    setRoleUpdating(userId);

    // Get current data for rollback
    const currentData = (queryClient.getQueryData(queryKey) as UnifiedUser[]) || [];
    const targetUser = currentData.find(u => u.user_id === userId);
    
    if (!targetUser) {
      throw new Error('Target user not found');
    }

    // Optimistic update - only update permission_level, not role
    queryClient.setQueryData(queryKey, (oldUsers: UnifiedUser[] = []) => {
      return oldUsers.map(u => 
        u.user_id === userId ? { 
          ...u, 
          permission_level: value,
        } : u
      );
    });
    
    try {
      logger.log('🔄 useUserPermissions: Calling enhanced database function');
      const { data, error } = await supabase.rpc('update_user_permission', {
        p_user_id: userId,
        p_company_id: currentCompany?.id,
        p_field: field,
        p_value: value,
        p_updated_by: user.id
      });

      if (error) {
        logger.error('❌ useUserPermissions: Database function error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      logger.log('🔍 useUserPermissions: Database function response:', data);

      const response = data as { success: boolean; error?: string; old_value?: string; new_value?: string };
      
      if (!response.success) {
        throw new Error(response.error || 'Permission update failed');
      }

      // Track role change
      try {
        const { trackTeamMemberRoleChanged } = await import('@/lib/statsigAnalytics');
        trackTeamMemberRoleChanged({
          user_id: user?.id,
          company_id: currentCompany?.id,
          target_user_id: userId,
          old_role: response.old_value || targetUser.permission_level,
          new_role: response.new_value || value,
        });
      } catch (e) {
        // Non-blocking
      }

      // Show success toast
      toast({
        title: "Permission Updated",
        description: `${targetUser.full_name}'s role has been updated to ${value}.`,
      });

      // Immediate cache invalidation for immediate UI sync
      logger.log('🔄 useUserPermissions: Triggering immediate invalidation after successful update');
      invalidateAllRelatedData();

      logger.log('✅ useUserPermissions: Enhanced permission update completed successfully');
      return true;
    } catch (error) {
      logger.error('❌ useUserPermissions: Permission update failed, reverting optimistic update:', error);
      
      // Revert optimistic update
      queryClient.setQueryData(queryKey, currentData);
      
      // Show enhanced error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Update Failed",
        description: `Failed to update permission: ${errorMessage}`,
        variant: "destructive",
      });
      
      throw error;
    } finally {
      setRoleUpdating(null);
    }
  };

  // Check if user is super admin via company membership
  const isSuperAdmin = users.find(u => u.user_id === user?.id)?.permission_level === 'super_admin';

  return {
    hasManagerAccess: hasManagerAccess(),
    isSuperAdmin,
    roleUpdating,
    updateUserPermission
  };
};
