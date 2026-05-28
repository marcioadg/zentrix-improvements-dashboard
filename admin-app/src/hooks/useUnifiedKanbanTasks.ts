
import { useUnifiedKanbanTasksData } from './unified-kanban/useUnifiedKanbanTasksData';
import { useUnifiedKanbanTasksOperations } from './unified-kanban/useUnifiedKanbanTasksOperations';
import { useOptimisticTaskArchiving } from './unified-kanban/useOptimisticTaskArchiving';

export const useUnifiedKanbanTasks = ({ selectedTeamIds }: { selectedTeamIds: string[] }) => {
  const { tasks, loading, setTasks, fetchTasks } = useUnifiedKanbanTasksData(selectedTeamIds);
  
  const {
    addTask,
    updateTaskStatus,
    updateTask,
    deleteTask: originalDeleteTask,
  } = useUnifiedKanbanTasksOperations(tasks, setTasks, selectedTeamIds);

  const {
    archiveTaskOptimistically,
    archivingTasks,
    undoArchive
  } = useOptimisticTaskArchiving(tasks, setTasks);

  // Convert archiving tasks to pending archives format
  const pendingArchives = Array.from(archivingTasks).map(taskId => {
    const task = tasks.find(t => t.id === taskId);
    return {
      taskId,
      title: task?.title || 'Unknown Task',
      timeLeft: 5 // Default timeout
    };
  });

  // Use optimistic archiving for delete operations
  const deleteTask = archiveTaskOptimistically;

  return {
    tasks,
    loading,
    addTask,
    updateTaskStatus,
    updateTask,
    deleteTask,
    pendingArchives,
    undoArchive,
    refetch: fetchTasks,
  };
};
