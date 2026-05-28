import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

// Simplified task interface for the unified approach
export interface SimpleTask {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  task_type: 'personal' | 'team';
  team_id?: string;
  team_name?: string;
  assigned_to: string[]; // Array of UUIDs for multiple assignees
  user_id: string;
  due_date?: string;
  is_archived: boolean;
  archived_at?: string;
  created_at: string;
  updated_at: string;
}

interface UseSimplifiedTasksOptions {
  showArchived?: boolean;
  taskType?: 'personal' | 'team' | 'all';
  teamIds?: string[];
  myTasksOnly?: boolean;
}

export const useSimplifiedTasks = (options: UseSimplifiedTasksOptions = {}) => {
  const [tasks, setTasks] = useState<SimpleTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { showArchived = false, taskType = 'all', teamIds = [], myTasksOnly = false } = options;

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Simple query - RLS handles company scoping automatically
      let query = supabase.from('fast_tasks').select('*').eq('is_deleted', false);

      // Apply archive filter
      if (!showArchived) {
        query = query.eq('is_archived', false);
      }

      // Apply task type filter
      if (taskType !== 'all') {
        query = query.eq('task_type', taskType);
      }

      // Apply team filter for team tasks
      if (teamIds.length > 0) {
        query = query.in('team_id', teamIds);
      }

      // Order by created date (newest first)
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching tasks:', error);
        setError(error.message);
        toast.error('Failed to load tasks');
      } else {
        // Filter tasks by assignment if myTasksOnly is enabled
        let filteredData = data || [];
        if (myTasksOnly) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            filteredData = filteredData.filter(task => 
              Array.isArray(task.assigned_to) && task.assigned_to.includes(user.id)
            );
          }
        }
        setTasks(filteredData);
      }
    } catch (err) {
      logger.error('Unexpected error:', err);
      setError('An unexpected error occurred');
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [showArchived, taskType, teamIds, myTasksOnly]);

  const createTask = useCallback(async (
    title: string,
    options: {
      description?: string;
      task_type?: 'personal' | 'team';
      team_id?: string;
      team_name?: string;
      assigned_to?: string | string[]; // Support both single user and multiple users
      due_date?: string;
      status?: 'todo' | 'in-progress' | 'done';
    } = {}
  ) => {
    const {
      description = '',
      task_type = 'personal',
      team_id,
      team_name,
      assigned_to,
      due_date,
      status = 'todo'
    } = options;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Handle assignment for both single and multiple users
      let assignedUsers: string[] = [];
      if (assigned_to) {
        assignedUsers = Array.isArray(assigned_to) ? assigned_to : [assigned_to];
      } else if (task_type === 'personal') {
        assignedUsers = [user.id];
      }

      const taskData = {
        title: title.trim(),
        description,
        status,
        task_type,
        team_id: task_type === 'team' ? team_id : null,
        team_name: task_type === 'team' ? team_name : null,
        assigned_to: assignedUsers,
        user_id: user.id,
        due_date,
        is_archived: false,
      };

      logger.log('🔧 Creating task with assignments:', { 
        assigned_to: taskData.assigned_to,
        assignedUsers 
      });

      const { data, error } = await supabase
        .from('fast_tasks')
        .insert([taskData])
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      setTasks(prev => [data, ...prev]);
      toast.success('Task created successfully');
      return data;
    } catch (error) {
      logger.error('Error creating task:', error);
      toast.error('Failed to create task');
      throw error;
    }
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<SimpleTask>) => {
    try {
      const { error } = await supabase
        .from('fast_tasks')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === id ? { ...task, ...updates, updated_at: new Date().toISOString() } : task
      ));

      toast.success('Task updated successfully');
    } catch (error) {
      logger.error('Error updating task:', error);
      toast.error('Failed to update task');
      throw error;
    }
  }, []);

  const archiveTask = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('fast_tasks')
        .update({ 
          is_archived: true, 
          archived_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) throw error;

      // Remove from local state if not showing archived
      if (!showArchived) {
        setTasks(prev => prev.filter(task => task.id !== id));
      } else {
        setTasks(prev => prev.map(task => 
          task.id === id 
            ? { ...task, is_archived: true, archived_at: new Date().toISOString() }
            : task
        ));
      }

      toast.success('Task archived successfully');
    } catch (error) {
      logger.error('Error archiving task:', error);
      toast.error('Failed to archive task');
      throw error;
    }
  }, [showArchived]);

  const deleteTask = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('fast_tasks')
        .update({ 
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Remove from local state
      setTasks(prev => prev.filter(task => task.id !== id));
      toast.success('Task deleted successfully');
    } catch (error) {
      logger.error('Error deleting task:', error);
      toast.error('Failed to delete task');
      throw error;
    }
  }, []);

  const toggleTaskStatus = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newStatus = task.status === 'done' ? 'todo' : 'done';
    await updateTask(id, { status: newStatus });
  }, [tasks, updateTask]);

  // Real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel('simplified_tasks_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fast_tasks'
        },
        () => {
          // Simple refresh on any change
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchTasks]);

  // Load tasks on mount and when options change
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    archiveTask,
    deleteTask,
    toggleTaskStatus,
    refetch: fetchTasks,
  };
};