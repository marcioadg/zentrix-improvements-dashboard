
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedUserTeams } from '@/hooks/useOptimizedUserTeams';
import { useAuth } from '@/contexts/AuthContext';
import { useStaticTasks } from './useStaticTasks';
import { logger } from '@/utils/logger';

interface TeamTask {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  team_id: string;
  team_name?: string;
  task_type: 'team';
  created_at: string;
  due_date?: string;
  assigned_to?: string;
  completed: boolean;
  archived: boolean;
}

interface UnifiedTask {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  task_type: 'personal' | 'team';
  team_id?: string;
  team_name?: string;
  created_at: string;
  due_date?: string;
  is_archived: boolean;
}

export const useTeamAwareTasks = () => {
  const { user } = useAuth();
  const { teams = [], loading: teamsLoading } = useOptimizedUserTeams();
  const { tasks: personalTasks, addTask: addPersonalTask, updateTaskStatus: updatePersonalStatus, updateTask: updatePersonalTask, deleteTask: deletePersonalTask, clearCompleted: clearPersonalCompleted } = useStaticTasks();
  
  const [teamTasks, setTeamTasks] = useState<TeamTask[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'personal' | 'team'>('all');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch team tasks
  const fetchTeamTasks = useCallback(async () => {
    if (!user || teams.length === 0) {
      setTeamTasks([]);
      return;
    }

    setLoading(true);
    try {
      const teamIds = teams.map(team => team.id);
      
      const { data, error } = await supabase
        .from('team_tasks')
        .select(`
          id,
          title,
          description,
          team_id,
          due_date,
          assigned_to,
          completed,
          archived,
          created_at,
          teams:team_id (
            name
          )
        `)
        .in('team_id', teamIds)
        .eq('archived', false);

      if (error) throw error;

      const processedTasks: TeamTask[] = (data || []).map(task => ({
        id: task.id,
        title: task.title,
        description: task.description || '',
        status: task.completed ? 'done' : 'todo',
        team_id: task.team_id,
        team_name: (task.teams as any)?.name || 'Unknown Team',
        task_type: 'team' as const,
        created_at: task.created_at,
        due_date: task.due_date || undefined,
        assigned_to: task.assigned_to || undefined,
        completed: task.completed,
        archived: task.archived
      }));

      setTeamTasks(processedTasks);
    } catch (err) {
      logger.error('Error fetching team tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch team tasks');
    } finally {
      setLoading(false);
    }
  }, [user, teams]);

  useEffect(() => {
    if (!teamsLoading) {
      fetchTeamTasks();
    }
  }, [fetchTeamTasks, teamsLoading]);

  // Convert personal tasks to unified format
  const unifiedPersonalTasks: UnifiedTask[] = personalTasks.map(task => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    task_type: 'personal' as const,
    created_at: task.created_at,
    due_date: task.due_date,
    is_archived: task.is_archived
  }));

  // Convert team tasks to unified format
  const unifiedTeamTasks: UnifiedTask[] = teamTasks.map(task => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    task_type: 'team' as const,
    team_id: task.team_id,
    team_name: task.team_name,
    created_at: task.created_at,
    due_date: task.due_date,
    is_archived: false
  }));

  // Combine all tasks
  const allTasks = [...unifiedPersonalTasks, ...unifiedTeamTasks];

  // Filter tasks
  const filteredTasks = allTasks.filter(task => {
    // Status filter
    if (filter === 'active' && task.status === 'done') return false;
    if (filter === 'completed' && task.status !== 'done') return false;
    if (filter === 'personal' && task.task_type !== 'personal') return false;
    if (filter === 'team' && task.task_type !== 'team') return false;

    // Team filter
    if (selectedTeamFilter !== 'all') {
      if (selectedTeamFilter === 'personal' && task.task_type !== 'personal') return false;
      if (selectedTeamFilter !== 'personal' && task.team_id !== selectedTeamFilter) return false;
    }

    return true;
  });

  // Add task function
  const addTask = useCallback(async (title: string, description: string, teamId?: string, dueDate?: string) => {
    if (!teamId || teamId === 'personal') {
      // Add personal task
      await addPersonalTask(title, description, dueDate);
    } else {
      // Add team task
      try {
        const { error } = await supabase
          .from('team_tasks')
          .insert({
            title: title.trim(),
            description: description.trim(),
            team_id: teamId,
            due_date: dueDate || null,
            assigned_to: user?.id || null
          });

        if (error) throw error;
        
        // Refresh team tasks
        await fetchTeamTasks();
        logger.log('Team task added:', title);
      } catch (err) {
        logger.error('Error adding team task:', err);
        throw err;
      }
    }
  }, [addPersonalTask, user, fetchTeamTasks]);

  // Update task status
  const updateTaskStatus = useCallback(async (taskId: string, status: 'todo' | 'in-progress' | 'done') => {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.task_type === 'personal') {
      await updatePersonalStatus(taskId, status);
    } else {
      // Update team task
      try {
        const { error } = await supabase
          .from('team_tasks')
          .update({ completed: status === 'done' })
          .eq('id', taskId);

        if (error) throw error;
        
        await fetchTeamTasks();
        logger.log('Team task status updated:', taskId, status);
      } catch (err) {
        logger.error('Error updating team task status:', err);
        throw err;
      }
    }
  }, [allTasks, updatePersonalStatus, fetchTeamTasks]);

  // Update task
  const updateTask = useCallback(async (taskId: string, updates: Partial<Pick<UnifiedTask, 'title' | 'description' | 'due_date'>>) => {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.task_type === 'personal') {
      await updatePersonalTask(taskId, updates);
    } else {
      // Update team task
      try {
        const { error } = await supabase
          .from('team_tasks')
          .update({
            title: updates.title,
            description: updates.description,
            due_date: updates.due_date || null
          })
          .eq('id', taskId);

        if (error) throw error;
        
        await fetchTeamTasks();
        logger.log('Team task updated:', taskId, updates);
      } catch (err) {
        logger.error('Error updating team task:', err);
        throw err;
      }
    }
  }, [allTasks, updatePersonalTask, fetchTeamTasks]);

  // Delete task
  const deleteTask = useCallback(async (taskId: string) => {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.task_type === 'personal') {
      await deletePersonalTask(taskId);
    } else {
      // Delete team task
      try {
        const { error } = await supabase
          .from('team_tasks')
          .delete()
          .eq('id', taskId);

        if (error) throw error;
        
        await fetchTeamTasks();
        logger.log('Team task deleted:', taskId);
      } catch (err) {
        logger.error('Error deleting team task:', err);
        throw err;
      }
    }
  }, [allTasks, deletePersonalTask, fetchTeamTasks]);

  // Clear completed tasks
  const clearCompleted = useCallback(async () => {
    // Clear personal completed tasks
    await clearPersonalCompleted();

    // Clear team completed tasks
    try {
      const completedTeamTaskIds = teamTasks
        .filter(task => task.completed)
        .map(task => task.id);

      if (completedTeamTaskIds.length > 0) {
        const { error } = await supabase
          .from('team_tasks')
          .delete()
          .in('id', completedTeamTaskIds);

        if (error) throw error;
        
        await fetchTeamTasks();
        logger.log('Completed team tasks cleared');
      }
    } catch (err) {
      logger.error('Error clearing completed team tasks:', err);
      throw err;
    }
  }, [clearPersonalCompleted, teamTasks, fetchTeamTasks]);

  // Task counts
  const taskCounts = {
    total: allTasks.length,
    active: allTasks.filter(t => t.status !== 'done').length,
    completed: allTasks.filter(t => t.status === 'done').length,
    personal: unifiedPersonalTasks.length,
    team: unifiedTeamTasks.length
  };

  // Available teams for task creation
  const availableTeams = [
    { id: 'personal', name: 'Personal' },
    ...teams.map(team => ({ id: team.id, name: team.name }))
  ];

  return {
    tasks: filteredTasks,
    allTasks,
    filter,
    setFilter,
    selectedTeamFilter,
    setSelectedTeamFilter,
    taskCounts,
    loading: loading || teamsLoading,
    error,
    teams: availableTeams,
    addTask,
    updateTaskStatus,
    updateTask,
    deleteTask,
    clearCompleted,
    refetch: fetchTeamTasks
  };
};
