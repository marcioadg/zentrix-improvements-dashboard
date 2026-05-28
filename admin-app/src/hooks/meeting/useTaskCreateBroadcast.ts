import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedTeamTask } from '@/types/tasks';
import { logger } from '@/utils/logger';

interface TaskCreatePayload {
  sender: string;
  task: UnifiedTeamTask;
  createdAt: string;
}

/**
 * Real-time sync of task creation via Supabase broadcast channels.
 * Uses ref pattern for stable channel subscriptions.
 */
export function useTaskCreateBroadcast(
  teamId: string | null,
  onRemoteTaskCreate: (task: UnifiedTeamTask) => void
) {
  const channelRef = useRef<any>(null);
  const clientIdRef = useRef<string>(
    ((globalThis as any).crypto?.randomUUID?.()) || Math.random().toString(36).slice(2)
  );
  const callbackRef = useRef(onRemoteTaskCreate);

  // Keep callback ref updated without causing channel recreation
  useEffect(() => {
    callbackRef.current = onRemoteTaskCreate;
  }, [onRemoteTaskCreate]);

  useEffect(() => {
    if (!teamId) return;
    
    const channel = supabase.channel(`meeting:${teamId}:task-create`);

    channel
      .on('broadcast', { event: 'task_created' }, (payload: any) => {
        const { sender, task } = payload?.payload as TaskCreatePayload || {};
        
        // Ignore our own broadcasts
        if (sender === clientIdRef.current) return;
        
        if (task) {
          logger.log('📡 [BROADCAST] Received remote task creation:', { taskId: task.id, sender });
          callbackRef.current(task);
        }
      })
      .subscribe((status) => {
        logger.log('📡 [BROADCAST] Task create channel status:', status);
      });

    channelRef.current = channel;
    
    return () => {
      if (channelRef.current) {
        logger.log('📡 [BROADCAST] Cleaning up task create channel for team:', teamId);
        supabase.removeChannel(channelRef.current);
      }
      channelRef.current = null;
    };
  }, [teamId]);

  const publishTaskCreated = useCallback((task: UnifiedTeamTask) => {
    if (!channelRef.current) {
      logger.log('📡 [BROADCAST] No channel available, skipping task create publish');
      return;
    }
    
    try {
      logger.log('📤 [BROADCAST] Publishing task creation:', { taskId: task.id, title: task.title });
      
      channelRef.current.send({
        type: 'broadcast',
        event: 'task_created',
        payload: { 
          sender: clientIdRef.current, 
          task,
          createdAt: new Date().toISOString()
        } as TaskCreatePayload
      });
    } catch (error) {
      // ✅ FIX: Don't throw - broadcast errors shouldn't affect operation success
      logger.warn('⚠️ Failed to broadcast task creation (operation was successful):', error);
    }
  }, []);

  return { publishTaskCreated };
}
