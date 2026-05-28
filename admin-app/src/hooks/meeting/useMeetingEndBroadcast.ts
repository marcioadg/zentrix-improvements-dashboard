import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { useGlobalData } from '@/contexts/GlobalDataContext';

/**
 * Hook that provides a reliable meeting end broadcast function.
 * Unlike useMeetingStateBroadcast, this broadcasts to a SPECIFIC company channel
 * (passed as parameter) rather than relying on currentCompany context.
 * 
 * This is critical for Wrap Up "Close Meeting" which executes while the user
 * may not have the correct currentCompany context set.
 */
export const useMeetingEndBroadcast = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { removeMeetingFromCache } = useGlobalData();

  /**
   * Broadcasts meeting_ended to a specific company's channel and updates all relevant caches.
   * This ensures /meetings QuickStart cards update regardless of currentCompany context.
   */
  const broadcastMeetingEndedToCompany = useCallback(async (
    teamId: string,
    companyId: string
  ) => {
    logger.debug('useMeetingEndBroadcast: Broadcasting meeting_ended', { teamId, companyId });

    // 1. INSTANT: Remove from GlobalDataContext (for header + /meetings Active Meetings list)
    removeMeetingFromCache(teamId);

    // 2. INSTANT: Remove from React Query cache (for QuickStart cards via useOptimizedActiveMeetings)
    if (user) {
      // Target the specific company's cache
      const specificQueryKey = ['optimized-meetings-data', user.id, companyId];
      
      // Also target any user-scoped caches (safety net)
      const cacheEntries = queryClient.getQueryCache().findAll({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && 
                 key[0] === 'optimized-meetings-data' && 
                 key[1] === user.id;
        }
      });

      cacheEntries.forEach((entry) => {
        queryClient.setQueryData(entry.queryKey, (old: any[] | undefined) => {
          if (!old) return old;
          const filtered = old.filter((m: any) => m.team_id !== teamId);
          logger.debug('useMeetingEndBroadcast: Updated cache', { 
            queryKey: entry.queryKey, 
            before: old.length, 
            after: filtered.length 
          });
          return filtered;
        });
      });

      // Invalidate without immediate refetch (we already updated the cache)
      queryClient.invalidateQueries({
        queryKey: specificQueryKey,
        refetchType: 'none',
      });
    }

    // 3. BROADCAST: Send to the correct company channel for other users
    const channelName = `meeting-state:${companyId}`;
    
    try {
      const channel = supabase.channel(channelName);
      
      await channel.subscribe((status) => {
        logger.debug('useMeetingEndBroadcast: Channel status', { status, channelName });
      });

      const result = await channel.send({
        type: 'broadcast',
        event: 'meeting_ended',
        payload: { teamId, timestamp: Date.now() }
      });

      logger.debug('useMeetingEndBroadcast: Broadcast result', { result, teamId, companyId });

      // Clean up the temporary channel after a short delay
      setTimeout(() => {
        supabase.removeChannel(channel);
      }, 1000);
      
    } catch (err) {
      logger.warn('useMeetingEndBroadcast: Broadcast failed, relying on postgres_changes fallback', { err });
    }
  }, [user, queryClient, removeMeetingFromCache]);

  return { broadcastMeetingEndedToCompany };
};
