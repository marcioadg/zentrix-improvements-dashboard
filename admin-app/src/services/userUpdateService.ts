
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export const updateUserName = async (userId: string, newName: string): Promise<boolean> => {
  logger.log('🔄 updateUserName: Starting update:', { userId, newName });
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: newName })
      .eq('id', userId)
      .select();

    if (error) {
      logger.error('❌ updateUserName: Supabase error:', error);
      throw error;
    }
    
    logger.log('✅ updateUserName: Update successful:', data);
    return true;
  } catch (error) {
    logger.error('❌ updateUserName: Caught error:', error);
    throw error;
  }
};

export const updateUserFullName = async (userId: string, newName: string, companyId: string): Promise<boolean> => {
  logger.log('🔄 updateUserFullName: Starting update:', { userId, newName, companyId });
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: newName })
      .eq('id', userId)
      .select();

    if (error) {
      logger.error('❌ updateUserFullName: Supabase error:', error);
      throw error;
    }
    
    logger.log('✅ updateUserFullName: Update successful:', data);
    return true;
  } catch (error) {
    logger.error('❌ updateUserFullName: Caught error:', error);
    throw error;
  }
};

export const updateUserRole = async (userId: string, newPermissionLevel: string, companyId: string): Promise<boolean> => {
  logger.log('🔄 updateUserRole: Starting synchronized permission update:', { userId, newPermissionLevel, companyId });
  
  try {
    // Step 1: Update company_members table (primary source of truth) - using permission_level only
    logger.log('🔄 updateUserRole: Updating company_members permission_level');
    const { data: companyMemberData, error: companyMemberError } = await supabase
      .from('company_members')
      .update({ permission_level: newPermissionLevel })
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .select();

    if (companyMemberError) {
      logger.error('❌ updateUserRole: Error updating company_members:', companyMemberError);
      throw new Error(`Failed to update company permission: ${companyMemberError.message}`);
    }

    logger.log('✅ updateUserRole: Company members table updated:', companyMemberData);

    // Step 2: Verify the update worked
    logger.log('🔍 updateUserRole: Verifying update');
    const { data: verificationData, error: verifyError } = await supabase
      .from('company_members')
      .select('user_id, company_id, permission_level')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .single();

    if (verifyError) {
      logger.error('❌ updateUserRole: Error verifying update:', verifyError);
    } else {
      logger.log('✅ updateUserRole: Update verified:', verificationData);
    }
    
    return true;
  } catch (error) {
    logger.error('❌ updateUserRole: Caught error:', error);
    throw error;
  }
};

export const deactivateUserAccount = async (userId: string, companyId: string): Promise<void> => {
  logger.log('🔄 deactivateUserAccount: === SERVICE FUNCTION START ===');
  logger.log('🔄 deactivateUserAccount: Parameters:', { userId, companyId });
  
  try {
    // First, verify the user exists in company_members
    logger.log('🔍 deactivateUserAccount: Checking if user exists in company...');
    const { data: existingMember, error: checkError } = await supabase
      .from('company_members')
      .select('id, user_id, company_id, status, permission_level')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .maybeSingle();
    
    logger.log('🔍 deactivateUserAccount: Existing member check:', { existingMember, checkError });
    
    if (checkError) {
      logger.error('❌ deactivateUserAccount: Error checking existing member:', checkError);
      throw new Error(`Failed to verify user membership: ${checkError.message}`);
    }
    
    if (!existingMember) {
      logger.error('❌ deactivateUserAccount: User not found in company members');
      throw new Error('User is not a member of this company');
    }
    
    if (existingMember.status === 'inactive') {
      logger.warn('⚠️ deactivateUserAccount: User is already deactivated');
      logger.log('✅ deactivateUserAccount: No action needed - user already deactivated');
      return;
    }
    
    logger.log('✅ deactivateUserAccount: User exists and is active, proceeding with deactivation');
    logger.log('🔄 deactivateUserAccount: Current member state:', existingMember);
    
    // Update company_members table status to inactive (company-specific deactivation)
    logger.log('🔄 deactivateUserAccount: Setting status to inactive for company-specific deactivation');
    
    const updateResult = await supabase
      .from('company_members')
      .update({ 
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .select('id, user_id, company_id, status, updated_at');

    logger.log('🔄 deactivateUserAccount: Update query result:', {
      data: updateResult.data,
      error: updateResult.error,
      affectedRows: updateResult.data?.length || 0
    });

    if (updateResult.error) {
      logger.error('❌ deactivateUserAccount: Update failed:', updateResult.error);
      throw new Error(`Deactivation failed: ${updateResult.error.message}`);
    }

    if (!updateResult.data || updateResult.data.length === 0) {
      logger.error('❌ deactivateUserAccount: No rows were updated');
      throw new Error('Deactivation failed: No rows were updated');
    }

    logger.log('✅ deactivateUserAccount: Company member successfully deactivated:', updateResult.data[0]);
    
    // Verify the update was successful
    logger.log('🔍 deactivateUserAccount: Verifying deactivation...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('company_members')
      .select('status, updated_at')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .single();
    
    logger.log('🔍 deactivateUserAccount: Verification result:', { verifyData, verifyError });
    
    if (verifyError) {
      logger.warn('⚠️ deactivateUserAccount: Verification failed but deactivation might have succeeded');
    } else if (verifyData?.status === 'inactive') {
      logger.log('✅ deactivateUserAccount: Deactivation verified successfully');
    } else {
      logger.error('❌ deactivateUserAccount: Verification shows deactivation failed');
      throw new Error('Deactivation verification failed');
    }
    
    // Sync billing with Stripe (non-blocking)
    try {
      logger.log('💳 deactivateUserAccount: Syncing per-seat billing with Stripe...');
      const { error: billingError } = await supabase.functions.invoke('os-per-seat-billing', {
        body: { company_id: companyId, action: 'sync' }
      });
      if (billingError) {
        logger.error('⚠️ deactivateUserAccount: Billing sync failed (non-blocking):', billingError);
      } else {
        logger.log('✅ deactivateUserAccount: Billing synced successfully');
      }
    } catch (billingErr) {
      logger.error('⚠️ deactivateUserAccount: Billing sync exception (non-blocking):', billingErr);
    }

    logger.log('🔄 deactivateUserAccount: === SERVICE FUNCTION COMPLETED ===');
    
  } catch (error) {
    logger.error('❌ deactivateUserAccount: === SERVICE FUNCTION FAILED ===');
    logger.error('❌ deactivateUserAccount: Caught error:', error);
    logger.error('❌ deactivateUserAccount: Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      userId,
      companyId
    });
    throw error;
  }
};

export const reactivateUserAccount = async (userId: string, companyId: string): Promise<void> => {
  logger.log('🔄 reactivateUserAccount: === SERVICE FUNCTION START ===');
  logger.log('🔄 reactivateUserAccount: Parameters:', { userId, companyId });
  
  try {
    // First, verify the user exists in company_members and is inactive
    logger.log('🔍 reactivateUserAccount: Checking if user exists and is inactive...');
    const { data: existingMember, error: checkError } = await supabase
      .from('company_members')
      .select('id, user_id, company_id, status, permission_level')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .maybeSingle();
    
    logger.log('🔍 reactivateUserAccount: Existing member check:', { existingMember, checkError });
    
    if (checkError) {
      logger.error('❌ reactivateUserAccount: Error checking existing member:', checkError);
      throw new Error(`Failed to verify user membership: ${checkError.message}`);
    }
    
    if (!existingMember) {
      logger.error('❌ reactivateUserAccount: User not found in company members');
      throw new Error('User is not a member of this company');
    }
    
    if (existingMember.status === 'active') {
      logger.warn('⚠️ reactivateUserAccount: User is already active');
      logger.log('✅ reactivateUserAccount: No action needed - user already active');
      return;
    }
    
    if (existingMember.status !== 'inactive') {
      logger.error('❌ reactivateUserAccount: User is not in inactive status');
      throw new Error(`Cannot reactivate user with status: ${existingMember.status}`);
    }
    
    logger.log('✅ reactivateUserAccount: User exists and is inactive, proceeding with reactivation');
    logger.log('🔄 reactivateUserAccount: Current member state:', existingMember);
    
    // Update company_members table status to active
    logger.log('🔄 reactivateUserAccount: Setting status to active for reactivation');
    
    const updateResult = await supabase
      .from('company_members')
      .update({ 
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .select('id, user_id, company_id, status, updated_at');

    logger.log('🔄 reactivateUserAccount: Update query result:', {
      data: updateResult.data,
      error: updateResult.error,
      affectedRows: updateResult.data?.length || 0
    });

    if (updateResult.error) {
      logger.error('❌ reactivateUserAccount: Update failed:', updateResult.error);
      throw new Error(`Reactivation failed: ${updateResult.error.message}`);
    }

    if (!updateResult.data || updateResult.data.length === 0) {
      logger.error('❌ reactivateUserAccount: No rows were updated');
      throw new Error('Reactivation failed: No rows were updated');
    }

    logger.log('✅ reactivateUserAccount: Company member successfully reactivated:', updateResult.data[0]);
    
    // Verify the update was successful
    logger.log('🔍 reactivateUserAccount: Verifying reactivation...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('company_members')
      .select('status, updated_at')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .single();
    
    logger.log('🔍 reactivateUserAccount: Verification result:', { verifyData, verifyError });
    
    if (verifyError) {
      logger.warn('⚠️ reactivateUserAccount: Verification failed but reactivation might have succeeded');
    } else if (verifyData?.status === 'active') {
      logger.log('✅ reactivateUserAccount: Reactivation verified successfully');
    } else {
      logger.error('❌ reactivateUserAccount: Verification shows reactivation failed');
      throw new Error('Reactivation verification failed');
    }
    
    // Sync billing with Stripe (non-blocking)
    try {
      logger.log('💳 reactivateUserAccount: Syncing per-seat billing with Stripe...');
      const { error: billingError } = await supabase.functions.invoke('os-per-seat-billing', {
        body: { company_id: companyId, action: 'sync' }
      });
      if (billingError) {
        logger.error('⚠️ reactivateUserAccount: Billing sync failed (non-blocking):', billingError);
      } else {
        logger.log('✅ reactivateUserAccount: Billing synced successfully');
      }
    } catch (billingErr) {
      logger.error('⚠️ reactivateUserAccount: Billing sync exception (non-blocking):', billingErr);
    }

    logger.log('🔄 reactivateUserAccount: === SERVICE FUNCTION COMPLETED ===');
    
  } catch (error) {
    logger.error('❌ reactivateUserAccount: === SERVICE FUNCTION FAILED ===');
    logger.error('❌ reactivateUserAccount: Caught error:', error);
    logger.error('❌ reactivateUserAccount: Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      userId,
      companyId
    });
    throw error;
  }
}

export const deleteUserAccount = async (userId: string, companyId: string): Promise<void> => {
  logger.log('🔄 deleteUserAccount: Starting deletion:', { userId, companyId });
  
  try {
    // First remove from company_members table
    logger.log('🔄 deleteUserAccount: Removing from company_members');
    const { error: memberError } = await supabase
      .from('company_members')
      .delete()
      .eq('user_id', userId)
      .eq('company_id', companyId);

    if (memberError) {
      logger.error('❌ deleteUserAccount: Error removing company membership:', memberError);
      throw memberError;
    }

    logger.log('✅ deleteUserAccount: Company membership removed');

    // Get team IDs for this company first
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id')
      .eq('company_id', companyId);

    if (teamsError) {
      logger.error('❌ deleteUserAccount: Error fetching teams:', teamsError);
      // Continue with deletion even if this fails
    } else if (teams && teams.length > 0) {
      logger.log('🔄 deleteUserAccount: Removing team memberships');
      // Then remove from team memberships for this company
      const teamIds = teams.map(team => team.id);
      const { error: teamError } = await supabase
        .from('team_members')
        .delete()
        .eq('user_id', userId)
        .in('team_id', teamIds);

      if (teamError) {
        logger.error('❌ deleteUserAccount: Error removing team memberships:', teamError);
        // Don't throw here, continue with profile cleanup
      } else {
        logger.log('✅ deleteUserAccount: Team memberships removed');
      }
    }

    // Finally, clean up profile if this was the user's primary company
    logger.log('🔄 deleteUserAccount: Cleaning up profile company reference');
    const { data, error } = await supabase
      .from('profiles')
      .update({ company_id: null })
      .eq('id', userId)
      .eq('company_id', companyId)
      .select();

    if (error) {
      logger.error('❌ deleteUserAccount: Profile cleanup error:', error);
      // Don't throw error as the main deletion succeeded
      logger.warn('⚠️ Profile cleanup failed, but user removed from company');
    } else {
      logger.log('✅ deleteUserAccount: Profile cleaned up:', data);
    }
    
    logger.log('✅ deleteUserAccount: Deletion successful');
  } catch (error) {
    logger.error('❌ deleteUserAccount: Caught error:', error);
    throw error;
  }
};
