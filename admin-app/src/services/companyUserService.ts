
import { supabase } from '@/integrations/supabase/client';
import { CompanyUser } from '@/types/companyUser';
import { logger } from '@/utils/logger';

export const loadCompanyUsers = async (userId: string | undefined, companyId: string | undefined): Promise<CompanyUser[]> => {
  if (!userId) {
    logger.log('loadCompanyUsers: No authenticated user');
    return [];
  }

  if (!companyId) {
    logger.log('loadCompanyUsers: No company selected');
    return [];
  }

  logger.log('loadCompanyUsers: Loading company users for user:', userId, 'company:', companyId);
  
  // Use the working company accessible users function
  // Don't include inactive users in regular service operations
  const { data, error } = await supabase
    .rpc('get_company_accessible_users', { 
      target_company_id: companyId,
      include_inactive: false // Exclude inactive users from regular operations
    });

  if (error) {
    logger.error('loadCompanyUsers: Error loading company users:', error);
    throw error;
  }
  
  logger.log('loadCompanyUsers: Company users loaded successfully for company:', companyId, data?.length || 0, 'users');
  
  // Map users with proper access type casting
  const typedUsers: CompanyUser[] = (data || []).map(user => ({
    ...user,
    access_type: (user.access_type as 'direct' | 'team_member' | 'linked_company') || 'direct'
  }));
  
  return typedUsers;
};

export const resendInvitation = async (user: CompanyUser, companyId: string, inviterId: string): Promise<boolean> => {
  try {
    logger.log('resendInvitation: Resending invitation for user:', user.email);
    
    const { data, error } = await supabase.functions.invoke('os-invite-user', {
      body: {
        email: user.email,
        fullName: user.full_name,
        companyId: companyId,
        invitedBy: inviterId,
        teamIds: [],
      },
    });

    if (error) {
      logger.error('resendInvitation: Error resending invitation:', error);
      
      // Map specific errors to user-friendly messages
      if (error.message?.includes('Insufficient permissions') || 
          error.status === 403 || error.status === 401) {
        throw new Error('Only managers or above can send invitations');
      }
      
      throw error;
    }

    logger.log('resendInvitation: Invitation resent successfully:', data);
    return data.success;
  } catch (error) {
    logger.error('resendInvitation: Failed to resend invitation:', error);
    throw error;
  }
};
