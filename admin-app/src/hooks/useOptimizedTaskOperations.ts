
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface TaskOperations {
  addTask: (title: string, description: string, teamSelection: { type: 'personal' | 'team'; teamId?: string }, dueDate?: string) => Promise<void>;
  updateTaskStatus: (taskId: string, status: 'todo' | 'inprogress' | 'done') => Promise<boolean>;
  updateTask: (taskId: string, updates: any) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  pending: Set<string>;
}

export const useOptimizedTaskOperations = (onDataChange?: () => void): TaskOperations => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pending, setPending] = useState<Set<string>>(new Set());

  const addPending = useCallback((id: string) => {
    setPending(prev => new Set(prev).add(id));
  }, []);

  const removePending = useCallback((id: string) => {
    setPending(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  const addTask = useCallback(async (
    title: string, 
    description: string, 
    teamSelection: { type: 'personal' | 'team'; teamId?: string },
    dueDate?: string
  ) => {
    if (!user) throw new Error('User not authenticated');

    const tempId = `temp-${Date.now()}`;
    addPending(tempId);

    try {
      const taskData = {
        title,
        description,
        task_type: teamSelection.type,
        user_id: user.id,
        team_id: teamSelection.teamId,
        status: 'todo',
        source: 'manual',
        is_archived: false,
        due_date: dueDate,
        assigned_to: teamSelection.type === 'personal' ? [user.id] : undefined
      };

      const { error } = await supabase
        .from('kanban_tasks')
        .insert(taskData);

      if (error) throw error;

      toast({
        title: "Task Created",
        description: "Task created successfully",
      });

      onDataChange?.();
    } catch (error) {
      logger.error('Error adding task:', error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
      throw error;
    } finally {
      removePending(tempId);
    }
  }, [user, toast, addPending, removePending, onDataChange]);

  const updateTaskStatus = useCallback(async (taskId: string, status: 'todo' | 'inprogress' | 'done'): Promise<boolean> => {
    addPending(taskId);

    try {
      const { error } = await supabase
        .from('kanban_tasks')
        .update({ status })
        .eq('id', taskId);

      if (error) throw error;

      onDataChange?.();
      return status === 'done';
    } catch (error) {
      logger.error('Error updating task status:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
      return false;
    } finally {
      removePending(taskId);
    }
  }, [toast, addPending, removePending, onDataChange]);

  const updateTask = useCallback(async (taskId: string, updates: any) => {
    addPending(taskId);

    try {
      const { error } = await supabase
        .from('kanban_tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      onDataChange?.();
    } catch (error) {
      logger.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
      throw error;
    } finally {
      removePending(taskId);
    }
  }, [toast, addPending, removePending, onDataChange]);

  const deleteTask = useCallback(async (taskId: string) => {
    addPending(taskId);

    try {
      const { error } = await supabase
        .from('kanban_tasks')
        .update({ 
          is_archived: true, 
          archived_at: new Date().toISOString() 
        })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Task Archived",
        description: "Task has been archived",
      });

      onDataChange?.();
    } catch (error) {
      logger.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to archive task",
        variant: "destructive",
      });
      throw error;
    } finally {
      removePending(taskId);
    }
  }, [toast, addPending, removePending, onDataChange]);

  return {
    addTask,
    updateTaskStatus,
    updateTask,
    deleteTask,
    pending,
  };
};
