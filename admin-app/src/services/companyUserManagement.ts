import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

/**
 * Remove user from a specific company (not from the entire system)
 * This only removes them from company_members table
 */
export const removeUserFromCompany = async (
  userId: string, 
  companyId: string, 
  currentUserId: string
): Promise<boolean> => {
  logger.log('🏢 removeUserFromCompany: Starting removal process for user:', userId, 'from company:', companyId);
  logger.log('🏢 removeUserFromCompany: Current user ID:', currentUserId);
  
  // Check if user is trying to remove themselves
  if (userId === currentUserId) {
    logger.log('❌ removeUserFromCompany: User attempting to remove themselves');
    throw new Error('SELF_REMOVAL');
  }
  
  try {
    // Get current user's permissions in this company
    const { data: currentUserMembership, error: currentUserError } = await supabase
      .from('company_members')
      .select('permission_level')
      .eq('user_id', currentUserId)
      .eq('company_id', companyId)
      .single();
    
    if (currentUserError) {
      logger.error('❌ removeUserFromCompany: Error fetching current user membership:', currentUserError);
      throw new Error(`Failed to verify permissions: ${currentUserError.message}`);
    }
    
    // Check if current user has admin permissions
    const hasAdminAccess = ['director', 'admin', 'owner', 'super_admin'].includes(currentUserMembership.permission_level);
    
    // Also check if user is global super admin
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUserId)
      .single();
    
    const isGlobalSuperAdmin = currentUserProfile?.role === 'super_admin';
    
    if (!hasAdminAccess && !isGlobalSuperAdmin) {
      throw new Error('Insufficient permissions to remove user from company');
    }
    
    logger.log('🔐 removeUserFromCompany: Permission check passed:', {
      hasAdminAccess,
      isGlobalSuperAdmin,
      currentUserPermission: currentUserMembership.permission_level
    });
    
    // Add comprehensive debugging for the input parameters
    logger.log('🔍 removeUserFromCompany: Input parameters:', {
      userId: userId,
      userIdType: typeof userId,
      userIdIsNull: userId === null,
      userIdIsUndefined: userId === undefined,
      userIdIsEmpty: userId === '',
      userIdIsNullString: userId === 'null',
      companyId: companyId,
      currentUserId: currentUserId
    });
    
    // Validate that userId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!userId || !uuidRegex.test(userId)) {
      logger.error('❌ removeUserFromCompany: Invalid userId format:', userId);
      throw new Error('Invalid user identifier provided');
    }
    
    // First, try to find the company member record by the provided ID (most likely scenario)
    logger.log('🔍 removeUserFromCompany: Searching by company_members.id:', userId);
    
    const { data: targetUserMembership, error: targetUserError } = await supabase
      .from('company_members')
      .select('permission_level, user_id, email, status, id')
      .eq('id', userId)
      .eq('company_id', companyId)
      .maybeSingle();
    
    logger.log('🔍 removeUserFromCompany: Query by company_members.id result:', {
      found: !!targetUserMembership,
      error: targetUserError,
      data: targetUserMembership
    });
    
    let finalTargetMembership = targetUserMembership;
    
    // If not found by company_members.id, try by user_id (for backwards compatibility with active users)
    if (!targetUserMembership && !targetUserError) {
      logger.log('🔍 removeUserFromCompany: Not found by company_members.id, trying by user_id');
      
      const { data: userIdResult, error: userIdError } = await supabase
        .from('company_members')
        .select('permission_level, user_id, email, status, id')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .maybeSingle();
      
      logger.log('🔍 removeUserFromCompany: Query by user_id result:', {
        found: !!userIdResult,
        error: userIdError,
        data: userIdResult
      });
      
      finalTargetMembership = userIdResult;
    }
    
    if (!finalTargetMembership) {
      const errorMessage = targetUserError ? 
        `Database error: ${targetUserError.message}` : 
        'User is not a member of this company';
      logger.error('❌ removeUserFromCompany: Target user not found in company:', {
        userId,
        companyId,
        targetUserError
      });
      throw new Error(errorMessage);
    }
    
    logger.log('🎯 removeUserFromCompany: Target user membership found:', {
      id: finalTargetMembership.id,
      user_id: finalTargetMembership.user_id,
      email: finalTargetMembership.email,
      status: finalTargetMembership.status
    });
    
    // Remove user from company_members using the record ID
    const { error: removalError } = await supabase
      .from('company_members')
      .delete()
      .eq('id', finalTargetMembership.id);
    
    if (removalError) {
      logger.error('❌ removeUserFromCompany: Error removing user from company:', removalError);
      throw new Error(`Failed to remove user from company: ${removalError.message}`);
    }
    
    // Clean up invitations for this user/email and company
    logger.log('🧹 removeUserFromCompany: Cleaning up invitations');
    
    // Remove invitations by user_id if the user has one
    if (finalTargetMembership.user_id) {
      const { error: invitationByUserError } = await supabase
        .from('invitations')
        .delete()
        .eq('user_id', finalTargetMembership.user_id)
        .eq('company_id', companyId);
      
      if (invitationByUserError) {
        logger.warn('⚠️ removeUserFromCompany: Error removing invitations by user_id:', invitationByUserError);
      }
    }
    
    // Remove invitations by email if the user has one (for pending invitations)
    if (finalTargetMembership.email) {
      const { error: invitationByEmailError } = await supabase
        .from('invitations')
        .delete()
        .eq('email', finalTargetMembership.email)
        .eq('company_id', companyId);
      
      if (invitationByEmailError) {
        logger.warn('⚠️ removeUserFromCompany: Error removing invitations by email:', invitationByEmailError);
      }
    }
    
    logger.log('✅ removeUserFromCompany: Invitation cleanup completed');
    
    // Only remove from teams if this was an active user (declined/pending users aren't in teams)
    if (finalTargetMembership.user_id && finalTargetMembership.status === 'active') {
      logger.log('🧹 removeUserFromCompany: Cleaning up team memberships for active user');
      
      // Remove user from all teams in this company
      const { data: companyTeams, error: teamsQueryError } = await supabase
        .from('teams')
        .select('id')
        .eq('company_id', companyId);
      
      if (teamsQueryError) {
        logger.error('⚠️ removeUserFromCompany: Error fetching company teams:', teamsQueryError);
      } else if (companyTeams && companyTeams.length > 0) {
        const teamIds = companyTeams.map(team => team.id);
        
        const { error: teamRemovalError } = await supabase
          .from('team_members')
          .delete()
          .eq('user_id', finalTargetMembership.user_id)
          .in('team_id', teamIds);
        
        if (teamRemovalError) {
          logger.error('⚠️ removeUserFromCompany: Error removing user from teams (non-critical):', teamRemovalError);
          // This is non-critical, don't throw
        } else {
          logger.log('✅ removeUserFromCompany: User removed from all company teams');
        }
      }
    } else {
      logger.log('✅ removeUserFromCompany: Skipping team removal for declined/pending invitation');
    }
    
    logger.log('✅ removeUserFromCompany: User removed from company successfully');
    
    // Sync billing with Stripe (non-blocking)
    try {
      logger.log('💳 removeUserFromCompany: Syncing per-seat billing with Stripe...');
      const { error: billingError } = await supabase.functions.invoke('os-per-seat-billing', {
        body: { company_id: companyId, action: 'sync' }
      });
      if (billingError) {
        logger.error('⚠️ removeUserFromCompany: Billing sync failed (non-blocking):', billingError);
      } else {
        logger.log('✅ removeUserFromCompany: Billing synced successfully');
      }
    } catch (billingErr) {
      logger.error('⚠️ removeUserFromCompany: Billing sync exception (non-blocking):', billingErr);
    }
    
    return true;
    
  } catch (error) {
    logger.error('💥 removeUserFromCompany: Unexpected error:', error);
    throw error;
  }
};

/**
 * Check if user is a member of multiple companies
 * Returns true if user has memberships in other companies
 */
export const checkUserMultiCompanyMembership = async (userId: string, excludeCompanyId: string): Promise<boolean> => {
  try {
    const { data: memberships, error } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', userId)
      .neq('company_id', excludeCompanyId);
    
    if (error) {
      logger.error('❌ checkUserMultiCompanyMembership: Error checking memberships:', error);
      return false;
    }
    
    return (memberships?.length || 0) > 0;
  } catch (error) {
    logger.error('💥 checkUserMultiCompanyMembership: Unexpected error:', error);
    return false;
  }
};