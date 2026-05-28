import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

export interface UserWithRoles {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  email_confirmed_at?: string;
  roles: string[];
}

export const useUserRoles = () => {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      logger.log('useUserRoles: Fetching all users with roles');

      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine the data
      const usersWithRoles = (profiles || []).map(profile => {
        const roles = (userRoles || [])
          .filter(ur => ur.user_id === profile.id)
          .map(ur => ur.role);
        
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name || 'Unknown User',
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
          email_confirmed_at: undefined, // We'll handle this separately if needed
          roles: roles
        };
      });

      logger.log('useUserRoles: Loaded users with roles:', usersWithRoles.length);
      setUsers(usersWithRoles);
    } catch (error) {
      logger.error('useUserRoles: Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const assignRole = async (userId: string, role: 'super_admin_assistant') => {
    try {
      logger.log('useUserRoles: Assigning role:', role, 'to user:', userId);

      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: role,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) {
        if (error.code === '23505') { // Unique violation
          toast({
            title: "Info",
            description: "User already has this role",
            variant: "default",
          });
          return;
        }
        throw error;
      }

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, roles: [...user.roles, role] }
          : user
      ));

      toast({
        title: "Success",
        description: "Role assigned successfully",
      });

      logger.log('useUserRoles: Role assigned successfully');
    } catch (error) {
      logger.error('useUserRoles: Error assigning role:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign role",
        variant: "destructive",
      });
    }
  };

  const removeRole = async (userId: string, role: 'super_admin_assistant') => {
    try {
      logger.log('useUserRoles: Removing role:', role, 'from user:', userId);

      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, roles: user.roles.filter(r => r !== role) }
          : user
      ));

      toast({
        title: "Success",
        description: "Role removed successfully",
      });

      logger.log('useUserRoles: Role removed successfully');
    } catch (error) {
      logger.error('useUserRoles: Error removing role:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove role",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    assignRole,
    removeRole,
    refetch: fetchUsers,
  };
};

// Hook to check if current user has specific roles
export const useCurrentUserRoles = () => {
  const { user } = useAuth();
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentUserRoles = async () => {
      if (!user) {
        setUserRoles([]);
        setLoading(false);
        return;
      }

      try {
        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          logger.error('useCurrentUserRoles: Error fetching user roles:', error);
          throw error;
        }

        const rolesList = (roles || []).map(r => r.role);
        logger.log('useCurrentUserRoles: Current user roles:', rolesList);
        setUserRoles(rolesList);
      } catch (error) {
        logger.error('useCurrentUserRoles: Error:', error);
        setUserRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUserRoles();
  }, [user]);

  const hasRole = (role: string): boolean => {
    return userRoles.includes(role);
  };

  const isSuperAdminAssistant = (): boolean => {
    return hasRole('super_admin_assistant');
  };

  const isSuperAdmin = (): boolean => {
    return hasRole('super_admin');
  };

  return {
    userRoles,
    loading,
    hasRole,
    isSuperAdminAssistant,
    isSuperAdmin
  };
};