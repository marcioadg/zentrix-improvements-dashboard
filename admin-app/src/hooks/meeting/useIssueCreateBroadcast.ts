import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Issue } from '@/hooks/useSimpleIssues';
import { logger } from '@/utils/logger';

interface IssueCreatePayload {
  sender: string;
  issue: Issue;
  createdAt: string;
}

/**
 * Real-time sync of issue creation via Supabase broadcast channels.
 * Uses ref pattern to ensure stable channel subscription (prevents missed broadcasts).
 */
export function useIssueCreateBroadcast(
  teamId: string | null,
  onRemoteIssueCreate: (issue: Issue) => void
) {
  const channelRef = useRef<any>(null);
  const clientIdRef = useRef<string>(
    ((globalThis as any).crypto?.randomUUID?.()) || Math.random().toString(36).slice(2)
  );
  
  // CRITICAL: Use ref pattern to store callback - prevents channel recreation
  const callbackRef = useRef(onRemoteIssueCreate);
  
  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onRemoteIssueCreate;
  }, [onRemoteIssueCreate]);

  useEffect(() => {
    if (!teamId) return;
    
    logger.log('📡 [BROADCAST] Setting up issue create channel for team:', teamId);
    
    const channel = supabase.channel(`meeting:${teamId}:issue-create`);

    channel
      .on('broadcast', { event: 'issue_created' }, (payload: any) => {
        const { sender, issue } = payload?.payload as IssueCreatePayload || {};
        
        // Ignore our own broadcasts
        if (sender === clientIdRef.current) {
          logger.log('📡 [BROADCAST] Ignoring own issue creation broadcast');
          return;
        }
        
        if (issue) {
          logger.log('📡 [BROADCAST] Received remote issue creation:', { issueId: issue.id, sender });
          // Call through ref to ensure we use latest callback
          callbackRef.current(issue);
        }
      })
      .subscribe((status) => {
        logger.log('📡 [BROADCAST] Issue create channel status:', status);
      });

    channelRef.current = channel;
    
    return () => {
      if (channelRef.current) {
        logger.log('📡 [BROADCAST] Cleaning up issue create channel for team:', teamId);
        supabase.removeChannel(channelRef.current);
      }
      channelRef.current = null;
    };
  }, [teamId]); // ONLY teamId in deps - callback is accessed via ref

  const publishIssueCreated = useCallback((issue: Issue) => {
    if (!channelRef.current) {
      logger.log('📡 [BROADCAST] No channel available, skipping issue create publish');
      return;
    }
    
    try {
      logger.log('📤 [BROADCAST] Publishing issue creation:', { issueId: issue.id, title: issue.title });
      
      channelRef.current.send({
        type: 'broadcast',
        event: 'issue_created',
        payload: { 
          sender: clientIdRef.current, 
          issue,
          createdAt: new Date().toISOString()
        } as IssueCreatePayload
      });
    } catch (error) {
      // ✅ FIX: Don't throw - broadcast errors shouldn't affect operation success
      logger.warn('⚠️ Failed to broadcast issue creation (operation was successful):', error);
    }
  }, []);

  return { publishIssueCreated };
}
