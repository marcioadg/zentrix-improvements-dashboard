
import { useState, useEffect, useCallback, useMemo } from 'react';
import { UnifiedTeamTask } from '@/types/tasks';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useFastTasks } from '@/hooks/useFastTasks';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export const useUnifiedTeamTasks = (
  selectedTeamIds: string[], 
  activeMeetingId?: string | null,
  onUndoSuccess?: (taskId: string, task: any) => void
) => {
  const [loading, setLoading] = useState(true);
  // Local override state for remote broadcasts (to avoid triggering DB updates)
  const [remoteUpdates, setRemoteUpdates] = useState<Record<string, { 
    completed?: boolean; 
    archived?: boolean;
    title?: string;
    description?: string;
    due_date?: string;
    assigned_to?: string[];
  }>>({});
  // State for remote task creations (tasks created by other meeting participants)
  const [remoteCreations, setRemoteCreations] = useState<UnifiedTeamTask[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  // OPTIMIZATION: During meetings, pass the specific team ID for optimized queries
  const meetingTeamId = activeMeetingId && selectedTeamIds.length === 1 && selectedTeamIds[0] !== 'personal' 
    ? selectedTeamIds[0] 
    : undefined;

  // Use fast tasks system with archiving support - pass meeting ID to prevent filtering completed tasks
  const {
    tasks: allFastTasks,
    loading: fastTasksLoading,
    error: fastTasksError,
    addTask,
    updateTask: updateFastTask,
    archiveTask, // Use archive instead of delete
    archivingTasks,
    pendingArchives,
    undoArchive,
    // Ensure we can control the underlying filter to include team tasks in meeting context
    setFilter,
  } = useFastTasks(activeMeetingId, meetingTeamId, false, onUndoSuccess);
  
  logger.debug('🚀 useUnifiedTeamTasks: Meeting optimization', {
    activeMeetingId,
    selectedTeamIds,
    meetingTeamId,
    optimizationActive: !!meetingTeamId
  });

  // Filter tasks to only show team tasks for selected teams
  const tasks = useMemo(() => {
    if (!selectedTeamIds.length) return [];
    
    const validTeamIds = selectedTeamIds.filter(id => id !== 'personal');
    if (!validTeamIds.length) return [];

    const filteredTasks = allFastTasks
      .filter(task => {
        // Check if task was archived via remote broadcast
        const remoteUpdate = remoteUpdates[task.id];
        if (remoteUpdate?.archived) return false; // Filter out remotely archived tasks
        
        return task.taskType === 'team' && 
          task.teamId && 
          validTeamIds.includes(task.teamId);
      });

    // Debug logging removed to prevent infinite loops

    const mappedTasks = filteredTasks.map(task => {
        // Apply any remote updates that came via broadcast
        const remoteUpdate = remoteUpdates[task.id];
        const completed = remoteUpdate?.completed !== undefined ? remoteUpdate.completed : task.status === 'done';
        
        // Apply property updates from remote broadcasts
        const title = remoteUpdate?.title !== undefined ? remoteUpdate.title : task.title;
        const description = remoteUpdate?.description !== undefined ? remoteUpdate.description : (task.description || '');
        const due_date = remoteUpdate?.due_date !== undefined ? remoteUpdate.due_date : (task.dueDate || '');
        const assigned_to = remoteUpdate?.assigned_to !== undefined ? remoteUpdate.assigned_to : (task.assignedTo && task.assignedTo.length > 0 ? task.assignedTo : []);
        
        return {
          id: task.id,
          title,
          description,
          team_id: task.teamId || '',
          assigned_to,
          due_date,
          completed,
          archived: task.isArchived || false, // Properly map archived status
          created_at: task.createdAt,
          updated_at: task.updatedAt,
        } as UnifiedTeamTask;
      });
    
    // Merge with remote creations (tasks created by other meeting participants)
    // Filter remote creations to only include tasks for valid team IDs and not already in main list
    const filteredRemoteCreations = remoteCreations.filter(task => 
      task.team_id && 
      validTeamIds.includes(task.team_id) && 
      !mappedTasks.some(t => t.id === task.id)
    );
    
    return [...mappedTasks, ...filteredRemoteCreations];
  }, [allFastTasks, selectedTeamIds, remoteUpdates, remoteCreations]);

  // Force the underlying fast-task filter to include team tasks during meetings
  useEffect(() => {
    // Always prefer team view in meetings so team tasks are not hidden by 'active' (personal-only) filter
    setFilter?.('team');
  }, [setFilter, activeMeetingId]);

  // Update loading state
  useEffect(() => {
    setLoading(fastTasksLoading);
  }, [fastTasksLoading]);

  // CLEANUP: Remove tasks from remoteCreations when they appear in allFastTasks
  useEffect(() => {
    if (remoteCreations.length === 0) return;
    
    const dbTaskIds = new Set(allFastTasks.map(t => t.id));
    const tasksToRemove = remoteCreations.filter(rc => dbTaskIds.has(rc.id));
    
    if (tasksToRemove.length > 0) {
      logger.log('🧹 useUnifiedTeamTasks: Cleaning up remote creations that now exist in DB', {
        removing: tasksToRemove.map(t => t.id)
      });
      setRemoteCreations(prev => prev.filter(rc => !dbTaskIds.has(rc.id)));
    }
  }, [allFastTasks, remoteCreations]);

  const createTask = useCallback(async (taskData: Partial<UnifiedTeamTask>) => {
    
    if (!taskData.team_id) {
      throw new Error('Team ID is required for team tasks');
    }

    // FIXED: Resolve team name from team ID using the teams data
    let teamName = undefined;
    if (allFastTasks.length > 0) {
      // Find an existing task with the same team_id to get the team name
      const existingTaskWithTeam = allFastTasks.find(task => task.teamId === taskData.team_id);
      if (existingTaskWithTeam?.teamName) {
        teamName = existingTaskWithTeam.teamName;
        
      }
    }

    return await addTask(
      taskData.title || '',
      taskData.description || '',
      taskData.due_date,
      'team',
      taskData.team_id,
      teamName, // Now properly resolved
      taskData.assigned_to && taskData.assigned_to.length > 0 ? taskData.assigned_to : undefined // Pass full array
    );
  }, [addTask]); // Removed allFastTasks to prevent infinite loop

  // Helper to check if task exists only in remoteCreations
  const isRemoteCreation = useCallback((taskId: string): boolean => {
    const inRemote = remoteCreations.some(t => t.id === taskId);
    const inFastTasks = allFastTasks.some(t => t.id === taskId);
    return inRemote && !inFastTasks;
  }, [remoteCreations, allFastTasks]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<UnifiedTeamTask>): Promise<void> => {
    // Check if this is a remote creation (exists in remoteCreations but not in useFastTasks)
    if (isRemoteCreation(taskId)) {
      logger.log('📡 useUnifiedTeamTasks: Updating remote creation directly', { taskId, updates });
      
      // Update remoteCreations state optimistically
      setRemoteCreations(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      ));
      
      // Make direct database call (task exists in DB, just not in our local useFastTasks state)
      const dbUpdates: Record<string, any> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.due_date !== undefined) dbUpdates.due_date = updates.due_date;
      if (updates.completed !== undefined) dbUpdates.status = updates.completed ? 'done' : 'todo';
      if (updates.assigned_to !== undefined) dbUpdates.assigned_to = updates.assigned_to;
      
      const { error } = await supabase
        .from('fast_tasks')
        .update(dbUpdates)
        .eq('id', taskId);
      
      if (error) {
        logger.error('❌ useUnifiedTeamTasks: Failed to update remote creation', error);
        // Rollback optimistic update
        setRemoteCreations(prev => prev.map(task => 
          task.id === taskId ? { ...task, completed: !updates.completed } : task
        ));
        throw error;
      }
      
      return;
    }
    
    // Normal path: task exists in useFastTasks
    // Convert UnifiedTeamTask updates to FastTask updates
    const fastTaskUpdates: any = {};
    
    if (updates.title !== undefined) fastTaskUpdates.title = updates.title;
    if (updates.description !== undefined) fastTaskUpdates.description = updates.description;
    if (updates.due_date !== undefined) fastTaskUpdates.dueDate = updates.due_date;
    if (updates.completed !== undefined) fastTaskUpdates.status = updates.completed ? 'done' : 'todo';
    if (updates.assigned_to !== undefined) fastTaskUpdates.assignedTo = updates.assigned_to;

    return await updateFastTask(taskId, fastTaskUpdates);
  }, [updateFastTask, isRemoteCreation]);

  // NEW: Apply remote update from broadcast without triggering database write
  const applyRemoteStatusUpdate = useCallback((taskId: string, completed: boolean) => {
    logger.log('📡 useUnifiedTeamTasks: Applying remote status update', { taskId, completed });
    
    // Check if task is in remoteCreations - update that state directly
    const inRemoteCreations = remoteCreations.some(t => t.id === taskId);
    if (inRemoteCreations) {
      logger.log('📡 useUnifiedTeamTasks: Task is remote creation, updating directly', { taskId });
      setRemoteCreations(prev => prev.map(task => 
        task.id === taskId ? { ...task, completed } : task
      ));
      return;
    }
    
    // Normal path: update remoteUpdates for tasks in useFastTasks
    setRemoteUpdates(prev => ({
      ...prev,
      [taskId]: { ...prev[taskId], completed }
    }));
  }, [remoteCreations]);

  // NEW: Apply remote archive from broadcast without triggering database write
  const applyRemoteArchive = useCallback((taskId: string) => {
    logger.log('📡 useUnifiedTeamTasks: Applying remote archive', { taskId });
    
    // Check if task is in remoteCreations - remove from that state directly
    const inRemoteCreations = remoteCreations.some(t => t.id === taskId);
    if (inRemoteCreations) {
      logger.log('📡 useUnifiedTeamTasks: Task is remote creation, removing directly', { taskId });
      setRemoteCreations(prev => prev.filter(task => task.id !== taskId));
      return;
    }
    
    // Normal path: mark as archived in remote updates
    setRemoteUpdates(prev => ({
      ...prev,
      [taskId]: { ...prev[taskId], archived: true }
    }));
  }, [remoteCreations]);

  // NEW: Apply remote restore from broadcast without triggering database write
  const applyRemoteRestore = useCallback((taskId: string) => {
    logger.log('📡 useUnifiedTeamTasks: Applying remote restore', { taskId });
    // Remove the archived flag so task reappears in the list
    setRemoteUpdates(prev => {
      const updated = { ...prev };
      if (updated[taskId]) {
        delete updated[taskId].archived;
        // Clean up empty objects
        if (Object.keys(updated[taskId]).length === 0) {
          delete updated[taskId];
        }
      }
      return updated;
    });
  }, []);

  // NEW: Clear stale remote status update before local user performs their own update
  // This prevents remote broadcast state from overriding local optimistic updates
  const clearRemoteStatusUpdate = useCallback((taskId: string) => {
    logger.log('🔄 useUnifiedTeamTasks: Clearing remote status update for local change', { taskId });
    setRemoteUpdates(prev => {
      const updated = { ...prev };
      if (updated[taskId]) {
        delete updated[taskId].completed;
        // Clean up empty objects
        if (Object.keys(updated[taskId]).length === 0) {
          delete updated[taskId];
        }
      }
      return updated;
    });
  }, []);

  // NEW: Apply remote task creation from broadcast without triggering database write
  const applyRemoteTaskCreate = useCallback((task: UnifiedTeamTask) => {
    logger.log('📡 useUnifiedTeamTasks: Applying remote task creation', { taskId: task.id, title: task.title });
    setRemoteCreations(prev => {
      // Prevent duplicates
      if (prev.some(t => t.id === task.id)) {
        return prev;
      }
      return [...prev, task];
    });
  }, []);

  // NEW: Apply remote task property update from broadcast without triggering database write
  const applyRemoteTaskUpdate = useCallback((taskId: string, updates: Record<string, any>) => {
    logger.log('📡 useUnifiedTeamTasks: Applying remote task update', { taskId, updates });
    
    // Check if task is in remoteCreations - update that state directly
    const inRemoteCreations = remoteCreations.some(t => t.id === taskId);
    if (inRemoteCreations) {
      logger.log('📡 useUnifiedTeamTasks: Task is remote creation, updating directly', { taskId });
      setRemoteCreations(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      ));
      return;
    }
    
    // For tasks in useFastTasks, we need to trigger a refetch or update remote state
    // Since property updates require the full task object, we'll store the updates
    // and merge them in the useMemo that builds the tasks array
    setRemoteUpdates(prev => ({
      ...prev,
      [taskId]: { ...prev[taskId], ...updates }
    }));
  }, [remoteCreations]);

  // Use optimistic archiving instead of permanent deletion
  const deleteTask = useCallback(async (taskId: string): Promise<void> => {
    // Check if this is a remote creation (exists in remoteCreations but not in useFastTasks)
    if (isRemoteCreation(taskId)) {
      logger.log('📡 useUnifiedTeamTasks: Archiving remote creation directly', { taskId });
      
      // Remove from remoteCreations state optimistically
      setRemoteCreations(prev => prev.filter(task => task.id !== taskId));
      
      // Make direct database archive call
      const { error } = await supabase
        .from('fast_tasks')
        .update({ 
          is_archived: true, 
          archived_at: new Date().toISOString() 
        })
        .eq('id', taskId);
      
      if (error) {
        logger.error('❌ useUnifiedTeamTasks: Failed to archive remote creation', error);
        // Note: We can't easily rollback here since we don't have the original task data
        // The task will reappear on next refresh if archive failed
        throw error;
      }
      
      return;
    }
    
    // Normal path: use optimistic archiving from useFastTasks
    await archiveTask(taskId);
  }, [archiveTask, isRemoteCreation]);

  const refetch = useCallback(() => {
    // Refetch handled automatically by fast tasks
    // Clear remote updates on refetch to get fresh data
    setRemoteUpdates({});
  }, []);

  return {
    tasks,
    loading,
    error: fastTasksError || null,
    createTask,
    updateTask,
    updateTaskStatus: updateTask, // Alias for compatibility
    deleteTask,
    pendingArchives, // Return the actual pending archives from fast tasks
    undoArchive,
    refetch,
    applyRemoteStatusUpdate, // NEW: For broadcast sync
    applyRemoteArchive, // NEW: For archive broadcast sync
    applyRemoteRestore, // NEW: For restore broadcast sync
    applyRemoteTaskCreate, // NEW: For task creation broadcast sync
    applyRemoteTaskUpdate, // NEW: For task property update broadcast sync
    clearRemoteStatusUpdate, // NEW: Clear stale remote state before local updates
  };
};
