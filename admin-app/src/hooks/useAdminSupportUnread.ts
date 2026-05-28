import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAdminSupportUnread = (enabled = true) => {
  const [hasUnread, setHasUnread] = useState(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const check = useCallback(async () => {
    if (!enabledRef.current) return;

    try {
      const { data: openConvos, error: convosError } = await supabase
        .from('support_conversations')
        .select('id')
        .eq('status', 'open');

      if (convosError || !openConvos || openConvos.length === 0) {
        setHasUnread(false);
        return;
      }

      const convoIds = openConvos.map(c => c.id);

      const { count, error: msgsError } = await supabase
        .from('support_messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', convoIds)
        .eq('sender_type', 'customer')
        .is('read_at', null);

      if (msgsError) return;

      setHasUnread((count ?? 0) > 0);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    
    check();

    // Poll every 10 seconds as backup
    const interval = setInterval(check, 10_000);

    const channel = supabase
      .channel('admin-support-unread-global')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_messages' },
        () => setTimeout(check, 300)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_conversations' },
        () => setTimeout(check, 300)
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [enabled, check]);

  return hasUnread;
};
