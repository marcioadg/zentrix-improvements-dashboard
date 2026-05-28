
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PendingArchiveTask } from '@/components/dashboard/AutoArchiveTimer';
import { logger } from '@/utils/logger';

interface PendingArchiveTaskInternal extends PendingArchiveTask {
  intervalId: NodeJS.Timeout;
}

export const useAutoArchive = (
  updateTaskStatus: (taskId: string, status: 'todo' | 'in-progress' | 'done') => Promise<boolean>,
  updateTask: (taskId: string, updates: any) => Promise<void>,
  onTaskArchived?: (taskId: string) => void,
  activeMeetingId?: string | null // Make this optional parameter instead of using context
) => {
  const [pendingArchives, setPendingArchives] = useState<Map<string, PendingArchiveTaskInternal>>(new Map());
  const { toast } = useToast();
  const pendingArchivesRef = useRef(pendingArchives);

  // Update ref when state changes
  useEffect(() => {
    pendingArchivesRef.current = pendingArchives;
  }, [pendingArchives]);

  const startAutoArchiveTimer = useCallback((taskId: string, taskTitle: string) => {
    logger.log('Starting auto-archive timer for task:', taskId, taskTitle);
    
    // Don't start timer if in a meeting (tasks will be archived at end of meeting)
    if (activeMeetingId) {
      logger.log('In meeting, skipping auto-archive timer');
      return;
    }

    // Clear any existing timer for this task
    const existing = pendingArchivesRef.current.get(taskId);
    if (existing) {
      logger.log('Clearing existing timer for task:', taskId);
      clearInterval(existing.intervalId);
    }

    let timeLeft = 5;
    
    // Set initial state with 5 seconds
    setPendingArchives(prev => {
      const newMap = new Map(prev);
      newMap.set(taskId, {
        taskId,
        title: taskTitle,
        timeLeft: 5,
        intervalId: null as any // Will be set below
      });
      return newMap;
    });
    
    logger.log('Timer started with 5 seconds for task:', taskTitle);
    
    const intervalId = setInterval(async () => {
      timeLeft -= 1;
      logger.log('Timer tick:', timeLeft, 'for task:', taskTitle);
      
      if (timeLeft > 0) {
        // Update countdown
        setPendingArchives(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(taskId);
          if (existing) {
            newMap.set(taskId, {
              ...existing,
              timeLeft
            });
          }
          return newMap;
        });
      } else {
        // Time's up - archive the task
        logger.log('Time up, archiving task:', taskTitle);
        clearInterval(intervalId);
        
        setPendingArchives(prev => {
          const newMap = new Map(prev);
          newMap.delete(taskId);
          return newMap;
        });

        try {
          await updateTask(taskId, { is_archived: true, archived_at: new Date().toISOString() });
          
          // Immediately remove task from local state
          if (onTaskArchived) {
            onTaskArchived(taskId);
          }
          
          toast({
            title: "Task archived",
            description: `"${taskTitle}" has been automatically archived.`,
          });
        } catch (error) {
          logger.error('Failed to auto-archive task:', error);
          toast({
            title: "Archive failed",
            description: `Failed to archive "${taskTitle}". Please try again.`,
            variant: "destructive",
          });
        }
      }
    }, 1000);

    // Update the interval ID in state
    setPendingArchives(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(taskId);
      if (existing) {
        newMap.set(taskId, {
          ...existing,
          intervalId
        });
      }
      return newMap;
    });
  }, [activeMeetingId, updateTask, toast, onTaskArchived]);

  const undoArchive = useCallback(async (taskId: string) => {
    logger.log('Undoing archive for task:', taskId);
    const pendingTask = pendingArchivesRef.current.get(taskId);
    if (!pendingTask) {
      logger.log('No pending task found for undo:', taskId);
      return;
    }

    // Clear the timer
    clearInterval(pendingTask.intervalId);
    
    // Remove from pending list
    setPendingArchives(prev => {
      const newMap = new Map(prev);
      newMap.delete(taskId);
      return newMap;
    });

    // Move task back to in-progress
    try {
      await updateTaskStatus(taskId, 'in-progress');
      toast({
        title: "Archive cancelled",
        description: `"${pendingTask.title}" moved back to in-progress.`,
      });
    } catch (error) {
      logger.error('Failed to undo archive:', error);
      toast({
        title: "Undo failed",
        description: `Failed to move "${pendingTask.title}" back to in-progress.`,
        variant: "destructive",
      });
    }
  }, [updateTaskStatus, toast]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      pendingArchivesRef.current.forEach(task => {
        clearInterval(task.intervalId);
      });
    };
  }, []);

  // Convert internal structure to external format for component
  const externalPendingArchives: PendingArchiveTask[] = Array.from(pendingArchives.values()).map(({ intervalId, ...task }) => task);

  return {
    pendingArchives: externalPendingArchives,
    startAutoArchiveTimer,
    undoArchive
  };
};
