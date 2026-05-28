
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface UserPermission {
  user_id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: string;
  permission_level: string;
  capabilities: string[];
  joined_at: string;
  email_confirmed_at?: string;
}

export const usePermissionsManagement = (companyId?: string) => {
  const [users, setUsers] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    if (!companyId) return;
    
    try {
      logger.log('🔍 Fetching users for company:', companyId);
      const { data, error } = await supabase.rpc('get_company_accessible_users', {
        target_company_id: companyId,
        include_inactive: false // Exclude inactive users from permissions management
      });

      if (error) throw error;

      logger.log('✅ Users fetched:', data);
      
      // Transform data to match expected interface
      const transformedUsers: UserPermission[] = (data || []).map(user => ({
        user_id: user.id,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        role: user.role,
        permission_level: user.permission_level, // Use permission_level from database
        capabilities: [], // Default empty capabilities
        joined_at: user.created_at,
        email_confirmed_at: user.email_confirmed_at,
      }));
      
      setUsers(transformedUsers);
    } catch (error) {
      logger.error('🚨 Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [companyId, toast]);

  const updateUserPermission = useCallback(async (
    userId: string, 
    field: 'role' | 'permission_level', 
    value: string
  ) => {
    if (!companyId) return false;

    try {
      logger.log('🔄 Updating user permission:', { userId, field, value });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('update_user_permission', {
        p_user_id: userId,
        p_company_id: companyId,
        p_field: field,
        p_value: value,
        p_updated_by: user.id
      });

      if (error) throw error;

      const response = data as { success: boolean; error?: string; old_value?: string; new_value?: string };
      
      if (!response.success) {
        throw new Error(response.error || 'Update failed');
      }

      logger.log('✅ Permission updated successfully');
      toast({
        title: "Success",
        description: `User ${field} updated successfully`,
      });

      // Refresh users to get updated capabilities
      await fetchUsers();
      return true;
    } catch (error: any) {
      logger.error('🚨 Error updating permission:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update permission",
        variant: "destructive",
      });
      return false;
    }
  }, [companyId, fetchUsers, toast]);

  // Set up real-time subscription
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('permissions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          logger.log('🔄 Real-time profile update received:', payload);
          fetchUsers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_members',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          logger.log('🔄 Real-time company membership update received:', payload);
          fetchUsers();
        }
      )
      .subscribe((status) => {
        logger.log('📡 Real-time subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, fetchUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    isConnected,
    updateUserPermission,
    refreshUsers: fetchUsers,
  };
};
