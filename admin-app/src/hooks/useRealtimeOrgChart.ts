
import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { logger } from '@/utils/logger';

interface UseRealtimeOrgChartProps {
  onRoleChange: (payload: any) => void;
  onRoleAssignmentChange: (payload: any) => void;
  onProfileChange: (payload: any) => void;
}

export const useRealtimeOrgChart = ({
  onRoleChange,
  onRoleAssignmentChange,
  onProfileChange
}: UseRealtimeOrgChartProps) => {
  const { currentCompany } = useMultiCompanyAccess();
  const channelRef = useRef<any>(null);

  const setupRealtimeSubscriptions = useCallback(() => {
    if (!currentCompany?.id) return null;

    logger.log('🔄 Setting up org chart real-time subscriptions for company:', currentCompany?.id);

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`org-chart-${currentCompany?.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'org_roles',
          filter: `company_id=eq.${currentCompany?.id}`
        },
        (payload) => {
          logger.log('🔄 Real-time org_roles change:', payload);
          onRoleChange(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'role_assignments'
        },
        (payload) => {
          logger.log('🔄 Real-time role_assignments change:', payload);
          onRoleAssignmentChange(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          logger.log('🔄 Real-time profiles change:', payload);
          onProfileChange(payload);
        }
      )
      .subscribe((status) => {
        logger.log('🔄 Org chart real-time subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentCompany?.id, onRoleChange, onRoleAssignmentChange, onProfileChange]);

  useEffect(() => {
    const cleanup = setupRealtimeSubscriptions();
    return cleanup;
  }, [setupRealtimeSubscriptions]);

  return {
    setupRealtimeSubscriptions
  };
};
