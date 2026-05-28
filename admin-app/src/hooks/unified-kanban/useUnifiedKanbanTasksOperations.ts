
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedKanbanTask } from '@/types/tasks';
import { TaskStatus } from '@/types/kanban';
import { trackTaskCreated, trackTaskStatusChanged, trackTaskCompleted, trackTaskDeleted } from '@/lib/analytics';
import { logger } from '@/utils/logger';

export const useUnifiedKanbanTasksOperations = (
  tasks: UnifiedKanbanTask[],
  setTasks: React.Dispatch<React.SetStateAction<UnifiedKanbanTask[]>>,
  selectedTeamIds: string[]
) => {
  const addTask = useCallback(async (
    title: string,
    description: string,
    teamSelection: { type: 'personal' | 'team'; teamId?: string },
    status: 'todo' | 'in-progress' | 'done' = 'todo',
    assignedTo: string[] = []
  ): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // For personal tasks, assign to current user
      // For team tasks, assign to specified users or current user if none specified
      const assignedUsers = teamSelection.type === 'personal' 
        ? [user?.id].filter(Boolean) as string[]
        : assignedTo.length > 0 
          ? assignedTo 
          : [user?.id].filter(Boolean) as string[];
      
      const newTask = {
        title,
        description,
        status,
        source: 'manual',
        is_archived: false,
        task_type: teamSelection.type,
        assigned_to: assignedUsers, // Use array directly
        ...(teamSelection.type === 'team' && teamSelection.teamId ? { team_id: teamSelection.teamId } : {}),
        user_id: user?.id,
      };

      logger.log('🔧 Creating unified task with assignments:', { 
        assigned_to: newTask.assigned_to,
        assignedUsers 
      });

      const { data, error } = await supabase
        .from('fast_tasks')
        .insert([newTask])
        .select()

      if (error) {
        logger.error("Error adding task:", error);
        throw error;
      }

      // Track task creation
      trackTaskCreated(teamSelection.type, 'manual');

      // Add new task at the beginning of the list (newest first)
      setTasks(prevTasks => [data[0], ...prevTasks]);
    } catch (error) {
      logger.error("Failed to add task:", error);
    }
  }, [setTasks]); // Removed selectedTeamIds to prevent infinite loop

  const updateTaskStatus = useCallback(async (taskId: string, status: TaskStatus): Promise<boolean> => {
    // Store current state for rollback
    const currentTasks = tasks;
    const oldTask = tasks.find(t => t.id === taskId);
    
    // Update local state immediately (optimistic)
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, status } : task
      )
    );

    try {
      const { error } = await supabase
        .from('fast_tasks')
        .update({ status })
        .eq('id', taskId);

      if (error) {
        logger.error("Error updating task status:", error);
        
        // Rollback on error
        setTasks(currentTasks);
        
        return false;
      }

      // Track status change
      if (oldTask) {
        trackTaskStatusChanged(oldTask.task_type as 'personal' | 'team', oldTask.status, status);
        
        // Track completion specifically
        if (status === 'done') {
          trackTaskCompleted(oldTask.task_type as 'personal' | 'team');
        }
      }

      return true;
    } catch (error) {
      logger.error("Failed to update task status:", error);
      
      // Rollback on error
      setTasks(currentTasks);
      
      return false;
    }
  }, [tasks, setTasks]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<UnifiedKanbanTask>): Promise<void> => {
    try {
      const { error } = await supabase
        .from('fast_tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) {
        logger.error("Error updating task:", error);
        throw error;
      }

      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, ...updates } : task
        )
      );
    } catch (error) {
      logger.error("Failed to update task:", error);
    }
  }, [setTasks]);

  const deleteTask = useCallback(async (taskId: string): Promise<void> => {
    try {
      const task = tasks.find(t => t.id === taskId);
      
      const { error } = await supabase
        .from('fast_tasks')
        .update({ 
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) {
        logger.error("Error deleting task:", error);
        throw error;
      }

      // Track task deletion
      if (task) {
        trackTaskDeleted(task.task_type as 'personal' | 'team');
      }

      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    } catch (error) {
      logger.error("Failed to delete task:", error);
    }
  }, [setTasks]);

  return {
    addTask,
    updateTaskStatus,  
    updateTask,
    deleteTask
  };
};
