
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useUnifiedKanbanTasksData } from './unified-kanban/useUnifiedKanbanTasksData';
import { useUnifiedKanbanTasksOperations } from './unified-kanban/useUnifiedKanbanTasksOperations';
import { useOptimisticTaskArchiving } from './unified-kanban/useOptimisticTaskArchiving';
import { UnifiedKanbanTask } from '@/types/tasks';
import { TaskStatus } from '@/types/kanban';

interface TaskOptions {
  myTasksOnly?: boolean;
  showArchived?: boolean;
}

export const useOptimizedUnifiedTasks = (
  selectedTeamIds: string[] = [],
  options: TaskOptions = {}
) => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const [tasks, setTasks] = useState<UnifiedKanbanTask[]>([]);
  
  // Get base data and operations
  const { 
    tasks: rawTasks, 
    loading, 
    error,
    fetchTasks 
  } = useUnifiedKanbanTasksData(selectedTeamIds, options.showArchived);

  const {
    addTask,
    updateTaskStatus,
    updateTask,
    deleteTask: originalDeleteTask
  } = useUnifiedKanbanTasksOperations(tasks, setTasks, selectedTeamIds);

  // Add optimistic archiving
  const {
    archiveTaskOptimistically,
    archivingTasks,
    undoArchive
  } = useOptimisticTaskArchiving(tasks, setTasks);

  // Helper function to check if user is assigned to task
  const isAssignedToTask = (task: UnifiedKanbanTask, userId: string): boolean => {
    // Cast to any to check both camelCase and snake_case fields
    const taskAny = task as any;
    // Check camelCase field first (frontend objects use this)
    if (Array.isArray(taskAny.assignedTo) && taskAny.assignedTo.includes(userId)) {
      return true;
    }
    // Fallback to snake_case field (type definition)
    return Array.isArray(task.assigned_to) && task.assigned_to.includes(userId);
  };

  // Filter tasks based on options
  const filteredTasks = rawTasks.filter(task => {
    // Filter by my tasks only - check both assigned_to array and user_id (personal tasks)
    if (options.myTasksOnly && user) {
      const isAssigned = isAssignedToTask(task, user.id);
      const isPersonalTask = task.user_id === user.id;
      if (!isAssigned && !isPersonalTask) return false;
    }

    // Filter archived tasks
    if (!options.showArchived && task.is_archived) {
      return false;
    }

    return true;
  });

  // Update local tasks when filtered tasks change
  useEffect(() => {
    setTasks(filteredTasks);
  }, [filteredTasks]);

  // Enhanced delete/archive task that uses optimistic archiving
  const deleteTask = useCallback(async (taskId: string): Promise<void> => {
    await archiveTaskOptimistically(taskId);
  }, [archiveTaskOptimistically]);

  const refetch = useCallback(async () => {
    await fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTaskStatus,
    updateTask,
    deleteTask, // This now uses optimistic archiving
    archiveTaskOptimistically,
    archivingTasks,
    undoArchive,
    refetch
  };
};
