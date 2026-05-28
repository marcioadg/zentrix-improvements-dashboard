import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface TaskArchivePayload {
  sender: string;
  taskId: string;
  archivedAt: string;
}

interface TaskRestorePayload {
  sender: string;
  taskId: string;
  task: any; // Original task data for restoration
  restoredAt: string;
}

/**
 * Real-time sync of task archive/restore changes via Supabase broadcast channels.
 * Uses ref pattern for stable channel subscriptions.
 */
export function useTaskArchiveBroadcast(
  teamId: string | null,
  onRemoteArchive: (taskId: string) => void,
  onRemoteRestore?: (taskId: string, task: any) => void
) {
  const channelRef = useRef<any>(null);
  const clientIdRef = useRef<string>(
    ((globalThis as any).crypto?.randomUUID?.()) || Math.random().toString(36).slice(2)
  );
  const onRemoteArchiveRef = useRef(onRemoteArchive);
  const onRemoteRestoreRef = useRef(onRemoteRestore);

  // Keep callback refs updated without causing channel recreation
  useEffect(() => {
    onRemoteArchiveRef.current = onRemoteArchive;
    onRemoteRestoreRef.current = onRemoteRestore;
  }, [onRemoteArchive, onRemoteRestore]);

  useEffect(() => {
    if (!teamId) return;
    
    const channel = supabase.channel(`meeting:${teamId}:task-archive`);

    channel
      .on('broadcast', { event: 'task_archived' }, (payload: any) => {
        const { sender, taskId } = payload?.payload as TaskArchivePayload || {};
        
        // Ignore our own broadcasts
        if (sender === clientIdRef.current) return;
        
        if (taskId) {
          logger.log('📡 [BROADCAST] Received remote task archive:', { taskId, sender });
          onRemoteArchiveRef.current(taskId);
        }
      })
      .on('broadcast', { event: 'task_restored' }, (payload: any) => {
        const { sender, taskId, task } = payload?.payload as TaskRestorePayload || {};
        
        // Ignore our own broadcasts
        if (sender === clientIdRef.current) return;
        
        if (taskId && onRemoteRestoreRef.current) {
          logger.log('📡 [BROADCAST] Received remote task restore:', { taskId, sender });
          onRemoteRestoreRef.current(taskId, task);
        }
      })
      .subscribe((status) => {
        logger.log('📡 [BROADCAST] Task archive channel status:', status);
      });

    channelRef.current = channel;
    
    return () => {
      if (channelRef.current) {
        logger.log('📡 [BROADCAST] Cleaning up task archive channel for team:', teamId);
        supabase.removeChannel(channelRef.current);
      }
      channelRef.current = null;
    };
  }, [teamId]);

  const publishArchive = useCallback((taskId: string) => {
    if (!channelRef.current) {
      logger.log('📡 [BROADCAST] No channel available, skipping task archive publish');
      return;
    }
    
    try {
      logger.log('📤 [BROADCAST] Publishing task archive:', { taskId });
      
      channelRef.current.send({
        type: 'broadcast',
        event: 'task_archived',
        payload: { 
          sender: clientIdRef.current, 
          taskId,
          archivedAt: new Date().toISOString()
        } as TaskArchivePayload
      });
    } catch (error) {
      // ✅ FIX: Don't throw - broadcast errors shouldn't affect operation success
      logger.warn('⚠️ Failed to broadcast task archive (operation was successful):', error);
    }
  }, []);

  const publishRestore = useCallback((taskId: string, task: any) => {
    if (!channelRef.current) {
      logger.log('📡 [BROADCAST] No channel available, skipping task restore publish');
      return;
    }
    
    try {
      logger.log('📤 [BROADCAST] Publishing task restore:', { taskId });
      
      channelRef.current.send({
        type: 'broadcast',
        event: 'task_restored',
        payload: { 
          sender: clientIdRef.current, 
          taskId,
          task,
          restoredAt: new Date().toISOString()
        } as TaskRestorePayload
      });
    } catch (error) {
      // ✅ FIX: Don't throw - broadcast errors shouldn't affect operation success
      logger.warn('⚠️ Failed to broadcast task restore (operation was successful):', error);
    }
  }, []);

  return { publishArchive, publishRestore };
}
