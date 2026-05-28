import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

/**
 * Leave a company (self-removal)
 * Checks if user can leave, then removes them from company
 * Returns success status and whether user has other companies
 */
export const leaveCompany = async (
  userId: string,
  companyId: string
): Promise<{ success: boolean; hasOtherCompanies: boolean; error?: string }> => {
  logger.log('🚪 leaveCompany: Starting self-removal for user:', userId, 'from company:', companyId);

  try {
    // First, check if user can leave (not sole director/owner)
    const { data: canLeave, error: checkError } = await supabase.rpc('can_leave_company', {
      p_user_id: userId,
      p_company_id: companyId
    });

    if (checkError) {
      logger.error('❌ leaveCompany: Error checking permissions:', checkError);
      return { 
        success: false, 
        hasOtherCompanies: false, 
        error: 'Failed to verify permissions' 
      };
    }

    if (!canLeave) {
      logger.log('❌ leaveCompany: User cannot leave - sole director/owner');
      return {
        success: false,
        hasOtherCompanies: false,
        error: 'You cannot leave this company as you are the only director/owner. Please transfer ownership first.'
      };
    }

    logger.log('✅ leaveCompany: User can leave company');

    // Remove user from company_members
    const { error: removalError } = await supabase
      .from('company_members')
      .delete()
      .eq('user_id', userId)
      .eq('company_id', companyId);

    if (removalError) {
      logger.error('❌ leaveCompany: Error removing from company:', removalError);
      return {
        success: false,
        hasOtherCompanies: false,
        error: 'Failed to leave company'
      };
    }

    logger.log('✅ leaveCompany: Successfully removed from company_members');

    // Clean up invitations
    const { error: invitationError } = await supabase
      .from('invitations')
      .delete()
      .eq('user_id', userId)
      .eq('company_id', companyId);

    if (invitationError) {
      logger.warn('⚠️ leaveCompany: Error cleaning up invitations:', invitationError);
    }

    // Remove from all teams in this company
    const { data: companyTeams, error: teamsQueryError } = await supabase
      .from('teams')
      .select('id')
      .eq('company_id', companyId);

    if (teamsQueryError) {
      logger.warn('⚠️ leaveCompany: Error fetching company teams:', teamsQueryError);
    } else if (companyTeams && companyTeams.length > 0) {
      const teamIds = companyTeams.map(team => team.id);

      const { error: teamRemovalError } = await supabase
        .from('team_members')
        .delete()
        .eq('user_id', userId)
        .in('team_id', teamIds);

      if (teamRemovalError) {
        logger.warn('⚠️ leaveCompany: Error removing from teams:', teamRemovalError);
      } else {
        logger.log('✅ leaveCompany: Removed from all company teams');
      }
    }

    // Check if user has other company memberships
    const { data: otherMemberships, error: otherMembershipsError } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (otherMembershipsError) {
      logger.error('⚠️ leaveCompany: Error checking other memberships:', otherMembershipsError);
    }

    const hasOtherCompanies = (otherMemberships?.length || 0) > 0;

    logger.log('✅ leaveCompany: Self-removal complete. Has other companies:', hasOtherCompanies);

    // Sync billing with Stripe (non-blocking)
    try {
      logger.log('💳 leaveCompany: Syncing per-seat billing...');
      const { error: billingError } = await supabase.functions.invoke('os-per-seat-billing', {
        body: { company_id: companyId, action: 'sync' }
      });
      if (billingError) {
        logger.error('⚠️ leaveCompany: Billing sync failed (non-blocking):', billingError);
      } else {
        logger.log('✅ leaveCompany: Billing synced successfully');
      }
    } catch (billingErr) {
      logger.error('⚠️ leaveCompany: Billing sync exception (non-blocking):', billingErr);
    }

    // Note: User leaving company tracking removed - users cannot leave companies, only delete their accounts

    return {
      success: true,
      hasOtherCompanies
    };
  } catch (error) {
    logger.error('💥 leaveCompany: Unexpected error:', error);
    return {
      success: false,
      hasOtherCompanies: false,
      error: 'An unexpected error occurred'
    };
  }
};
