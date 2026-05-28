import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface IssueReorderPayload {
  sender: string;
  issueId?: string;
  newSortOrder?: number;
  updates?: Array<{ issueId: string; newSortOrder: number }>;
  updatedAt: string;
}

/**
 * Real-time sync of issue reordering via Supabase broadcast channels.
 * Uses ref pattern to ensure stable channel subscription.
 */
export function useIssueReorderBroadcast(
  teamId: string | null,
  onRemoteReorder: (updates: Array<{ issueId: string; newSortOrder: number }>) => void
) {
  const channelRef = useRef<any>(null);
  const clientIdRef = useRef<string>(
    ((globalThis as any).crypto?.randomUUID?.()) || Math.random().toString(36).slice(2)
  );
  
  const callbackRef = useRef(onRemoteReorder);
  
  useEffect(() => {
    callbackRef.current = onRemoteReorder;
  }, [onRemoteReorder]);

  useEffect(() => {
    if (!teamId) return;
    
    const channel = supabase.channel(`meeting:${teamId}:issue-reorder`);

    channel
      .on('broadcast', { event: 'issue_reordered' }, (payload: any) => {
        const { sender, issueId, newSortOrder, updates } = payload?.payload as IssueReorderPayload || {};
        
        // Ignore our own broadcasts
        if (sender === clientIdRef.current) return;
        
        // Support batch updates (preferred) or single update (backward compatibility)
        if (updates && Array.isArray(updates) && updates.length > 0) {
          callbackRef.current(updates);
        } else if (issueId && newSortOrder !== undefined) {
          callbackRef.current([{ issueId, newSortOrder }]);
        }
      })
      .subscribe();

    channelRef.current = channel;
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      channelRef.current = null;
    };
  }, [teamId]);

  const publishReorder = useCallback((updates: Array<{ issueId: string; newSortOrder: number }> | { issueId: string; newSortOrder: number }) => {
    if (!channelRef.current) return;
    
    const updatesArray = Array.isArray(updates) ? updates : [updates];
    if (updatesArray.length === 0) return;
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'issue_reordered',
      payload: { 
        sender: clientIdRef.current, 
        updates: updatesArray,
        updatedAt: new Date().toISOString()
      } as IssueReorderPayload
    });
  }, []);

  return { publishReorder };
}
