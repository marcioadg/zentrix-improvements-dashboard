
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedKanbanTask } from '@/types/tasks';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export const useOptimisticTaskArchiving = (
  tasks: UnifiedKanbanTask[],
  setTasks: React.Dispatch<React.SetStateAction<UnifiedKanbanTask[]>>
) => {
  const [archivingTasks, setArchivingTasks] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const archiveTaskOptimistically = useCallback(async (taskId: string): Promise<boolean> => {
    const taskToArchive = tasks.find(t => t.id === taskId);
    if (!taskToArchive) return false;

    try {
      // 1. Add to archiving set for loading state
      setArchivingTasks(prev => new Set([...prev, taskId]));

      // 2. Optimistically remove from UI immediately
      setTasks(prev => prev.filter(t => t.id !== taskId));

      // 3. Show optimistic feedback
      toast({
        title: "Task Archived",
        description: `"${taskToArchive.title}" has been archived`,
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

      return true;

    } catch (error) {
      logger.error('Error archiving task:', error);
      
      // 6. Rollback optimistic update on error
      setTasks(prev => [taskToArchive, ...prev]);
      setArchivingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });

      toast({
        title: "Archive Failed",
        description: "Failed to archive task. Please try again.",
        variant: "destructive"
      });

      return false;
    }
  }, [tasks, setTasks, toast]);

  const undoArchive = useCallback(async (taskId: string, originalTask: UnifiedKanbanTask) => {
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

      toast({
        title: "Task Restored",
        description: `"${originalTask.title}" has been restored`
      });

    } catch (error) {
      logger.error('Error restoring task:', error);
      
      // Remove from UI again if restore failed
      setTasks(prev => prev.filter(t => t.id !== taskId));
      
      toast({
        title: "Restore Failed",
        description: "Failed to restore task",
        variant: "destructive"
      });
    }
  }, [setTasks, toast]);

  return {
    archiveTaskOptimistically,
    archivingTasks,
    undoArchive
  };
};
