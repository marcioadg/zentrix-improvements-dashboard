
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedUser } from '@/hooks/useUserManagement';
import { hasManagerAccess as checkManagerAccess } from './userAccessService';
import { logger } from '@/utils/logger';

interface UseUserOperationsProps {
  users: UnifiedUser[];
  currentCompany: any;
  profile: any;
  user: any;
  queryClient: any;
  queryKey: any[];
  invalidateAllRelatedData: () => void;
}

export const useUserOperations = ({
  users,
  currentCompany,
  profile,
  user,
  queryClient,
  queryKey,
  invalidateAllRelatedData
}: UseUserOperationsProps) => {
  const { toast } = useToast();
  const [isResending, setIsResending] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  const hasManagerAccess = useCallback(() => {
    return checkManagerAccess(profile, currentCompany, user?.id, users, queryClient, queryKey);
  }, [profile, currentCompany, user?.id, users, queryClient, queryKey]);

  // Enhanced user name update function with immediate refresh
  const updateUserName = async (userId: string, newName: string): Promise<boolean> => {
    const userHasAccess = hasManagerAccess();
    if (!userHasAccess) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to update user names",
        variant: "destructive",
      });
      return false;
    }

    logger.log('🔄 useUserOperations: Updating user name:', { userId, newName });

    // Get current data for rollback
    const currentData = (queryClient.getQueryData(queryKey) as UnifiedUser[]) || [];

    // Optimistic update
    queryClient.setQueryData(queryKey, (oldUsers: UnifiedUser[] = []) => {
      return oldUsers.map(u => 
        u.user_id === userId ? { ...u, full_name: newName } : u
      );
    });

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: newName })
        .eq('id', userId);

      if (error) {
        logger.error('❌ useUserOperations: Error updating user name:', error);
        
        // Revert optimistic update
        queryClient.setQueryData(queryKey, currentData);
        
        toast({
          title: "Error",
          description: `Failed to update user name: ${error.message}`,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Name Updated",
        description: "User name has been updated successfully.",
      });

      // ENHANCED: Immediate comprehensive cache invalidation for two-way sync
      logger.log('🔄 useUserOperations: Triggering immediate cache invalidation after successful name update');
      invalidateAllRelatedData();

      logger.log('✅ useUserOperations: User name updated successfully');
      return true;
    } catch (error) {
      logger.error('❌ useUserOperations: Failed to update user name:', error);
      queryClient.setQueryData(queryKey, currentData);
      return false;
    }
  };

  // Enhanced resend invitation function with timeout protection and better error handling
  const handleResendInvitation = async (targetUser: UnifiedUser) => {
    if (!currentCompany?.id || !user?.id) {
      logger.error('❌ useUserOperations: Missing company or user information');
      toast({
        title: "Configuration Error",
        description: "Missing company or user information. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    const userHasAccess = hasManagerAccess();
    if (!userHasAccess) {
      logger.warn('⚠️  useUserOperations: Access denied for resend invitation');
      toast({
        title: "Access Denied",
        description: "You don't have permission to resend invitations",
        variant: "destructive",
      });
      return;
    }

    // Check if enough time has passed since last invitation (5 minutes cooldown)
    // Note: This is now primarily handled by the UI, but kept as a backup
    const now = new Date();
    const lastInvitedAt = targetUser.invited_at ? new Date(targetUser.invited_at) : null;
    const cooldownMinutes = 5;
    
    if (lastInvitedAt) {
      const timeDiff = (now.getTime() - lastInvitedAt.getTime()) / (1000 * 60); // minutes
      if (timeDiff < cooldownMinutes) {
        const remainingTime = Math.ceil(cooldownMinutes - timeDiff);
        logger.warn('⚠️  useUserOperations: Cooldown period active (backup check):', { remainingTime });
        // UI should prevent this, but keeping as backup
        return;
      }
    }

    // Set loading state with timeout protection
    setIsResending(targetUser.email);
    logger.log('🔄 useUserOperations: Starting resend invitation process:', { 
      userId: targetUser.user_id, 
      email: targetUser.email,
      companyId: currentCompany?.id 
    });

    // Setup timeout protection (30 seconds)
    const timeoutId = setTimeout(() => {
      logger.error('⏰ useUserOperations: Resend invitation timeout - auto-clearing loading state');
      setIsResending(null);
      toast({
        title: "Request Timeout",
        description: "The request took too long. Please try again.",
        variant: "destructive",
      });
    }, 30000);

    try {
      // Create the invitation request with proper error handling
      const invitationRequest = {
        email: targetUser.email,
        fullName: (targetUser.full_name === 'Pending User') ? '' : (targetUser.full_name || ''),
        companyId: currentCompany?.id,
        invitedBy: user.id,
        teamIds: targetUser.company_memberships?.[0] ? [] : [], // Use team IDs if available
        permissionLevel: targetUser.permission_level || 'member',
        siteUrl: window.location.origin
      };

      logger.log('📤 useUserOperations: Sending invitation request:', invitationRequest);

      const { data, error } = await supabase.functions.invoke('os-invite-user', {
        body: invitationRequest
      });

      // Clear timeout since we got a response
      clearTimeout(timeoutId);

      // Handle Supabase function invocation errors
      if (error) {
        logger.error('❌ useUserOperations: Supabase function error:', error);
        toast({
          title: "Network Error",
          description: error.message || "Failed to connect to invitation service. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Handle business logic errors from the edge function
      if (data && !data.success) {
        logger.error('❌ useUserOperations: Invitation business logic error:', data.error);
        toast({
          title: "Invitation Failed",
          description: data.error || "Failed to resend invitation. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Success case
      logger.log('✅ useUserOperations: Invitation resent successfully:', data);
      
      // Clear loading state and show success state
      setIsResending(null);
      setResendSuccess(targetUser.email);
      
      toast({
        title: "Invitation Resent",
        description: "Invitation has been resent successfully.",
      });

      // Auto-clear success state after 2 seconds
      setTimeout(() => {
        setResendSuccess(null);
      }, 2000);

      // Invalidate cache to refresh the invitation timestamp
      try {
        invalidateAllRelatedData();
        logger.log('🔄 useUserOperations: Cache invalidated after successful resend');
      } catch (cacheError) {
        logger.warn('⚠️  useUserOperations: Cache invalidation failed (non-critical):', cacheError);
      }

    } catch (error: any) {
      // Clear timeout on any error
      clearTimeout(timeoutId);
      
      logger.error('❌ useUserOperations: Unexpected error during resend invitation:', {
        error: error.message || error,
        stack: error.stack,
        userId: targetUser.user_id,
        email: targetUser.email
      });
      
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      // Guaranteed state cleanup (only if not already cleared by success case)
      if (isResending === targetUser.email) {
        setIsResending(null);
      }
      logger.log('🧹 useUserOperations: Resend invitation process completed');
    }
  };

  return {
    isResending,
    resendSuccess,
    updateUserName,
    handleResendInvitation
  };
};
