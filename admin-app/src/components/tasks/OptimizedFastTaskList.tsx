
import React, { memo, useMemo, useCallback } from 'react';
import { FastTask } from '@/hooks/useFastTasks';
import { EnhancedFastTaskList } from './EnhancedFastTaskList';
import { logger } from '@/utils/logger';

interface PendingArchive {
  taskId: string;
  title: string;
  timeLeft: number;
}

interface OptimizedFastTaskListProps {
  tasks: FastTask[];
  onToggleTask: (taskId: string) => Promise<void>;
  onUpdateTask: (taskId: string, updates: Partial<FastTask>) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onArchiveTask: (taskId: string) => Promise<void>; // Add archive handler
  onEditTask: (task: FastTask) => void;
  pendingArchives?: PendingArchive[];
  onUndoArchive?: (taskId: string) => Promise<void>;
}

export const OptimizedFastTaskList: React.FC<OptimizedFastTaskListProps> = memo(({
  tasks,
  onToggleTask,
  onUpdateTask,
  onDeleteTask,
  onArchiveTask,
  onEditTask,
  pendingArchives = [],
  onUndoArchive
}) => {
  // Memoize expensive computations
  const { completedTasks, pendingTasks } = useMemo(() => {
    const completed = tasks.filter(task => task.status === 'done');
    const pending = tasks.filter(task => task.status !== 'done');
    return { completedTasks: completed, pendingTasks: pending };
  }, [tasks]);

  // Memoize handlers to prevent child re-renders
  const memoizedToggleTask = useCallback((taskId: string) => {
    return onToggleTask(taskId);
  }, [onToggleTask]);

  const memoizedUpdateTask = useCallback((taskId: string, updates: Partial<FastTask>) => {
    return onUpdateTask(taskId, updates);
  }, [onUpdateTask]);

  const memoizedDeleteTask = useCallback((taskId: string) => {
    return onDeleteTask(taskId);
  }, [onDeleteTask]);

  const memoizedArchiveTask = useCallback((taskId: string) => {
    logger.log('📋 OptimizedFastTaskList: Archive task called:', taskId);
    return onArchiveTask(taskId);
  }, [onArchiveTask]);

  const memoizedEditTask = useCallback((task: FastTask) => {
    onEditTask(task);
  }, [onEditTask]);

  const memoizedUndoArchive = useCallback((taskId: string) => {
    if (onUndoArchive) {
      return onUndoArchive(taskId);
    }
    return Promise.resolve();
  }, [onUndoArchive]);

  logger.log('🚀 OptimizedFastTaskList render:', {
    totalTasks: tasks.length,
    pendingTasks: pendingTasks.length,
    completedTasks: completedTasks.length,
    pendingArchives: pendingArchives.length
  });

  // Use existing EnhancedFastTaskList but with optimized props
  return (
    <EnhancedFastTaskList
      tasks={tasks}
      onToggleTask={memoizedToggleTask}
      onUpdateTask={memoizedUpdateTask}
      onDeleteTask={memoizedDeleteTask}
      onArchiveTask={memoizedArchiveTask} // Pass archive handler
      onEditTask={memoizedEditTask}
      pendingArchives={pendingArchives}
      onUndoArchive={memoizedUndoArchive}
    />
  );
});

OptimizedFastTaskList.displayName = 'OptimizedFastTaskList';
