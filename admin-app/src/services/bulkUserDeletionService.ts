
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface BulkDeletionOptions {
  deleteData?: boolean;
  maxConcurrent?: number;
}

export interface BulkDeletionResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  errors: Array<{ userId: string, error: string }>;
  transferredDataCount?: number;
}

const MAX_BULK_DELETE_LIMIT = 500;

export const bulkDeleteUsers = async (
  userIds: string[], 
  currentUserId: string,
  transferToUserId?: string,
  options: BulkDeletionOptions = {}
): Promise<BulkDeletionResult> => {
  logger.log('🗑️ bulkDeleteUsers: Starting bulk deletion process for users:', userIds.length);
  
  // Validate input
  if (userIds.length === 0) {
    throw new Error('No users provided for deletion');
  }
  
  if (userIds.length > MAX_BULK_DELETE_LIMIT) {
    throw new Error(`Cannot delete more than ${MAX_BULK_DELETE_LIMIT} users at once`);
  }
  
  // Check if user is trying to delete themselves
  if (userIds.includes(currentUserId)) {
    throw new Error('Cannot delete your own account in bulk operation');
  }
  
  try {
    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('Authentication required for user deletion');
    }
    
    logger.log('🔐 bulkDeleteUsers: Calling edge function for secure deletion');
    
    // Call the edge function for secure deletion
    const { data, error } = await supabase.functions.invoke('os-delete-user', {
      body: {
        userIds,
        currentUserId,
        transferToUserId,
        deleteData: options.deleteData
      }
    });
    
    if (error) {
      logger.error('❌ bulkDeleteUsers: Edge function error:', error);
      throw new Error(`Deletion service error: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('No response from deletion service');
    }
    
    logger.log('✅ bulkDeleteUsers: Edge function completed:', data);
    
    return {
      success: data.success,
      successCount: data.successCount,
      failureCount: data.failureCount,
      errors: data.errors || []
    };
    
  } catch (error) {
    logger.error('💥 bulkDeleteUsers: Critical error:', error);
    throw error;
  }
};

export const bulkDeactivateUsers = async (
  userIds: string[], 
  currentUserId: string
): Promise<BulkDeletionResult> => {
  logger.log('⏸️ bulkDeactivateUsers: Starting bulk deactivation process for users:', userIds.length);
  
  if (userIds.length === 0) {
    throw new Error('No users provided for deactivation');
  }
  
  if (userIds.length > MAX_BULK_DELETE_LIMIT) {
    throw new Error(`Cannot deactivate more than ${MAX_BULK_DELETE_LIMIT} users at once`);
  }
  
  if (userIds.includes(currentUserId)) {
    throw new Error('Cannot deactivate your own account in bulk operation');
  }
  
  // Check super admin permission
  const { data: currentUser, error: currentUserError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();
  
  if (currentUserError || currentUser.role !== 'super_admin') {
    throw new Error('Only super administrators can perform bulk user deactivation');
  }
  
  const result: BulkDeletionResult = {
    success: true,
    successCount: 0,
    failureCount: 0,
    errors: []
  };
  
  // Deactivate users by updating their role
  for (const userId of userIds) {
    try {
      logger.log(`⏸️ bulkDeactivateUsers: Deactivating user ${userId}`);
      
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'inactive' })
        .eq('id', userId);
      
      if (error) {
        throw error;
      }
      
      result.successCount++;
      logger.log(`✅ bulkDeactivateUsers: Successfully deactivated user ${userId}`);
    } catch (error) {
      logger.error(`❌ bulkDeactivateUsers: Failed to deactivate user ${userId}:`, error);
      result.failureCount++;
      result.errors.push({
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  // Log the bulk action
  try {
    await supabase
      .from('admin_actions')
      .insert({
        admin_user_id: currentUserId,
        action_type: 'bulk_user_deactivation',
        target_type: 'multiple_users',
        target_id: userIds.join(','),
        description: `Bulk deactivated ${result.successCount} users out of ${userIds.length} attempted`,
        details: {
          userIds,
          successCount: result.successCount,
          failureCount: result.failureCount,
          errors: result.errors
        }
      });
  } catch (logError) {
    logger.warn('❌ bulkDeactivateUsers: Failed to log admin action:', logError);
  }
  
  result.success = result.failureCount === 0;
  
  logger.log('✅ bulkDeactivateUsers: Bulk deactivation completed:', {
    total: userIds.length,
    success: result.successCount,
    failed: result.failureCount
  });
  
  return result;
};
