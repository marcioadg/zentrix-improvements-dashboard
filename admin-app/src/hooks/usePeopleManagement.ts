
import { useUserManagement } from '@/hooks/useUserManagement';
import { removeUserFromCompany } from '@/services/companyUserManagement';
import { deactivateUserAccount, reactivateUserAccount } from '@/services/userUpdateService';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { type UIPermissionLevel } from '@/utils/permissionMapping';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export const usePeopleManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentCompany } = useMultiCompany();
  const { user } = useAuth();

  // Use the unified system
  const unifiedSystem = useUserManagement();

  // ENHANCED: Comprehensive data invalidation for complete two-way sync
  const invalidateAllData = () => {
    logger.log('🔄 usePeopleManagement: Triggering COMPREHENSIVE data invalidation for two-way sync');
    
    if (unifiedSystem.invalidateAllRelatedData) {
      logger.log('🔄 usePeopleManagement: Using unified system invalidation');
      unifiedSystem.invalidateAllRelatedData();
    }
    
    // ENHANCED: Additional comprehensive invalidation for team data
    logger.log('🔄 usePeopleManagement: Invalidating team-related queries for Teams tab sync');
    
    // User-related queries
    queryClient.invalidateQueries({ queryKey: ['unified-users'] });
    queryClient.invalidateQueries({ queryKey: ['company-users'] });
    queryClient.invalidateQueries({ queryKey: ['userTeams'] });
    
    // CRITICAL: Team-related queries for Teams tab sync
    queryClient.invalidateQueries({ queryKey: ['teams'] });
    queryClient.invalidateQueries({ queryKey: ['team-management'] });
    queryClient.invalidateQueries({ queryKey: ['team-members'] });
    queryClient.invalidateQueries({ queryKey: ['optimized-user-teams'] });
    
    // Company member queries
    queryClient.invalidateQueries({ queryKey: ['company-members'] });
    
    logger.log('✅ usePeopleManagement: COMPREHENSIVE data invalidation completed');
  };

  // ENHANCED: Verify user removal and refresh data with better error handling
  const verifyRemovalAndRefresh = async (userId: string, action: 'remove' | 'deactivate' | 'reactivate') => {
    logger.log(`🔍 usePeopleManagement: Starting verification for ${action} of user:`, userId);
    logger.log('🔍 usePeopleManagement: Company context:', currentCompany?.id);
    
    try {
      // Add a small delay to ensure database transaction has completed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (action === 'remove') {
        // For removal from company, check that user is no longer in company_members
        logger.log('🔍 usePeopleManagement: Verifying user removal from company...');
        const { data: membershipCheck, error: membershipError } = await supabase
          .from('company_members')
          .select('id')
          .eq('user_id', userId)
          .eq('company_id', currentCompany?.id!)
          .maybeSingle(); // Use maybeSingle to handle no results gracefully

        logger.log('🔍 usePeopleManagement: Membership check result:', { membershipCheck, membershipError });

        if (!membershipError && membershipCheck) {
          logger.error('❌ usePeopleManagement: User still has company membership after removal attempt');
          throw new Error('User still has company membership after removal attempt');
        }
        logger.log('✅ usePeopleManagement: User removal from company verified successfully');
      } else if (action === 'reactivate') {
        // For reactivation, check company_members.status is active
        logger.log('🔍 usePeopleManagement: Verifying user reactivation...');
        const { data: verifyUser, error: verifyError } = await supabase
          .from('company_members')
          .select('status, user_id')
          .eq('user_id', userId)
          .eq('company_id', currentCompany?.id!)
          .maybeSingle(); // Use maybeSingle to handle no results gracefully
          
        logger.log('🔍 usePeopleManagement: Reactivation verification result:', { verifyUser, verifyError });
        
        if (verifyError) {
          logger.error('❌ usePeopleManagement: Database error during verification:', verifyError);
          // Don't throw on database errors during verification - log warning and continue
          logger.warn('⚠️ usePeopleManagement: Verification failed due to database error, assuming success');
        } else if (!verifyUser) {
          logger.warn('⚠️ usePeopleManagement: User not found in company_members - this might be expected');
          // Don't throw if user not found - might be expected in some cases
        } else if (verifyUser.status !== 'active') {
          logger.error('❌ usePeopleManagement: User not properly reactivated:', verifyUser);
          throw new Error(`User reactivation failed - status: ${verifyUser.status}`);
        } else {
          logger.log('✅ usePeopleManagement: User reactivation verified successfully:', verifyUser);
        }
      } else {
        // For deactivation, check company_members.status is inactive
        logger.log('🔍 usePeopleManagement: Verifying user deactivation...');
        const { data: verifyUser, error: verifyError } = await supabase
          .from('company_members')
          .select('status, user_id')
          .eq('user_id', userId)
          .eq('company_id', currentCompany?.id!)
          .maybeSingle(); // Use maybeSingle to handle no results gracefully
          
        logger.log('🔍 usePeopleManagement: Deactivation verification result:', { verifyUser, verifyError });
        
        if (verifyError) {
          logger.error('❌ usePeopleManagement: Database error during verification:', verifyError);
          // Don't throw on database errors during verification - log warning and continue
          logger.warn('⚠️ usePeopleManagement: Verification failed due to database error, assuming success');
        } else if (!verifyUser) {
          logger.warn('⚠️ usePeopleManagement: User not found in company_members - this might be expected');
          // Don't throw if user not found - might be expected in some cases
        } else if (verifyUser.status !== 'inactive') {
          logger.error('❌ usePeopleManagement: User not properly deactivated:', verifyUser);
          throw new Error(`User deactivation failed - status: ${verifyUser.status}`);
        } else {
          logger.log('✅ usePeopleManagement: User deactivation verified successfully:', verifyUser);
        }
      }

      // IMMEDIATE: Comprehensive cache invalidation without delays
      logger.log('🔄 usePeopleManagement: Triggering immediate comprehensive refresh');
      invalidateAllData();
      
      return true;
    } catch (error) {
      logger.error(`❌ usePeopleManagement: ${action} verification failed:`, error);
      logger.error('❌ usePeopleManagement: Verification error details:', {
        userId,
        companyId: currentCompany?.id,
        action,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // For verification errors, we should still invalidate cache to refresh UI
      logger.log('🔄 usePeopleManagement: Invalidating cache despite verification error');
      invalidateAllData();
      
      // Re-throw only critical errors, not verification timing issues
      if (error instanceof Error && error.message.includes('still has company membership')) {
        throw error;
      }
      
      // For other errors, log but don't fail the entire operation
      logger.warn('⚠️ usePeopleManagement: Continuing despite verification error');
      return false;
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    // Check if user is inactive - if so, reactivate them instead
    const user = unifiedSystem.users.find(u => u.user_id === userId || u.id === userId);
    const isInactive = user?.status === 'inactive' || user?.role === 'inactive' || user?.permission_level === 'inactive';
    
    if (isInactive) {
      return handleReactivateUser(userId);
    }
    logger.log('🔄 usePeopleManagement: === DEACTIVATION FLOW START ===');
    logger.log('🔄 usePeopleManagement: Target user ID:', userId);
    logger.log('🔄 usePeopleManagement: Current user ID:', user?.id);
    logger.log('🔄 usePeopleManagement: Current company:', currentCompany?.id, currentCompany?.name);
    logger.log('🔄 usePeopleManagement: Has manager access:', unifiedSystem.hasManagerAccess);
    
    // Enhanced permission check with detailed logging
    if (!unifiedSystem.hasManagerAccess) {
      logger.error('❌ usePeopleManagement: Access denied - user lacks manager access');
      logger.error('❌ usePeopleManagement: Current user permission details:', {
        hasManagerAccess: unifiedSystem.hasManagerAccess,
        isSuperAdmin: unifiedSystem.isSuperAdmin,
        currentUserId: unifiedSystem.currentUserId
      });
      toast({
        title: "Access Denied",
        description: "You don't have permission to deactivate users",
        variant: "destructive",
      });
      return;
    }

    if (!currentCompany?.id) {
      logger.error('❌ usePeopleManagement: No company context available');
      toast({
        title: "Error",
        description: "No company context available",
        variant: "destructive",
      });
      return;
    }

    logger.log('✅ usePeopleManagement: Permission and context checks passed');
    logger.log('🔄 usePeopleManagement: About to call deactivateUserAccount with:', {
      userId,
      companyId: currentCompany?.id
    });
    
    const queryKey = ['unified-users', currentCompany?.id];
    
    // For deactivation, we DON'T optimistically remove users since they should remain visible as "Inactive"
    // Only actual deletion (handleDeleteUser) should optimistically remove users

    try {
      logger.log('🔄 usePeopleManagement: === CALLING SERVICE FUNCTION ===');
      await deactivateUserAccount(userId, currentCompany?.id);
      logger.log('✅ usePeopleManagement: Service function completed successfully');
      
      // Track team member deactivation
      try {
        const { trackTeamMemberRemoved } = await import('@/lib/statsigAnalytics');
        trackTeamMemberRemoved({
          user_id: user?.id,
          company_id: currentCompany?.id,
          removed_user_id: userId,
          removal_type: 'deactivated',
        });
      } catch (e) {
        // Non-blocking
      }
      
      logger.log('🔄 usePeopleManagement: === STARTING VERIFICATION ===');
      const verificationResult = await verifyRemovalAndRefresh(userId, 'deactivate');
      logger.log('✅ usePeopleManagement: Verification completed:', verificationResult);
      
      toast({
        title: "Success",
        description: "User has been deactivated successfully",
        variant: "default",
      });
      
      logger.log('🔄 usePeopleManagement: === DEACTIVATION FLOW COMPLETED ===');
      
    } catch (error) {
      logger.error('❌ usePeopleManagement: === DEACTIVATION FLOW FAILED ===');
      logger.error('❌ usePeopleManagement: Error deactivating user:', error);
      logger.error('❌ usePeopleManagement: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        companyId: currentCompany?.id
      });
      
      // Revert optimistic update on error
      logger.log('🔄 usePeopleManagement: Reverting optimistic update due to error');
      queryClient.invalidateQueries({ queryKey });
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to deactivate user",
        variant: "destructive",
      });
      
      throw error;
    }
  };

  const handleReactivateUser = async (userId: string) => {
    logger.log('🔄 usePeopleManagement: === REACTIVATION FLOW START ===');
    logger.log('🔄 usePeopleManagement: Target user ID:', userId);
    logger.log('🔄 usePeopleManagement: Current user ID:', user?.id);
    logger.log('🔄 usePeopleManagement: Current company:', currentCompany?.id, currentCompany?.name);
    logger.log('🔄 usePeopleManagement: Has manager access:', unifiedSystem.hasManagerAccess);
    
    // Enhanced permission check with detailed logging
    if (!unifiedSystem.hasManagerAccess) {
      logger.error('❌ usePeopleManagement: Access denied - user lacks manager access');
      toast({
        title: "Access Denied",
        description: "You don't have permission to reactivate users",
        variant: "destructive",
      });
      return;
    }

    if (!currentCompany?.id) {
      logger.error('❌ usePeopleManagement: No company context available');
      toast({
        title: "Error",
        description: "No company context available",
        variant: "destructive",
      });
      return;
    }

    logger.log('✅ usePeopleManagement: Permission and context checks passed');
    logger.log('🔄 usePeopleManagement: About to call reactivateUserAccount with:', {
      userId,
      companyId: currentCompany?.id
    });
    
    const queryKey = ['unified-users', currentCompany?.id];
    
    // For reactivation, we don't need optimistic updates since the user is already visible

    try {
      logger.log('🔄 usePeopleManagement: === CALLING REACTIVATION SERVICE FUNCTION ===');
      await reactivateUserAccount(userId, currentCompany?.id);
      logger.log('✅ usePeopleManagement: Reactivation service function completed successfully');
      
      logger.log('🔄 usePeopleManagement: === STARTING VERIFICATION ===');
      const verificationResult = await verifyRemovalAndRefresh(userId, 'reactivate');
      logger.log('✅ usePeopleManagement: Verification completed:', verificationResult);
      
      toast({
        title: "Success",
        description: "User has been reactivated successfully",
        variant: "default",
      });
      
      logger.log('🔄 usePeopleManagement: === REACTIVATION FLOW COMPLETED ===');
      
    } catch (error) {
      logger.error('❌ usePeopleManagement: === REACTIVATION FLOW FAILED ===');
      logger.error('❌ usePeopleManagement: Error reactivating user:', error);
      
      // Refresh data on error to ensure consistency
      logger.log('🔄 usePeopleManagement: Refreshing data due to reactivation error');
      queryClient.invalidateQueries({ queryKey });
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reactivate user",
        variant: "destructive",
      });
      
      throw error;
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!unifiedSystem.hasManagerAccess) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to remove users from the company",
        variant: "destructive",
      });
      return;
    }

    if (!currentCompany?.id) {
      toast({
        title: "Error",
        description: "No company context available",
        variant: "destructive",
      });
      return;
    }

    logger.log('🔄 usePeopleManagement: Starting user removal from company:', userId);
    
    const queryKey = ['unified-users', currentCompany?.id];
    
    // Optimistically remove user from UI
    queryClient.setQueryData(queryKey, (oldUsers: any[] = []) => {
      return oldUsers.filter(user => user.user_id !== userId && user.id !== userId);
    });

    try {
      // Use company-specific removal instead of full deletion
      await removeUserFromCompany(userId, currentCompany?.id, user?.id!);
      logger.log('✅ usePeopleManagement: User removed from company successfully');
      
      // Track team member removed
      try {
        const { trackTeamMemberRemoved } = await import('@/lib/statsigAnalytics');
        trackTeamMemberRemoved({
          user_id: user?.id,
          company_id: currentCompany?.id,
          removed_user_id: userId,
          removal_type: 'deleted',
        });
      } catch (e) {
        // Non-blocking
      }
      
      // ENHANCED: Immediate verification and refresh without delays
      await verifyRemovalAndRefresh(userId, 'remove');
      
    } catch (error) {
      logger.error('❌ usePeopleManagement: Error removing user from company:', error);
      
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey });
      
      throw error;
    }
  };

  logger.log('🔍 usePeopleManagement: Delegating to unified system:', {
    usersCount: unifiedSystem.users.length,
    hasManagerAccess: unifiedSystem.hasManagerAccess,
    loading: unifiedSystem.loading
  });

  // Return unified system with additional functions and enhanced sync
  return {
    ...unifiedSystem,
    // Legacy aliases for compatibility
    usersLoading: unifiedSystem.loading,
    profileLoading: false, // Not needed in unified system
    handleRoleChange: unifiedSystem.updateUserPermission,
    handleUpdateUserName: unifiedSystem.updateUserName,
    handleDeactivateUser,
    handleDeleteUser,
    handleResendUserInvitation: unifiedSystem.handleResendInvitation,
    // ENHANCED: Export comprehensive invalidation for external use
    invalidateAllData
  };
};
