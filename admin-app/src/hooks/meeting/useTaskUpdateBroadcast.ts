import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface TaskUpdatePayload {
  sender: string;
  taskId: string;
  updates: Record<string, any>;
  updatedAt: string;
}

/**
 * Real-time sync of task property updates via Supabase broadcast channels.
 */
export function useTaskUpdateBroadcast(
  teamId: string | null,
  onRemoteTaskUpdate: (taskId: string, updates: Record<string, any>) => void
) {
  const channelRef = useRef<any>(null);
  const clientIdRef = useRef<string>(
    ((globalThis as any).crypto?.randomUUID?.()) || Math.random().toString(36).slice(2)
  );
  const onRemoteTaskUpdateRef = useRef(onRemoteTaskUpdate);
  
  useEffect(() => {
    onRemoteTaskUpdateRef.current = onRemoteTaskUpdate;
  }, [onRemoteTaskUpdate]);

  useEffect(() => {
    if (!teamId) return;
    
    const channel = supabase.channel(`meeting:${teamId}:task-update`);

    channel
      .on('broadcast', { event: 'task_updated' }, (payload: any) => {
        const { sender, taskId, updates } = payload?.payload as TaskUpdatePayload || {};
        
        // Ignore our own broadcasts
        if (sender === clientIdRef.current) return;
        
        if (taskId && updates) {
          onRemoteTaskUpdateRef.current(taskId, updates);
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

  const publishTaskUpdated = useCallback((taskId: string, updates: Record<string, any>) => {
    if (!channelRef.current) return;
    
    try {
      channelRef.current.send({
        type: 'broadcast',
        event: 'task_updated',
        payload: { 
          sender: clientIdRef.current, 
          taskId,
          updates,
          updatedAt: new Date().toISOString()
        } as TaskUpdatePayload
      });
    } catch (error) {
      logger.warn('Failed to broadcast task update:', error);
    }
  }, []);

  return { publishTaskUpdated };
}
