import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PresenceUser } from '@/types/sops';
import { logger } from '@/utils/logger';

export const useRealtimePresence = (pageId: string) => {
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!pageId) return;

    const setupPresence = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const channel = supabase.channel(`page:${pageId}`, {
        config: { presence: { key: userData.user.id } }
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const activeUsers = Object.values(state).flat() as unknown as PresenceUser[];
          setUsers(activeUsers);
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          logger.log('[SOPs] User joined page:', pageId, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          logger.log('[SOPs] User left page:', pageId, leftPresences);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              user_id: userData.user.id,
              online_at: new Date().toISOString(),
            });

            // Update page activity
            await supabase
              .from('sop_page_activity')
              .upsert({
                page_id: pageId,
                user_id: userData.user.id,
                last_seen_at: new Date().toISOString()
              }, {
                onConflict: 'page_id,user_id'
              });
          }
        });

      channelRef.current = channel;
    };

    setupPresence();

    return () => {
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [pageId]);

  return { users };
};
