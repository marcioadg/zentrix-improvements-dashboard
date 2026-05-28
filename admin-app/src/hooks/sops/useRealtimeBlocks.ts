import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export const useRealtimeBlocks = (pageId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!pageId) return;

    let currentUserId: string | undefined;
    
    // Get current user ID
    supabase.auth.getUser().then(({ data }) => {
      currentUserId = data.user?.id;
    });

    const channel = supabase
      .channel(`blocks:${pageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sop_blocks',
          filter: `page_id=eq.${pageId}`
        },
        (payload) => {
          logger.log('[SOPs] Block changed:', payload);
          
          // Skip invalidation if this is the current user's update
          const updatedBy = (payload.new as any)?.updated_by || (payload.old as any)?.updated_by;
          if (updatedBy === currentUserId) {
            logger.log('[SOPs] Ignoring self-update');
            return;
          }

          // Only invalidate for other users' changes
          logger.log('[SOPs] Invalidating cache for other user update');
          queryClient.invalidateQueries({ queryKey: ['sop_blocks', pageId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pageId, queryClient]);
};
