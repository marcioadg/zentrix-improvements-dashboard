import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface IssueStatusChangePayload {
  sender: string;
  issueId: string;
  status: string;
  updatedAt: string;
}

/**
 * Real-time sync of issue status changes (solve/unsolve) via Supabase broadcast channels.
 * Uses ref pattern to ensure stable channel subscription (prevents missed broadcasts).
 */
export function useIssueStatusBroadcast(
  teamId: string | null,
  onRemoteStatusChange: (issueId: string, status: string) => void
) {
  const channelRef = useRef<any>(null);
  const clientIdRef = useRef<string>(
    ((globalThis as any).crypto?.randomUUID?.()) || Math.random().toString(36).slice(2)
  );
  
  // CRITICAL: Use ref pattern to store callback - prevents channel recreation
  const callbackRef = useRef(onRemoteStatusChange);
  
  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onRemoteStatusChange;
  }, [onRemoteStatusChange]);

  useEffect(() => {
    if (!teamId) return;
    
    logger.log('📡 [BROADCAST] Setting up issue status channel for team:', teamId);
    
    const channel = supabase.channel(`meeting:${teamId}:issue-status`);

    channel
      .on('broadcast', { event: 'issue_status_changed' }, (payload: any) => {
        const { sender, issueId, status } = payload?.payload as IssueStatusChangePayload || {};
        
        // Ignore our own broadcasts
        if (sender === clientIdRef.current) {
          logger.log('📡 [BROADCAST] Ignoring own issue status broadcast');
          return;
        }
        
        if (issueId && status) {
          logger.log('📡 [BROADCAST] Received remote issue status change:', { issueId, status, sender });
          // Call through ref to ensure we use latest callback
          callbackRef.current(issueId, status);
        }
      })
      .subscribe((status) => {
        logger.log('📡 [BROADCAST] Issue status channel status:', status);
      });

    channelRef.current = channel;
    
    return () => {
      if (channelRef.current) {
        logger.log('📡 [BROADCAST] Cleaning up issue status channel for team:', teamId);
        supabase.removeChannel(channelRef.current);
      }
      channelRef.current = null;
    };
  }, [teamId]); // ONLY teamId in deps - callback is accessed via ref

  const publishStatusChange = useCallback((issueId: string, status: string) => {
    if (!channelRef.current) {
      logger.log('📡 [BROADCAST] No channel available, skipping issue status publish');
      return;
    }
    
    try {
      logger.log('📤 [BROADCAST] Publishing issue status change:', { issueId, status });
      
      channelRef.current.send({
        type: 'broadcast',
        event: 'issue_status_changed',
        payload: { 
          sender: clientIdRef.current, 
          issueId, 
          status,
          updatedAt: new Date().toISOString()
        } as IssueStatusChangePayload
      });
    } catch (error) {
      // ✅ FIX: Don't throw - broadcast errors shouldn't affect operation success
      logger.warn('⚠️ Failed to broadcast issue status change (operation was successful):', error);
    }
  }, []);

  return { publishStatusChange };
}

