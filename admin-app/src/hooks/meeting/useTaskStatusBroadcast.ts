import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface TaskStatusChangePayload {
  sender: string;
  taskId: string;
  completed: boolean;
  updatedAt: string;
}

/**
 * Real-time sync of task status changes via Supabase broadcast channels.
 * Uses ref pattern for stable channel subscriptions.
 */
export function useTaskStatusBroadcast(
  teamId: string | null,
  onRemoteStatusChange: (taskId: string, completed: boolean) => void
) {
  const channelRef = useRef<any>(null);
  const clientIdRef = useRef<string>(
    ((globalThis as any).crypto?.randomUUID?.()) || Math.random().toString(36).slice(2)
  );
  const callbackRef = useRef(onRemoteStatusChange);

  // Keep callback ref updated without causing channel recreation
  useEffect(() => {
    callbackRef.current = onRemoteStatusChange;
  }, [onRemoteStatusChange]);

  useEffect(() => {
    if (!teamId) return;
    
    const channel = supabase.channel(`meeting:${teamId}:task-status`);

    channel
      .on('broadcast', { event: 'task_status_changed' }, (payload: any) => {
        const { sender, taskId, completed } = payload?.payload as TaskStatusChangePayload || {};
        
        // Ignore our own broadcasts
        if (sender === clientIdRef.current) return;
        
        if (taskId && typeof completed === 'boolean') {
          logger.log('📡 [BROADCAST] Received remote task status change:', { taskId, completed, sender });
          callbackRef.current(taskId, completed);
        }
      })
      .subscribe((status) => {
        logger.log('📡 [BROADCAST] Task status channel status:', status);
      });

    channelRef.current = channel;
    
    return () => {
      if (channelRef.current) {
        logger.log('📡 [BROADCAST] Cleaning up task status channel for team:', teamId);
        supabase.removeChannel(channelRef.current);
      }
      channelRef.current = null;
    };
  }, [teamId]);

  const publishStatusChange = useCallback((taskId: string, completed: boolean) => {
    if (!channelRef.current) {
      logger.log('📡 [BROADCAST] No channel available, skipping task status publish');
      return;
    }
    
    try {
      logger.log('📤 [BROADCAST] Publishing task status change:', { taskId, completed });
      
      channelRef.current.send({
        type: 'broadcast',
        event: 'task_status_changed',
        payload: { 
          sender: clientIdRef.current, 
          taskId, 
          completed,
          updatedAt: new Date().toISOString()
        } as TaskStatusChangePayload
      });
    } catch (error) {
      // ✅ FIX: Don't throw - broadcast errors shouldn't affect operation success
      logger.warn('⚠️ Failed to broadcast task status change (operation was successful):', error);
    }
  }, []);

  return { publishStatusChange };
}
