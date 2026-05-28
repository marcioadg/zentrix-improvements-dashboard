
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FastTask } from './types';
import { toast } from 'sonner';
import { trackTaskArchivedV2 } from '@/lib/statsigAnalytics';
import { logger } from '@/utils/logger';

export const useOptimisticFastTaskArchiving = (
  tasks: FastTask[],
  setTasks: React.Dispatch<React.SetStateAction<FastTask[]>>,
  onUndoSuccess?: (taskId: string, task: FastTask) => void
) => {
  const [archivingTasks, setArchivingTasks] = useState<Set<string>>(new Set());

  const archiveTaskOptimistically = useCallback(async (taskId: string): Promise<boolean> => {
    const taskToArchive = tasks.find(t => t.id === taskId);
    if (!taskToArchive) return false;

    try {
      // 1. Add to archiving set for loading state
      setArchivingTasks(prev => new Set([...prev, taskId]));

      // 2. Optimistically remove from UI immediately
      setTasks(prev => prev.filter(t => t.id !== taskId));

      // 3. Show optimistic feedback with undo option
      toast.success(`"${taskToArchive.title}" archived`, {
        action: {
          label: "Undo",
          onClick: () => undoArchive(taskId, taskToArchive)
        }
      });

      // 4. Perform actual database update
      const { error } = await supabase
        .from('fast_tasks')
        .update({ 
          is_archived: true,
          archived_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;

      // 5. Success - remove from archiving set
      setArchivingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });

      // 6. Track task archived event
      try {
        trackTaskArchivedV2({
          user_id: taskToArchive.userId ?? undefined,
          company_id: taskToArchive.companyId ?? undefined,
          task_id: taskId,
          was_completed: taskToArchive.status === 'done',
        });
      } catch (e) {
        // Non-blocking
      }

      return true;

    } catch (error) {
      logger.error('Error archiving fast task:', error);
      
      // 6. Rollback optimistic update on error
      setTasks(prev => [taskToArchive, ...prev]);
      setArchivingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });

      toast.error("Failed to archive task. Please try again.");
      return false;
    }
  }, [tasks, setTasks]);

  const undoArchive = useCallback(async (taskId: string, originalTask: FastTask) => {
    try {
      // 1. Optimistically restore task to UI
      setTasks(prev => [originalTask, ...prev]);

      // 2. Update database to restore
      const { error } = await supabase
        .from('fast_tasks')
        .update({ 
          is_archived: false,
          archived_at: null
        })
        .eq('id', taskId);

      if (error) throw error;

      toast.success(`"${originalTask.title}" restored`);

      // 3. Notify parent of successful undo for broadcasting
      onUndoSuccess?.(taskId, originalTask);

    } catch (error) {
      logger.error('Error restoring fast task:', error);
      
      // Remove from UI if restore failed (task is still archived)
      setTasks(prev => prev.filter(t => t.id !== taskId));
      
      toast.error("Failed to restore task");
    }
  }, [setTasks, onUndoSuccess]);

  return {
    archiveTaskOptimistically,
    archivingTasks,
    undoArchive
  };
};
