import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface IssueArchivePayload {
  sender: string;
  issueId: string;
  archived: boolean;
  updatedAt: string;
}

/**
 * Real-time sync of issue archive/restore events via Supabase broadcast channels.
 * Uses ref pattern to ensure stable channel subscription (prevents missed broadcasts).
 */
export function useIssueArchiveBroadcast(
  teamId: string | null,
  onRemoteArchive: (issueId: string) => void,
  onRemoteRestore?: (issueId: string) => void
) {
  const channelRef = useRef<any>(null);
  const clientIdRef = useRef<string>(
    ((globalThis as any).crypto?.randomUUID?.()) || Math.random().toString(36).slice(2)
  );
  
  // CRITICAL: Use ref pattern to store callbacks - prevents channel recreation
  const archiveCallbackRef = useRef(onRemoteArchive);
  const restoreCallbackRef = useRef(onRemoteRestore);
  
  // Keep callback refs updated
  useEffect(() => {
    archiveCallbackRef.current = onRemoteArchive;
    restoreCallbackRef.current = onRemoteRestore;
  }, [onRemoteArchive, onRemoteRestore]);

  useEffect(() => {
    if (!teamId) return;
    
    logger.log('📡 [BROADCAST] Setting up issue archive channel for team:', teamId);
    
    const channel = supabase.channel(`meeting:${teamId}:issue-archive`);

    channel
      .on('broadcast', { event: 'issue_archived' }, (payload: any) => {
        const { sender, issueId, archived } = payload?.payload as IssueArchivePayload || {};
        
        // Ignore our own broadcasts
        if (sender === clientIdRef.current) {
          logger.log('📡 [BROADCAST] Ignoring own issue archive broadcast');
          return;
        }
        
        if (issueId) {
          logger.log('📡 [BROADCAST] Received remote issue archive/restore:', { issueId, archived, sender });
          if (archived) {
            archiveCallbackRef.current(issueId);
          } else if (restoreCallbackRef.current) {
            restoreCallbackRef.current(issueId);
          }
        }
      })
      .subscribe((status) => {
        logger.log('📡 [BROADCAST] Issue archive channel status:', status);
      });

    channelRef.current = channel;
    
    return () => {
      if (channelRef.current) {
        logger.log('📡 [BROADCAST] Cleaning up issue archive channel for team:', teamId);
        supabase.removeChannel(channelRef.current);
      }
      channelRef.current = null;
    };
  }, [teamId]); // ONLY teamId in deps - callbacks are accessed via refs

  const publishArchive = useCallback((issueId: string) => {
    if (!channelRef.current) {
      logger.log('📡 [BROADCAST] No channel available, skipping issue archive publish');
      return;
    }
    
    try {
      logger.log('📤 [BROADCAST] Publishing issue archive:', { issueId });
      
      channelRef.current.send({
        type: 'broadcast',
        event: 'issue_archived',
        payload: { 
          sender: clientIdRef.current, 
          issueId, 
          archived: true,
          updatedAt: new Date().toISOString()
        } as IssueArchivePayload
      });
    } catch (error) {
      logger.warn('⚠️ Failed to broadcast issue archive (operation was successful):', error);
    }
  }, []);

  const publishRestore = useCallback((issueId: string) => {
    if (!channelRef.current) {
      logger.log('📡 [BROADCAST] No channel available, skipping issue restore publish');
      return;
    }
    
    try {
      logger.log('📤 [BROADCAST] Publishing issue restore:', { issueId });
      
      channelRef.current.send({
        type: 'broadcast',
        event: 'issue_archived',
        payload: { 
          sender: clientIdRef.current, 
          issueId, 
          archived: false,
          updatedAt: new Date().toISOString()
        } as IssueArchivePayload
      });
    } catch (error) {
      logger.warn('⚠️ Failed to broadcast issue restore (operation was successful):', error);
    }
  }, []);

  return { publishArchive, publishRestore };
}
