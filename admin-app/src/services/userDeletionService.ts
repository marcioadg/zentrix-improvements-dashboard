
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export const deactivateUser = async (userId: string, currentUserId: string | undefined): Promise<boolean> => {
  logger.log('🔄 deactivateUser: Starting deactivation process for user:', userId);
  logger.log('🔄 deactivateUser: Current user ID:', currentUserId);
  
  // Check if user is trying to deactivate themselves
  if (userId === currentUserId) {
    logger.log('❌ deactivateUser: User attempting to deactivate themselves');
    throw new Error('SELF_DEACTIVATION');
  }
  
  try {
    // Get current user's role for debugging
    const { data: currentUser, error: currentUserError } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', currentUserId)
      .single();
    
    if (currentUserError) {
      logger.error('❌ deactivateUser: Error fetching current user profile:', currentUserError);
      throw new Error(`Failed to verify permissions: ${currentUserError.message}`);
    }
    
    logger.log('👤 deactivateUser: Current user profile:', currentUser);
    
    // Get target user's profile for debugging
    const { data: targetUser, error: targetUserError } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', userId)
      .single();
    
    if (targetUserError) {
      logger.error('❌ deactivateUser: Error fetching target user profile:', targetUserError);
      throw new Error(`Target user not found: ${targetUserError.message}`);
    }
    
    logger.log('🎯 deactivateUser: Target user profile:', targetUser);
    
    // Check permissions before attempting deactivation
    // Only super_admin can deactivate users via this function
    const canDeactivate = currentUser.role === 'super_admin';
    
    logger.log('🔐 deactivateUser: Permission check result:', {
      canDeactivate,
      currentUserRole: currentUser.role,
      targetUserRole: targetUser.role
    });
    
    if (!canDeactivate) {
      throw new Error(`Insufficient permissions to deactivate user with role "${targetUser.role}"`);
    }
    
    // Attempt to deactivate user by updating both their role and company membership status
    logger.log('📝 deactivateUser: Attempting to update user role to inactive...');
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: 'inactive' })
      .eq('id', userId)
      .select();

    // Also update company_members status to inactive and remove from teams
    if (!error && data && data.length > 0) {
      logger.log('📝 deactivateUser: Updating company membership status to inactive...');
      const { error: companyMemberError } = await supabase
        .from('company_members')
        .update({ status: 'inactive' })
        .eq('user_id', userId);
      
      if (companyMemberError) {
        logger.error('❌ deactivateUser: Error updating company membership:', companyMemberError);
        // Continue anyway since profile update was successful
      }

      // Remove user from all teams in the company using the new function
      logger.log('🚮 deactivateUser: Removing user from all teams in the company...');
      
      const { data: targetUserCompany, error: targetCompanyError } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', userId)
        .single();
      
      if (!targetCompanyError && targetUserCompany) {
        const { error: teamRemovalError } = await supabase
          .rpc('remove_user_from_company_teams', {
            p_user_id: userId,
            p_company_id: targetUserCompany.company_id
          });
        
        if (teamRemovalError) {
          logger.error('❌ deactivateUser: Error removing user from teams:', teamRemovalError);
        } else {
          logger.log('✅ deactivateUser: Successfully removed user from all company teams');
        }
      } else {
        logger.error('❌ deactivateUser: Error getting user company:', targetCompanyError);
      }
      
      // Sync billing with Stripe (non-blocking)
      if (!targetCompanyError && targetUserCompany) {
        try {
          logger.log('💳 deactivateUser: Syncing per-seat billing with Stripe...');
          const { error: billingError } = await supabase.functions.invoke('os-per-seat-billing', {
            body: { company_id: targetUserCompany.company_id, action: 'sync' }
          });
          if (billingError) {
            logger.error('⚠️ deactivateUser: Billing sync failed (non-blocking):', billingError);
          } else {
            logger.log('✅ deactivateUser: Billing synced successfully');
          }
        } catch (billingErr) {
          logger.error('⚠️ deactivateUser: Billing sync exception (non-blocking):', billingErr);
        }
      }
    }

    if (error) {
      logger.error('❌ deactivateUser: Database error during deactivation:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }
    
    if (!data || data.length === 0) {
      logger.error('❌ deactivateUser: No rows were updated - user may not exist or access denied');
      throw new Error('Failed to deactivate user - no rows updated. Check permissions or user existence.');
    }
    
    logger.log('✅ deactivateUser: User deactivated successfully:', data);
    return true;
  } catch (error) {
    logger.error('💥 deactivateUser: Unexpected error:', error);
    throw error;
  }
};

export const deleteUser = async (userId: string, currentUserId: string | undefined, transferToUserId?: string): Promise<boolean> => {
  logger.log('🗑️ deleteUser: Starting deletion process for user:', userId);
  logger.log('🗑️ deleteUser: Current user ID:', currentUserId);
  logger.log('🗑️ deleteUser: Transfer to user ID:', transferToUserId);
  
  // Check if user is trying to delete themselves
  if (userId === currentUserId) {
    logger.log('❌ deleteUser: User attempting to delete themselves');
    throw new Error('SELF_DELETION');
  }
  
  try {
    // Check if user exists before deletion
    const { data: userToDelete, error: userCheckError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', userId)
      .single();
    
    if (userCheckError || !userToDelete) {
      logger.log('ℹ️ deleteUser: User not found - may already be deleted');
      return true; // Consider already deleted as success
    }
    
    logger.log('🔍 deleteUser: User to delete:', userToDelete);
    
    // Get current user's role for permission checking
    const { data: currentUser, error: currentUserError } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', currentUserId)
      .single();
    
    if (currentUserError) {
      logger.error('❌ deleteUser: Error fetching current user profile:', currentUserError);
      throw new Error(`Failed to verify permissions: ${currentUserError.message}`);
    }
    
    logger.log('👤 deleteUser: Current user profile:', currentUser);
    
    // Only super admins can delete users (for security)
    if (currentUser.role !== 'super_admin') {
      throw new Error('Only super administrators can delete user accounts');
    }
    
    logger.log('🔐 deleteUser: Calling edge function for secure deletion');
    
    // Call the edge function for secure deletion
    const { data, error } = await supabase.functions.invoke('os-delete-user', {
      body: {
        userIds: [userId],
        currentUserId: currentUserId!,
        transferToUserId
      }
    });
    
    logger.log('📋 deleteUser: Edge function response:', { data, error });
    
    if (error) {
      logger.error('❌ deleteUser: Edge function error:', error);
      
      // If edge function fails, try direct deletion as fallback
      logger.log('🔄 deleteUser: Attempting direct deletion fallback');
      return await deleteUserDirectly(userId);
    }
    
    if (!data || !data.success) {
      const errorMsg = data?.errors?.[0]?.error || 'Unknown deletion error';
      logger.error('❌ deleteUser: Edge function reported failure:', errorMsg);
      
      // Try direct deletion as fallback
      logger.log('🔄 deleteUser: Attempting direct deletion fallback');
      return await deleteUserDirectly(userId);
    }
    
    // Verify deletion actually worked
    const { data: verifyUser, error: verifyError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (!verifyError && verifyUser) {
      logger.error('❌ deleteUser: User still exists after deletion attempt');
      throw new Error('Deletion failed - user still exists in database');
    }
    
    logger.log('✅ deleteUser: Deletion verified successfully');
    return true;
    
  } catch (error) {
    logger.error('💥 deleteUser: Unexpected error:', error);
    throw error;
  }
};

// Add direct deletion fallback
export const deleteUserDirectly = async (userId: string): Promise<boolean> => {
  logger.log('🗑️ deleteUserDirectly: Direct database deletion for user:', userId);
  
  try {
    // Step-by-step cleanup with detailed logging
    logger.log('🔗 deleteUserDirectly: Removing team memberships...');
    await supabase.from('team_members').delete().eq('user_id', userId);
    
    logger.log('🔗 deleteUserDirectly: Removing company memberships...');
    await supabase.from('company_members').delete().eq('user_id', userId);
    
    logger.log('🧹 deleteUserDirectly: Cleaning up user data...');
    await supabase.from('team_goals').delete().eq('owner_id', userId).eq('is_company_goal', false);
    await supabase.from('tasks').delete().eq('user_id', userId);
    await supabase.from('kanban_tasks').delete().eq('user_id', userId);
    await supabase.from('fast_tasks').delete().eq('user_id', userId);
    await supabase.from('user_settings').delete().eq('user_id', userId);
    await supabase.from('assignments').delete().eq('user_id', userId);
    await supabase.from('user_lesson_progress').delete().eq('user_id', userId);
    await supabase.from('issue_votes').delete().eq('user_id', userId);
    await supabase.from('issue_ratings').delete().eq('user_id', userId);
    
    // Note: role_assignments are handled by database trigger to maintain org chart structure
    
    logger.log('🔄 deleteUserDirectly: Updating array references...');
    // Update fast_tasks assigned_to array by removing the user
    const { data: tasksWithUser, error: fetchError } = await supabase
      .from('fast_tasks')
      .select('id, assigned_to')
      .contains('assigned_to', [userId]);
    
    if (!fetchError && tasksWithUser) {
      for (const task of tasksWithUser) {
        const updatedAssignedTo = (task.assigned_to as string[]).filter(id => id !== userId);
        await supabase
          .from('fast_tasks')
          .update({ assigned_to: updatedAssignedTo })
          .eq('id', task.id);
      }
    }
    
    await supabase.from('team_tasks').update({ assigned_to: null }).eq('assigned_to', userId);
    await supabase.from('weekly_metrics').update({ owner_id: null }).eq('owner_id', userId);
    
    logger.log('👤 deleteUserDirectly: Deleting profile...');
    const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId);
    
    if (profileError) {
      logger.error('❌ deleteUserDirectly: Profile deletion failed:', profileError);
      throw profileError;
    }
    
    // Verify deletion worked
    logger.log('🔍 deleteUserDirectly: Verifying deletion...');
    const { data: verifyUser, error: verifyError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (!verifyError && verifyUser) {
      logger.error('❌ deleteUserDirectly: User still exists after deletion');
      throw new Error('Deletion verification failed - user still exists');
    }
    
    logger.log('✅ deleteUserDirectly: User deleted and verified successfully');
    return true;
    
  } catch (error) {
    logger.error('💥 deleteUserDirectly: Error:', error);
    throw error;
  }
};

export const reactivateUser = async (userId: string, currentUserId: string | undefined, companyId: string): Promise<boolean> => {
  logger.log('🔄 reactivateUser: Starting reactivation process for user:', userId);
  logger.log('🔄 reactivateUser: Current user ID:', currentUserId);
  logger.log('🔄 reactivateUser: Company ID:', companyId);
  
  // Check if user is trying to reactivate themselves
  if (userId === currentUserId) {
    logger.log('❌ reactivateUser: User attempting to reactivate themselves');
    throw new Error('SELF_REACTIVATION');
  }
  
  try {
    // Get current user's role and company for permission verification
    const { data: currentUser, error: currentUserError } = await supabase
      .from('profiles')
      .select('id, role, company_id, full_name')
      .eq('id', currentUserId)
      .single();
    
    if (currentUserError) {
      logger.error('❌ reactivateUser: Error fetching current user profile:', currentUserError);
      throw new Error(`Failed to verify permissions: ${currentUserError.message}`);
    }
    
    logger.log('👤 reactivateUser: Current user profile:', currentUser);
    
    // Get target user's profile
    const { data: targetUser, error: targetUserError } = await supabase
      .from('profiles')
      .select('id, role, company_id, full_name')
      .eq('id', userId)
      .single();
    
    if (targetUserError) {
      logger.error('❌ reactivateUser: Error fetching target user profile:', targetUserError);
      throw new Error(`Target user not found: ${targetUserError.message}`);
    }
    
    logger.log('🎯 reactivateUser: Target user profile:', targetUser);
    
    // Verify target user is actually inactive
    if (targetUser.role !== 'inactive') {
      logger.log('ℹ️ reactivateUser: User is already active');
      return true;
    }
    
    // Check permissions
    const canReactivate = 
      currentUser.role === 'super_admin' || 
      (currentUser.role === 'director' && currentUser.company_id === companyId);
    
    logger.log('🔐 reactivateUser: Permission check result:', {
      canReactivate,
      currentUserRole: currentUser.role,
      targetCompanyId: companyId
    });
    
    if (!canReactivate) {
      throw new Error('Insufficient permissions to reactivate user');
    }
    
    // Reactivate user profile - set to 'member' role
    logger.log('📝 reactivateUser: Attempting to update user role to member...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .update({ role: 'member' })
      .eq('id', userId)
      .select();

    if (profileError) {
      logger.error('❌ reactivateUser: Database error during profile reactivation:', profileError);
      throw profileError;
    }
    
    if (!profileData || profileData.length === 0) {
      logger.error('❌ reactivateUser: No rows were updated - user may not exist');
      throw new Error('Failed to reactivate user profile');
    }

    // Reactivate company membership
    logger.log('📝 reactivateUser: Updating company membership status to active...');
    const { data: memberData, error: memberError } = await supabase
      .from('company_members')
      .update({ 
        status: 'active',
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .select();
    
    if (memberError) {
      logger.error('❌ reactivateUser: Error updating company membership:', memberError);
      throw memberError;
    }

    if (!memberData || memberData.length === 0) {
      logger.error('❌ reactivateUser: No company membership found for user');
      throw new Error('Company membership not found');
    }

    logger.log('✅ reactivateUser: User reactivated successfully');
    
    // Sync billing with Stripe (non-blocking)
    try {
      logger.log('💳 reactivateUser: Syncing per-seat billing with Stripe...');
      const { error: billingError } = await supabase.functions.invoke('os-per-seat-billing', {
        body: { company_id: companyId, action: 'sync' }
      });
      if (billingError) {
        logger.error('⚠️ reactivateUser: Billing sync failed (non-blocking):', billingError);
      } else {
        logger.log('✅ reactivateUser: Billing synced successfully');
      }
    } catch (billingErr) {
      logger.error('⚠️ reactivateUser: Billing sync exception (non-blocking):', billingErr);
    }
    
    return true;
  } catch (error) {
    logger.error('💥 reactivateUser: Unexpected error:', error);
    throw error;
  }
};
