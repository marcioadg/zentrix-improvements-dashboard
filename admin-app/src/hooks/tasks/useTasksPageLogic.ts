import { useState, useEffect } from 'react';
import { useTaskCounts } from '@/hooks/useTaskCounts';
import { useUserTeams } from '@/hooks/useUserTeams';
import { useTaskFilterPreferences } from '@/hooks/useTaskFilterPreferences';
import { useOptimizedUnifiedTasks } from '@/hooks/useOptimizedUnifiedTasks';
import { useAutoArchive } from '@/hooks/useAutoArchive';
import { useTaskViewPreferences } from '@/hooks/useTaskViewPreferences';
import { useTaskTeamSelection } from '@/hooks/useTaskTeamSelection';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { logger } from '@/utils/logger';

export const useTasksPageLogic = () => {
  const { user } = useAuth();
  const { currentCompany, loading: companyLoading } = useMultiCompany();
  const { taskCounts, loading: countsLoading } = useTaskCounts();
  const { teams } = useUserTeams();
  const { preferences: filterPreferences, updatePreferences } = useTaskFilterPreferences();
  const { getViewMode, setViewMode } = useTaskViewPreferences();
  const { selectedTeamIds, updateSelection } = useTaskTeamSelection(teams);
  const [viewMode, setViewModeState] = useState<'kanban' | 'list'>(getViewMode());

  const { 
    tasks, 
    loading: tasksLoading, 
    addTask, 
    updateTaskStatus: originalUpdateTaskStatus, 
    updateTask, 
    deleteTask 
  } = useOptimizedUnifiedTasks(selectedTeamIds, {
    myTasksOnly: filterPreferences.myTasksOnly,
    showArchived: filterPreferences.showArchived
  });

  const updateTaskWrapper = async (taskId: string, updates: any): Promise<void> => {
    await updateTask(taskId, updates);
  };

  const handleTaskArchived = (taskId: string) => {
    logger.log('Task archived:', taskId);
  };

  const { pendingArchives, startAutoArchiveTimer, undoArchive } = useAutoArchive(
    originalUpdateTaskStatus,
    updateTaskWrapper,
    handleTaskArchived
  );

  // Calculate task counts that respect the "My Tasks Only" filter
  const transformedTaskCounts = taskCounts.map(tc => {
    let filteredCount = tc.count;
    
    // If "My Tasks Only" is enabled, filter the count
    if (filterPreferences.myTasksOnly && user) {
      // For personal tasks, the count should be the same since they're always "mine"
      if (tc.type === 'personal') {
        filteredCount = tc.count;
      } else if (tc.type === 'team') {
        // For team tasks, we need to get the actual filtered count from our tasks
        const teamTasks = tasks.filter(task => 
          task.team_id === tc.id && 
          task.assigned_to?.includes(user.id)
        );
        filteredCount = teamTasks.length;
      }
    }

    return {
      id: tc.id,
      name: tc.name,
      personalCount: tc.type === 'personal' ? filteredCount : 0,
      teamCount: tc.type === 'team' ? filteredCount : 0,
      totalCount: filteredCount
    };
  });

  const handleViewModeChange = (mode: 'kanban' | 'list') => {
    setViewModeState(mode);
    setViewMode(mode);
  };

  const handleAddTask = async (title: string, description: string, teamSelection: { type: 'personal' | 'team'; teamId?: string }, status: 'todo' | 'in-progress' | 'done' = 'todo') => {
    logger.log('🎯 Tasks.tsx: Creating task with status:', status, 'for company:', currentCompany?.name);
    
    const taskData = {
      title,
      description,
      teamSelection,
      status
    };
    
    await addTask(title, description, teamSelection);
  };

  const handleUpdateTaskStatus = async (taskId: string, status: 'todo' | 'in-progress' | 'done'): Promise<boolean> => {
    const success = await originalUpdateTaskStatus(taskId, status);
    
    if (success && status === 'done') {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        startAutoArchiveTimer(taskId, task.title);
      }
    }
    
    return success;
  };

  const handleUpdateTask = async (taskId: string, updates: any) => {
    await updateTask(taskId, updates);
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTask(taskId);
  };

  const convertedTasks = tasks.map(task => {
    logger.log('🔄 Converting task for Kanban:', { id: task.id, title: task.title, status: task.status });
    return {
      id: task.id,
      title: task.title,
      description: task.description || '',
      status: task.status,
      due_date: task.due_date,
      assigned_to: task.assigned_to?.[0] ? [task.assigned_to[0]] : (task.user_id ? [task.user_id] : []),
      created_at: task.created_at,
      updated_at: task.updated_at,
      archived: task.is_archived,
      task_type: task.task_type,
      team_id: task.team_id || '',
      user_id: task.user_id || '',
      completed: task.status === 'done'
    };
  });

  logger.log('🎯 Tasks.tsx: Converted tasks for Kanban for company:', currentCompany?.name, convertedTasks.map(t => ({ id: t.id, title: t.title, status: t.status })));

  const kanbanFilterPreferences = {
    sortBy: filterPreferences.sortBy,
    sortOrder: filterPreferences.sortOrder
  };

  const loading = companyLoading || countsLoading || tasksLoading;

  return {
    // Data
    teams,
    transformedTaskCounts,
    selectedTeamIds,
    filterPreferences,
    viewMode,
    tasks,
    convertedTasks,
    kanbanFilterPreferences,
    loading,
    pendingArchives,
    
    // Handlers
    updateSelection,
    updatePreferences,
    handleViewModeChange,
    handleAddTask,
    handleUpdateTaskStatus,
    handleUpdateTask,
    handleDeleteTask,
    undoArchive
  };
};
