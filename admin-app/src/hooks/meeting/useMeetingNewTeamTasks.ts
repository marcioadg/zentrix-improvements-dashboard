import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedTeamTask } from '@/types/tasks';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export const useMeetingNewTeamTasks = (
  teamId: string,
  meetingStartTime: number | null,
  meetingId: string | null
) => {
  const [tasks, setTasks] = useState<UnifiedTeamTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchMeetingTasks = useCallback(async () => {
    if (!teamId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('fast_tasks')
        .select('*')
        .eq('team_id', teamId)
        .eq('is_deleted', false)
        .eq('is_archived', false)
        .is('completed_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('❌ useMeetingNewTeamTasks: Error fetching tasks:', error);
        setError(error);
      } else {
        setTasks(data || []);
      }
    } catch (err: any) {
      logger.error('❌ useMeetingNewTeamTasks: Unexpected error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [teamId, meetingStartTime, meetingId]);

  useEffect(() => {
    fetchMeetingTasks();
  }, [fetchMeetingTasks]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<UnifiedTeamTask>) => {
    // Store original task for rollback
    const originalTask = tasks.find(task => task.id === taskId);
    if (!originalTask) {
      const errorMsg = 'Task not found';
      logger.error('❌ useMeetingNewTeamTasks:', errorMsg);
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Apply optimistic update IMMEDIATELY
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, ...updates, updated_at: new Date().toISOString() }
        : task
    ));

    try {
      const { error } = await supabase
        .from('fast_tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) {
        logger.error('❌ useMeetingNewTeamTasks: Supabase error updating task:', error);
        
        // Rollback optimistic update
        setTasks(prev => prev.map(task => 
          task.id === taskId ? originalTask : task
        ));
        
        // Show user-friendly error
        let errorMessage = 'Failed to update task';
        if (error.message.includes('row-level security')) {
          errorMessage = 'Permission denied: You cannot modify this task';
        } else if (error.message) {
          errorMessage = `Update failed: ${error.message}`;
        }
        
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      toast.success('Task updated successfully');
    } catch (err) {
      logger.error('❌ useMeetingNewTeamTasks: Unexpected update error:', err);
      
      // Ensure rollback even on unexpected errors
      setTasks(prev => prev.map(task => 
        task.id === taskId ? originalTask : task
      ));
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
      toast.error(errorMessage);
      throw err;
    }
  }, [tasks]);

  return {
    tasks,
    loading,
    error,
    updateTask,
    refetch: fetchMeetingTasks
  };
};