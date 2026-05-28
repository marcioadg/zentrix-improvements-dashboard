import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface PendingInvitation {
  company_id: string;
  company_name: string;
  permission_level: string;
  invited_by: string;
  inviter_name: string;
  invited_at: string;
}

export const usePendingInvitations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPendingInvitations = async () => {
    if (!user?.email) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_pending_invitations_for_email', {
        p_email: user.email.toLowerCase()
      });

      if (error) {
        logger.error('Error fetching pending invitations:', error);
        return;
      }

      setInvitations(data || []);
    } catch (error) {
      logger.error('Error fetching pending invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async (companyId: string, onSuccess?: () => void) => {
    if (!user?.email) return;

    try {
      const { data, error } = await supabase.rpc('accept_company_invitation', {
        p_company_id: companyId,
        p_email: user.email
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      toast({
        title: "Invitation accepted",
        description: "You have successfully joined the company!",
      });

      // Invalidate profiles cache so team views show the new member
      await queryClient.invalidateQueries({ queryKey: ['profiles'] });

      // Refresh invitations list
      await fetchPendingInvitations();
      
      // If custom success callback is provided, use it; otherwise reload
      if (onSuccess) {
        onSuccess();
      } else {
        // Trigger a page refresh to update user's company access
        window.location.reload();
      }

      return true;
    } catch (error) {
      logger.error('Error accepting invitation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to accept invitation",
        variant: "destructive",
      });
      return false;
    }
  };

  const declineInvitation = async (companyId: string) => {
    if (!user?.email) return;

    try {
      const { data, error } = await supabase.rpc('decline_company_invitation', {
        p_company_id: companyId,
        p_email: user.email
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to decline invitation');
      }

      toast({
        title: "Invitation declined",
        description: "You have declined the company invitation.",
      });

      // Refresh invitations list
      await fetchPendingInvitations();

      return true;
    } catch (error) {
      logger.error('Error declining invitation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to decline invitation",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchPendingInvitations();
  }, [user?.email]);

  return {
    invitations,
    loading,
    acceptInvitation,
    declineInvitation,
    refetch: fetchPendingInvitations
  };
};