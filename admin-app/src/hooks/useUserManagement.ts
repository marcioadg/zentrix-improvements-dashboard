
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useUserData } from './user-management/useUserData';
import { useUserPermissions } from './user-management/useUserPermissions';
import { useUserOperations } from './user-management/useUserOperations';
import { logger } from '@/utils/logger';

export interface UnifiedUser {
  user_id: string;
  id: string; // Alias for compatibility
  email: string;
  full_name: string;
  avatar_url?: string;
  role: string;
  permission_level: string;
  capabilities: string[];
  joined_at: string;
  created_at: string; // Added for CompanyUser compatibility
  email_confirmed_at?: string;
  access_type: 'direct' | 'team_member' | 'linked_company';
  company_memberships?: Array<{
    company_id: string;
    permission_level: string;
  }>;
  primary_company_id?: string | null;
  status?: string; // For invitation status (active, pending, declined)
  invited_at?: string; // For invitation timestamp
  image_url?: string | null; // Personality profile chart image URL from company_members
  personality_color?: 'red' | 'yellow' | 'green' | 'blue' | null; // Personality color
}

export const useUserManagement = (includeInactive: boolean = true) => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const { profile } = useProfile();

  // Use the new focused hooks
  const {
    users,
    loading,
    error,
    refetch,
    queryKey,
    queryClient,
    invalidateAllRelatedData,
    currentUserId
  } = useUserData(includeInactive);

  const {
    hasManagerAccess,
    isSuperAdmin,
    roleUpdating,
    updateUserPermission
  } = useUserPermissions({
    users,
    currentCompany,
    queryClient,
    queryKey,
    invalidateAllRelatedData
  });

  const {
    isResending,
    resendSuccess,
    updateUserName,
    handleResendInvitation
  } = useUserOperations({
    users,
    currentCompany,
    profile,
    user,
    queryClient,
    queryKey,
    invalidateAllRelatedData
  });

  // Enhanced real-time subscription with comprehensive updates
  useEffect(() => {
    if (!currentCompany?.id) return;

    const channel = supabase
      .channel('unified_users_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_members',
          filter: `company_id=eq.${currentCompany?.id}`
        },
        (payload) => {
          // Debounced invalidation to avoid rapid refetch loops
          setTimeout(() => {
            invalidateAllRelatedData();
          }, 1000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_permissions',
          filter: `company_id=eq.${currentCompany?.id}`
        },
        () => {
          setTimeout(() => {
            invalidateAllRelatedData();
          }, 1000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members'
        },
        () => {
          setTimeout(() => {
            invalidateAllRelatedData();
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentCompany?.id, invalidateAllRelatedData]);

  // Debug: final enhanced state (disabled to reduce noisy logs)
  // logger.log('🔍 useUserManagement: Final enhanced state:', {
  //   usersCount: users.length,
  //   loading,
  //   hasManagerAccess,
  //   isSuperAdmin,
  //   currentUserId,
  //   roleUpdating,
  //   currentCompany: currentCompany?.name
  // });

  return {
    users,
    loading,
    error,
    hasManagerAccess,
    isSuperAdmin,
    currentUserId,
    roleUpdating,
    isResending,
    resendSuccess,
    updateUserPermission,
    updateUserName,
    handleResendInvitation,
    refetch,
    // Export the comprehensive invalidation function for external use
    invalidateAllRelatedData
  };
};
