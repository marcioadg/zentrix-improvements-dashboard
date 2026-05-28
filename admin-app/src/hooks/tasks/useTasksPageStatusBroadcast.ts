import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

type TaskStatus = 'todo' | 'in-progress' | 'done';

interface TaskStatusChangePayload {
  sender: string;
  taskId: string;
  status: TaskStatus;
  updatedAt: string;
}

/**
 * Real-time sync of task status changes via Supabase broadcast channels for /tasks page.
 * Follows the exact same proven pattern as useTaskStatusBroadcast (meetings).
 * Uses company-wide scope instead of meeting/team scope.
 * Supports full 3-state status (todo, in-progress, done) instead of boolean.
 */
export function useTasksPageStatusBroadcast(
  companyId: string | null,
  onRemoteStatusChange: (taskId: string, status: TaskStatus) => void
) {
  const channelRef = useRef<any>(null);
  const clientIdRef = useRef<string>(
    ((globalThis as any).crypto?.randomUUID?.()) || Math.random().toString(36).slice(2)
  );

  useEffect(() => {
    if (!companyId) return;
    
    const channel = supabase.channel(`tasks:${companyId}:status`);

    channel
      .on('broadcast', { event: 'task_status_changed' }, (payload: any) => {
        const { sender, taskId, status } = payload?.payload as TaskStatusChangePayload || {};
        
        // Ignore our own broadcasts
        if (sender === clientIdRef.current) return;
        
        if (taskId && status) {
          logger.log('📡 [TASKS BROADCAST] Received remote task status change:', { taskId, status, sender });
          onRemoteStatusChange(taskId, status);
        }
      })
      .subscribe((status) => {
        logger.log('📡 [TASKS BROADCAST] Channel status:', status);
      });

    channelRef.current = channel;
    
    return () => {
      if (channelRef.current) {
        logger.log('📡 [TASKS BROADCAST] Cleaning up channel for company:', companyId);
        supabase.removeChannel(channelRef.current);
      }
      channelRef.current = null;
    };
  }, [companyId, onRemoteStatusChange]);

  const publishStatusChange = useCallback((taskId: string, status: TaskStatus) => {
    if (!channelRef.current) {
      logger.log('📡 [TASKS BROADCAST] No channel available, skipping task status publish');
      return;
    }
    
    try {
      logger.log('📤 [TASKS BROADCAST] Publishing task status change:', { taskId, status });
      
      channelRef.current.send({
        type: 'broadcast',
        event: 'task_status_changed',
        payload: { 
          sender: clientIdRef.current, 
          taskId, 
          status,
          updatedAt: new Date().toISOString()
        } as TaskStatusChangePayload
      });
    } catch (error) {
      // ✅ FIX: Don't throw - broadcast errors shouldn't affect operation success
      logger.warn('⚠️ Failed to broadcast task status change (operation was successful):', error);
    }
  }, []);

  // Function to clear remote status (used before local updates to prevent race conditions)
  const clearRemoteStatus = useCallback((taskId: string) => {
    // This is a no-op in the broadcast hook itself - the clearing happens in the tasks state
    logger.log('📡 [TASKS BROADCAST] Clear remote status requested for:', taskId);
  }, []);

  return { publishStatusChange, clearRemoteStatus };
}
