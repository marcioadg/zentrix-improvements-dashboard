
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CompanyUser } from '@/types/companyUser';
import { type UIPermissionLevel } from '@/utils/permissionMapping';
import { removeUserFromCompany } from '@/services/companyUserManagement';
import { logger } from '@/utils/logger';

interface CompanyMembership {
  company_id: string;
  permission_level: string;
}

export const useCompanyUsers = () => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const { profile } = useProfile();
  const { toast } = useToast();

  // Consistent query key for React Query
  const queryKey = ['company-users', currentCompany?.id];

  const fetchUsers = async (): Promise<CompanyUser[]> => {
    if (!currentCompany?.id) {
      return [];
    }

    try {
      // Use the existing database function which properly handles email confirmation status
      // Don't include inactive users in regular company user operations
      const { data: users, error } = await supabase
        .rpc('get_company_accessible_users', { 
          target_company_id: currentCompany?.id,
          include_inactive: false // Exclude inactive users from regular operations
        });

      if (error) {
        logger.error('❌ useCompanyUsers: Error fetching users:', error);
        throw error;
      }

      if (!users || users.length === 0) {
        return [];
      }

      // Transform the data to match CompanyUser interface
      const transformedUsers: CompanyUser[] = users.map(user => ({
        id: user.id,
        user_id: user.user_id, // Critical: This is the auth.users UUID needed for permission matching
        email: user.email,
        full_name: user.full_name,
        role: user.role, // This comes from permission_level via the database function
        permission_level: user.role, // Add explicit permission_level field for compatibility
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        access_type: user.access_type as 'direct' | 'team_member' | 'linked_company',
        email_confirmed_at: user.email_confirmed_at,
        company_memberships: [{
          company_id: currentCompany?.id,
          permission_level: user.role
        }],
        primary_company_id: currentCompany?.id
      }));

      return transformedUsers;

    } catch (error) {
      logger.error('❌ useCompanyUsers: Failed to fetch users:', error);
      throw error;
    }
  };

  const {
    data: users = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery<CompanyUser[]>({
    queryKey,
    queryFn: fetchUsers,
    retry: false,
  });

  const queryClient = useQueryClient();

  const updateUserRole = async (userId: string, newRole: UIPermissionLevel) => {
    if (!currentCompany?.id || !user?.id) {
      throw new Error('Missing company or user information');
    }

    logger.log('🔄 useCompanyUsers: Starting permission update:', { 
      userId, 
      newRole, 
      companyId: currentCompany?.id 
    });

    // Optimistic update
    queryClient.setQueryData(queryKey, (oldUsers: CompanyUser[] = []) => {
      return oldUsers.map(u => 
        u.id === userId ? { 
          ...u, 
          role: newRole,
          company_memberships: u.company_memberships?.map(cm => 
            cm.company_id === currentCompany?.id 
              ? { ...cm, permission_level: newRole }
              : cm
          )
        } : u
      );
    });
    
    try {
      // Use the correct update_user_permission function
      logger.log('🔄 useCompanyUsers: Calling update_user_permission function');
      const { data, error } = await supabase.rpc('update_user_permission', {
        p_user_id: userId,
        p_company_id: currentCompany?.id,
        p_field: 'permission_level',
        p_value: newRole,
        p_updated_by: user.id
      });

      if (error) {
        logger.error('❌ useCompanyUsers: Permission update error:', error);
        throw error;
      }

      logger.log('✅ useCompanyUsers: Permission update result:', data);

      // Wait a moment for the database update to fully commit
      await new Promise(resolve => setTimeout(resolve, 500));

      // Show success before invalidating cache
      toast({
        title: "Permission Updated",
        description: "User permission has been updated successfully.",
      });

      // Invalidate cache after a delay to ensure consistency
      setTimeout(() => {
        logger.log('🔄 useCompanyUsers: Invalidating cache after successful update');
        queryClient.invalidateQueries({ queryKey });
      }, 1000);

      logger.log('✅ useCompanyUsers: Permission update completed successfully');
    } catch (error) {
      logger.error('❌ useCompanyUsers: Permission update failed, reverting optimistic update:', error);
      
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey });
      
      toast({
        title: "Error",
        description: "Failed to update user permission. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateUserName = async (userId: string, newName: string): Promise<boolean> => {
    if (!currentCompany?.id || !user?.id) {
      throw new Error('Missing company or user information');
    }

    logger.log('🔄 useCompanyUsers: Updating user name:', { userId, newName, companyId: currentCompany?.id });

    // Optimistic update
    queryClient.setQueryData(queryKey, (oldUsers: CompanyUser[] = []) => {
      return oldUsers.map(u => 
        u.id === userId ? { ...u, full_name: newName } : u
      );
    });

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: newName })
        .eq('id', userId);

      if (error) {
        logger.error('❌ useCompanyUsers: Error updating user name:', error);
        
        // Revert optimistic update
        queryClient.invalidateQueries({ queryKey });
        
        toast({
          title: "Error",
          description: "Failed to update user name. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      // Wait for database commit
      await new Promise(resolve => setTimeout(resolve, 300));

      toast({
        title: "Name Updated",
        description: "User name has been updated successfully.",
      });

      // Delayed cache invalidation
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, 500);

      logger.log('✅ useCompanyUsers: User name updated successfully');
      return true;
    } catch (error) {
      logger.error('❌ useCompanyUsers: Failed to update user name:', error);
      queryClient.invalidateQueries({ queryKey });
      return false;
    }
  };

  const deactivateUser = async (userId: string) => {
    if (!currentCompany?.id || !user?.id) {
      throw new Error('Missing company or user information');
    }

    logger.log('🔄 useCompanyUsers: Deactivating user:', { userId, companyId: currentCompany?.id });

    // Optimistic update
    queryClient.setQueryData(queryKey, (oldUsers: CompanyUser[] = []) => {
      return oldUsers.map(u => 
        u.id === userId ? { ...u, role: 'view-only' } : u
      );
    });

    try {
      // Use the correct update_user_permission function to set to view-only
      const { data, error } = await supabase.rpc('update_user_permission', {
        p_user_id: userId,
        p_company_id: currentCompany?.id,
        p_field: 'permission_level',
        p_value: 'view-only',
        p_updated_by: user.id
      });

      if (error) {
        logger.error('❌ useCompanyUsers: Error deactivating user:', error);
        throw error;
      }

      // Wait for database commit
      await new Promise(resolve => setTimeout(resolve, 300));

      toast({
        title: "User Deactivated",
        description: "User has been set to view-only access.",
      });

      // Delayed cache invalidation
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, 500);

      logger.log('✅ useCompanyUsers: User deactivated successfully');
    } catch (error) {
      logger.error('❌ useCompanyUsers: Failed to deactivate user:', error);
      queryClient.invalidateQueries({ queryKey });
      throw error;
    }
  };

  const deleteUser = async (userId: string) => {
    if (!currentCompany?.id || !user?.id) {
      throw new Error('Missing company or user information');
    }

    logger.log('🔄 useCompanyUsers: Removing user from company:', { userId, companyId: currentCompany?.id });

    // Optimistic update
    queryClient.setQueryData(queryKey, (oldUsers: CompanyUser[] = []) => {
      return oldUsers.filter(u => u.id !== userId);
    });

    try {
      await removeUserFromCompany(userId, currentCompany?.id, user.id);

      // Wait for database commit
      await new Promise(resolve => setTimeout(resolve, 300));

      toast({
        title: "User Removed",
        description: "User has been removed from the company successfully.",
      });

      // Delayed cache invalidation
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, 500);

      logger.log('✅ useCompanyUsers: User removed from company successfully');
    } catch (error) {
      logger.error('❌ useCompanyUsers: Failed to remove user from company:', error);
      queryClient.invalidateQueries({ queryKey });
      throw error;
    }
  };

  const [isResending, setIsResending] = useState(false);

  const handleResendInvitation = async (targetUser: CompanyUser) => {
    if (!currentCompany?.id || !user?.id) {
      throw new Error('Missing company or user information');
    }

    setIsResending(true);
    logger.log('🔄 useCompanyUsers: Resending invitation:', { userId: targetUser.id, companyId: currentCompany?.id });

    try {
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: targetUser.email,
      });

      if (error) {
        logger.error('❌ useCompanyUsers: Error resending invitation:', error);
        toast({
          title: "Error",
          description: "Failed to resend invitation. Please try again.",
          variant: "destructive",
        });
        throw error;
      }

      toast({
        title: "Invitation Resent",
        description: "Invitation has been resent successfully.",
      });

      logger.log('✅ useCompanyUsers: Invitation resent successfully');
    } catch (error) {
      logger.error('❌ useCompanyUsers: Failed to resend invitation:', error);
      throw error;
    } finally {
      setIsResending(false);
    }
  };

  return {
    users,
    loading,
    error,
    updateUserName,
    updateUserRole,
    deactivateUser,
    deleteUser,
    handleResendInvitation,
    isResending,
    refetch
  };
};
