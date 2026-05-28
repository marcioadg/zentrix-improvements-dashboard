import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UnreadConversation {
  conversationId: string;
  hasUnread: boolean;
}

export const useSupportUnread = () => {
  const { session } = useAuth();
  const [unreadMap, setUnreadMap] = useState<Record<string, boolean>>({});
  const [hasAnyUnread, setHasAnyUnread] = useState(false);
  const userId = session?.user?.id;

  const checkUnread = useCallback(async () => {
    if (!userId) return;

    // Get all conversations with their last_read_at and latest admin message
    const { data: convos } = await supabase
      .from('support_conversations')
      .select('id, last_read_at')
      .eq('user_id', userId);

    if (!convos || convos.length === 0) {
      setUnreadMap({});
      setHasAnyUnread(false);
      return;
    }

    const map: Record<string, boolean> = {};
    let anyUnread = false;

    for (const convo of convos) {
      // Check if there are admin messages after last_read_at
      // Check if there are admin messages after last_read_at
      // Exclude auto-replies (which use the user's own ID as sender_id)
      const query = supabase
        .from('support_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', convo.id)
        .eq('sender_type', 'admin')
        .neq('sender_id', userId);

      if (convo.last_read_at) {
        query.gt('created_at', convo.last_read_at);
      }

      const { count } = await query;
      const hasUnread = (count ?? 0) > 0;
      map[convo.id] = hasUnread;
      if (hasUnread) anyUnread = true;
    }

    setUnreadMap(map);
    setHasAnyUnread(anyUnread);
  }, [userId]);

  // Check on mount and periodically
  useEffect(() => {
    if (!userId) return;
    checkUnread();

    // Listen for new support messages
    const channel = supabase
      .channel(`support-unread-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages' },
        () => {
          setTimeout(checkUnread, 300);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, checkUnread]);

  const markConversationRead = useCallback(async (conversationId: string) => {
    if (!userId) return;
    await supabase
      .from('support_conversations')
      .update({ last_read_at: new Date().toISOString() })
      .eq('id', conversationId)
      .eq('user_id', userId);

    setUnreadMap((prev) => ({ ...prev, [conversationId]: false }));
    setHasAnyUnread((prev) => {
      const remaining = Object.entries({ ...unreadMap, [conversationId]: false });
      return remaining.some(([, v]) => v);
    });
  }, [userId, unreadMap]);

  return { unreadMap, hasAnyUnread, markConversationRead, refreshUnread: checkUnread };
};
