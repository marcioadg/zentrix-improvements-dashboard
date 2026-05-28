import { useState, useCallback, useMemo, useEffect } from 'react';
import { useTaskTeamSelection } from '@/hooks/useTaskTeamSelection';
import { useTaskFilterPreferences } from '@/hooks/useTaskFilterPreferences';
import { useSimpleTasksData } from '@/hooks/useSimpleTasksData';
import { useOptimizedTaskOperations } from '@/hooks/useOptimizedTaskOperations';
import { useTasksReducer } from '@/hooks/useTasksReducer';
import { useRequestDeduplication } from '@/hooks/useRequestDeduplication';
import { useProgressiveLoading } from '@/hooks/useProgressiveLoading';
import { useTaskSettings } from '@/hooks/useTaskSettings';
import { UnifiedKanbanTask } from '@/types/tasks';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

export const useStreamlinedTasksPageLogic = () => {
  logger.log('🔄 useStreamlinedTasksPageLogic: Starting initialization');
  
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list');
  
  // Use task settings (now hardcoded to false for both archived and completed)
  let settings, updateSettings;
  try {
    const taskSettings = useTaskSettings();
    settings = taskSettings.settings;
    updateSettings = taskSettings.updateSettings;
    logger.log('✅ Task settings initialized (hardcoded):', settings);
  } catch (error) {
    logger.error('❌ Task settings failed:', error);
    throw error;
  }

  // Use the new reducer for consolidated state management
  let tasksState, tasksActions;
  try {
    const reducer = useTasksReducer();
    tasksState = reducer.state;
    tasksActions = reducer.actions;
    logger.log('✅ Tasks reducer initialized');
  } catch (error) {
    logger.error('❌ Tasks reducer failed:', error);
    throw error;
  }
  
  // Request deduplication for network optimization
  let deduplicate, invalidateRequests;
  try {
    const dedup = useRequestDeduplication({
      ttl: 10000, // 10 seconds TTL for task operations
      maxSize: 100
    });
    deduplicate = dedup.deduplicate;
    invalidateRequests = dedup.invalidate;
    logger.log('✅ Request deduplication initialized');
  } catch (error) {
    logger.error('❌ Request deduplication failed:', error);
    throw error;
  }

  // Use simple data fetching (no longer needs showArchived parameter since it's hardcoded to false)
  let selectedTeamIds, updateSelection;
  try {
    const teamSelection = useTaskTeamSelection([]);
    selectedTeamIds = teamSelection.selectedTeamIds;
    updateSelection = teamSelection.updateSelection;
    logger.log('✅ Team selection initialized:', selectedTeamIds);
  } catch (error) {
    logger.error('❌ Team selection failed:', error);
    throw error;
  }

  let filterPreferences, updatePreferences;
  try {
    const filterHook = useTaskFilterPreferences();
    filterPreferences = filterHook.preferences;
    updatePreferences = filterHook.updatePreferences;
    logger.log('✅ Filter preferences initialized');
  } catch (error) {
    logger.error('❌ Filter preferences failed:', error);
    throw error;
  }
  
  let rawTasks, rawTaskCounts, teams, loading, error, refetch, retry, retryAttempt;
  try {
    // Fetch all tasks and teams data with enhanced error handling
    const tasksData = useSimpleTasksData(['personal', ...teams.map(t => t.id)]);
    rawTasks = tasksData.tasks;
    rawTaskCounts = tasksData.taskCounts;
    teams = tasksData.teams;
    loading = tasksData.loading;
    error = tasksData.error;
    refetch = tasksData.refetch;
    retry = tasksData.retry;
    retryAttempt = tasksData.retryAttempt;
    logger.log('✅ Simple tasks data initialized:', { 
      rawTasksCount: rawTasks.length, 
      teamsCount: teams.length,
      loading,
      error: error ? 'Present' : 'None',
      retryAttempt
    });
  } catch (error) {
    logger.error('❌ Simple tasks data failed:', error);
    throw error;
  }

  // CLIENT-SIDE FILTERING: Filter tasks based on selected team IDs
  const filteredTasks = useMemo(() => {
    if (!selectedTeamIds.length) {
      logger.log('🔍 No teams selected, showing all tasks');
      return rawTasks;
    }

    const filtered = rawTasks.filter(task => {
      // Personal tasks: show if 'personal' team is selected
      if (task.task_type === 'personal') {
        return selectedTeamIds.includes('personal');
      }
      
      // Team tasks: show if task's team_id is in selected teams
      if (task.task_type === 'team' && task.team_id) {
        return selectedTeamIds.includes(task.team_id);
      }
      
      // Product tasks: show if they have a team_id that's selected
      if (task.task_type === 'product' && task.team_id) {
        return selectedTeamIds.includes(task.team_id);
      }
      
      return false;
    });

    logger.log('🔍 Task filtering results:', {
      selectedTeamIds,
      rawTasksCount: rawTasks.length,
      filteredTasksCount: filtered.length,
      personalTasks: filtered.filter(t => t.task_type === 'personal').length,
      teamTasks: filtered.filter(t => t.task_type === 'team').length,
      productTasks: filtered.filter(t => t.task_type === 'product').length
    });

    return filtered;
  }, [rawTasks, selectedTeamIds]);

  // RECALCULATE TASK COUNTS based on filtered tasks
  const taskCounts = useMemo(() => {
    const counts: Array<{ id: string; totalCount: number }> = [];
    
    // Personal tasks count (only if selected)
    if (selectedTeamIds.includes('personal')) {
      const personalCount = filteredTasks.filter(t => t.task_type === 'personal').length;
      counts.push({ id: 'personal', totalCount: personalCount });
    }

    // Team task counts (only for selected teams)
    teams.forEach(team => {
      if (selectedTeamIds.includes(team.id)) {
        const teamTaskCount = filteredTasks.filter(t => 
          (t.task_type === 'team' || t.task_type === 'product') && t.team_id === team.id
        ).length;
        counts.push({ id: team.id, totalCount: teamTaskCount });
      }
    });

    logger.log('📊 Recalculated task counts:', counts);
    return counts;
  }, [filteredTasks, selectedTeamIds, teams]);

  let addTaskOp, updateTaskStatusOp, updateTaskOp, deleteTaskOp, pending;
  try {
    const operations = useOptimizedTaskOperations(refetch);
    addTaskOp = operations.addTask;
    updateTaskStatusOp = operations.updateTaskStatus;
    updateTaskOp = operations.updateTask;
    deleteTaskOp = operations.deleteTask;
    pending = operations.pending;
    logger.log('✅ Task operations initialized');
  } catch (error) {
    logger.error('❌ Task operations failed:', error);
    throw error;
  }

  // Progressive loading for better UX - now uses filtered tasks
  let visibleTasks, progressiveLoading, loadAll, loadingProgress;
  try {
    const progressiveHook = useProgressiveLoading(filteredTasks, {
      batchSize: 20,
      delay: 50,
      priority: (task: UnifiedKanbanTask) => {
        try {
          // Prioritize personal tasks and recent tasks
          const isPersonal = task.task_type === 'personal' ? 100 : 0;
          const recency = Date.now() - new Date(task.created_at).getTime();
          const recencyScore = Math.max(0, 100 - (recency / (1000 * 60 * 60 * 24))); // Decay over days
          return isPersonal + recencyScore;
        } catch (error) {
          logger.warn('Priority calculation failed for task:', task, error);
          return 0;
        }
      }
    });
    
    visibleTasks = progressiveHook.visibleItems;
    progressiveLoading = progressiveHook.isLoading;
    loadAll = progressiveHook.loadAll;
    loadingProgress = progressiveHook.progress;
    logger.log('✅ Progressive loading initialized:', { 
      visibleCount: visibleTasks.length,
      totalCount: filteredTasks.length,
      loading: progressiveLoading
    });
  } catch (error) {
    logger.error('❌ Progressive loading failed, using fallback:', error);
    // Fallback to simple implementation
    visibleTasks = filteredTasks;
    progressiveLoading = false;
    loadAll = () => {};
    loadingProgress = 100;
  }

  // Memoized task conversion to prevent expensive operations on every render
  const tasks = useMemo(() => {
    try {
      const taskList = progressiveLoading ? visibleTasks : filteredTasks;
      const converted = taskList.map(task => ({
        ...task,
        task_type: task.task_type as 'personal' | 'team' | 'product'
      })) as UnifiedKanbanTask[];
      logger.log('🔄 Tasks converted:', converted.length);
      return converted;
    } catch (error) {
      logger.error('❌ Task conversion failed:', error);
      return [];
    }
  }, [filteredTasks, visibleTasks, progressiveLoading]);

  // Memoized converted tasks for kanban view
  const convertedTasks = useMemo(() => {
    try {
      return tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        assigned_to: task.assigned_to,
        due_date: task.due_date,
        team_id: task.team_id,
        user_id: task.user_id,
        created_at: task.created_at,
        updated_at: task.updated_at,
        task_type: task.task_type
      }));
    } catch (error) {
      logger.error('❌ Kanban task conversion failed:', error);
      return [];
    }
  }, [tasks]);

  const handleViewModeChange = useCallback((mode: 'kanban' | 'list') => {
    setViewMode(mode);
  }, []);

  const handleAddTask = useCallback(async (
    title: string, 
    description: string, 
    teamSelection: { type: 'personal' | 'team'; teamId?: string },
    status?: 'todo' | 'in-progress' | 'done'
  ) => {
    const requestKey = `add-task-${title}-${teamSelection.type}-${teamSelection.teamId}`;
    
    // Optimistic update
    const optimisticTask: UnifiedKanbanTask = {
      id: `optimistic-${Date.now()}`,
      title,
      description,
      status: status || 'todo',
      task_type: teamSelection.type as 'personal' | 'team',
      user_id: '', // Will be filled by server
      team_id: teamSelection.teamId,
      assigned_to: [], // Empty array for assignments
      due_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_archived: false,
      source: 'manual' // Add the missing source property
    };
    
    tasksActions.addOptimisticTask(optimisticTask);
    
    try {
      await deduplicate(requestKey, () => addTaskOp(title, description, teamSelection));
      tasksActions.removeOptimisticTask(optimisticTask.id);
    } catch (error) {
      // Rollback optimistic update on error
      tasksActions.removeOptimisticTask(optimisticTask.id);
      throw error;
    }
  }, [addTaskOp, deduplicate, tasksActions]);

  const handleAddTaskFromItem = useCallback(async (
    title: string, 
    description?: string, 
    priority?: 'low' | 'medium' | 'high', 
    due_date?: string
  ) => {
    const teamSelection = selectedTeamIds.includes('personal') 
      ? { type: 'personal' as const }
      : { type: 'team' as const, teamId: selectedTeamIds.find(id => id !== 'personal') };
    
    await handleAddTask(title, description || '', teamSelection);
  }, [handleAddTask, selectedTeamIds]);

  const handleUpdateTaskStatus = useCallback(async (
    taskId: string, 
    status: 'todo' | 'in-progress' | 'done'
  ): Promise<boolean> => {
    const requestKey = `update-status-${taskId}-${status}`;
    
    // Optimistic update
    tasksActions.updateOptimisticTask(taskId, { status });
    tasksActions.addPendingOperation(taskId);
    
    try {
      const result = await deduplicate(requestKey, () => updateTaskStatusOp(taskId, status));
      tasksActions.removeOptimisticTask(taskId);
      return result;
    } catch (error) {
      // Rollback optimistic update on error
      tasksActions.removeOptimisticTask(taskId);
      throw error;
    } finally {
      tasksActions.removePendingOperation(taskId);
    }
  }, [updateTaskStatusOp, deduplicate, tasksActions]);

  const handleUpdateTask = useCallback(async (taskId: string, updates: any) => {
    const requestKey = `update-task-${taskId}-${JSON.stringify(updates)}`;
    
    // Optimistic update
    tasksActions.updateOptimisticTask(taskId, updates);
    tasksActions.addPendingOperation(taskId);
    
    try {
      await deduplicate(requestKey, () => updateTaskOp(taskId, updates));
      tasksActions.removeOptimisticTask(taskId);
    } catch (error) {
      // Rollback optimistic update on error
      tasksActions.removeOptimisticTask(taskId);
      throw error;
    } finally {
      tasksActions.removePendingOperation(taskId);
    }
  }, [updateTaskOp, deduplicate, tasksActions]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    // Add to pending archives for undo functionality
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      tasksActions.addPendingArchive(task);
      
      // Auto-remove from pending after 5 seconds
      setTimeout(() => {
        tasksActions.removePendingArchive(taskId);
      }, 5000);
    }
    
    const requestKey = `delete-task-${taskId}`;
    
    try {
      await deduplicate(requestKey, () => deleteTaskOp(taskId));
    } catch (error) {
      // Remove from pending archives on error
      tasksActions.removePendingArchive(taskId);
      throw error;
    }
  }, [deleteTaskOp, tasks, deduplicate, tasksActions]);

  const undoArchive = useCallback((taskId: string) => {
    tasksActions.removePendingArchive(taskId);
    // Here you would restore the task from archive
    // This would require a restore function in the operations hook
  }, [tasksActions]);

  // Enhanced refetch (no longer needs to sync settings since they're hardcoded)
  const enhancedRefetch = useCallback(async () => {
    logger.log('🔄 Enhanced refetch triggered');
    invalidateRequests(); // Clear request cache
    tasksActions.refreshTimestamp();
    await refetch();
  }, [refetch, invalidateRequests, tasksActions]);

  // No auto-refetch needed since settings are now fixed
  const { user } = useAuth();

  // Debug info with authentication details
  const debugInfo = useMemo(() => {
    const info = {
      userAuthenticated: !!user,
      hasPermissions: true,
      rlsEnabled: true,
      viewMode,
      selectedTeamIds,
      rawTasksCount: rawTasks.length,
      filteredTasksCount: filteredTasks.length,
      tasksCount: tasks.length,
      loading: loading || progressiveLoading,
      error,
      pendingCount: pending.size,
      progressiveLoading,
      loadingProgress,
      optimisticTasksCount: tasksState.optimisticTasks.size,
      showArchived: false,
      showCompleted: false,
      filteringActive: selectedTeamIds.length > 0,
      teamFilterDetails: {
        personalSelected: selectedTeamIds.includes('personal'),
        teamIdsSelected: selectedTeamIds.filter(id => id !== 'personal'),
        personalTasksInFiltered: filteredTasks.filter(t => t.task_type === 'personal').length,
        teamTasksInFiltered: filteredTasks.filter(t => t.task_type === 'team').length
      },
      authenticationDetails: {
        userLoading: !user,
        hasAuthError: error?.includes('log in') || false,
        hasCompanyError: error?.includes('Company context') || false,
        retryAttempt
      }
    };
    
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      logger.log('🔍 Tasks Debug Info:', info);
    }
    
    return info;
  }, [viewMode, selectedTeamIds, rawTasks, filteredTasks, tasks, loading, error, pending.size, progressiveLoading, loadingProgress, tasksState.optimisticTasks.size, user, retryAttempt]);

  logger.log('✅ useStreamlinedTasksPageLogic: Initialization complete');

  return {
    // Data
    teams,
    taskCounts,
    selectedTeamIds,
    filterPreferences,
    settings,
    viewMode,
    tasks,
    convertedTasks,
    loading: loading || progressiveLoading,
    error,
    pendingArchives: tasksState.pendingArchives,
    pending,
    debugInfo,
    progressiveLoading,
    loadingProgress,
    
    // Handlers
    updateSelection,
    updatePreferences,
    updateSettings,
    handleViewModeChange,
    handleAddTask,
    handleAddTaskFromItem,
    handleUpdateTaskStatus,
    handleUpdateTask,
    handleDeleteTask,
    undoArchive,
    refetch: enhancedRefetch,
    loadAll,
    retry // Add retry mechanism
  };
};
