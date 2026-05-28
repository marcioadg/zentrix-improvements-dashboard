/**
 * 🎯 PHASE 4: Optimized Pending Invitations Hook
 * Prevents duplicate API calls for invitation checking
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { requestDeduplicator } from '@/utils/requestDeduplicator';
import { logger } from '@/utils/logger';

interface Invitation {
  id: string;
  company_name: string;
  invited_by_name: string;
  role: string;
  created_at: string;
}

export const useOptimizedPendingInvitations = () => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvitations = async () => {
      if (!user?.email) {
        setInvitations([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // 🎯 PHASE 4: Deduplicate invitation requests
        const cacheKey = `invitations-${user.email}`;
        const result = await requestDeduplicator.deduplicate(
          cacheKey,
          async () => {
            logger.debug('🔄 Fetching pending invitations for:', user.email);
            const { data, error } = await supabase
              .rpc('get_pending_invitations_for_email', {
                p_email: user.email
              });

            if (error) throw error;
            return data || [];
          },
          60 * 1000 // 1 minute cache
        );

        setInvitations(result);
        logger.debug('✅ Pending invitations loaded:', result.length);
      } catch (err) {
        logger.error('❌ Error fetching pending invitations:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch invitations');
        setInvitations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInvitations();
  }, [user?.email]);

  // 🎯 PHASE 4: Optimized refresh function
  const refreshInvitations = async () => {
    if (!user?.email) return;

    // Invalidate cache before refetch
    requestDeduplicator.invalidateCache(`invitations-${user.email}`);
    
    // Trigger re-fetch
    setLoading(true);
    try {
      const cacheKey = `invitations-${user.email}`;
      const result = await requestDeduplicator.deduplicate(
        cacheKey,
        async () => {
          const { data, error } = await supabase
            .rpc('get_pending_invitations_for_email', {
              p_email: user.email
            });

          if (error) throw error;
          return data || [];
        }
      );

      setInvitations(result);
    } catch (err) {
      logger.error('❌ Error refreshing invitations:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh invitations');
    } finally {
      setLoading(false);
    }
  };

  return {
    invitations,
    loading,
    error,
    refreshInvitations,
    hasInvitations: invitations.length > 0
  };
};