import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCompanyScoped } from '@/hooks/useCompanyScoped';
import { logger } from '@/utils/logger';

interface DelegateElevateTask {
  id: string;
  session_id: string;
  user_id?: string;
  team_id?: string;
  company_id?: string;
  title: string;
  description?: string;
  time_per_week?: number;
  quadrant: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export const useDelegateElevateTasks = (sessionId?: string) => {
  const [tasks, setTasks] = useState<DelegateElevateTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentCompany, loading: companyLoading } = useCompanyScoped();

  const fetchTasks = useCallback(async () => {
    if (!sessionId || !user || companyLoading || !currentCompany) {
      logger.log('⏭️ useDelegateElevateTasks: Skipping fetch - conditions not met', {
        hasSessionId: !!sessionId,
        hasUser: !!user,
        companyLoading,
        hasCurrentCompany: !!currentCompany
      });
      return;
    }

    setLoading(true);
    logger.log('🔍 useDelegateElevateTasks: Fetching tasks for session:', sessionId);
    
    try {
      const { data, error } = await supabase
        .from('delegate_elevate_tasks')
        .select('*')
        .eq('session_id', sessionId)
        .eq('company_id', currentCompany?.id)
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('❌ useDelegateElevateTasks: Database error:', error);
        toast({
          title: "Error",
          description: "Failed to fetch tasks",
          variant: "destructive",
        });
        setTasks([]);
        return;
      }

      logger.log('✅ useDelegateElevateTasks: Tasks fetched successfully:', data?.length || 0);
      setTasks(data || []);
    } catch (error) {
      logger.error('❌ useDelegateElevateTasks: Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tasks",
        variant: "destructive",
      });
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId, user, currentCompany, companyLoading]);

  const addTask = useCallback(async (task: { title: string; description?: string; quadrant: string; time_per_week?: number }) => {
    if (!sessionId || !user || !currentCompany) return null;

    try {
      const { data, error } = await supabase
        .from('delegate_elevate_tasks')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          company_id: currentCompany?.id,
          ...task,
        })
        .select()
        .single();

      if (error) throw error;

      setTasks(prev => [...prev, data]);
      
      toast({
        title: "Success",
        description: "Task added",
      });

      return data;
    } catch (error) {
      logger.error('Error adding task:', error);
      toast({
        title: "Error",
        description: "Failed to add task",
        variant: "destructive",
      });
      return null;
    }
  }, [sessionId, user, currentCompany]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<DelegateElevateTask>) => {
    if (!user || !currentCompany) return false;

    try {
      const { error } = await supabase
        .from('delegate_elevate_tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      ));
      
      toast({
        title: "Success",
        description: "Task updated",
      });

      return true;
    } catch (error) {
      logger.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
      return false;
    }
  }, [user, currentCompany]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!user || !currentCompany) return false;

    try {
      const { error } = await supabase
        .from('delegate_elevate_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.filter(task => task.id !== taskId));
      
      toast({
        title: "Success",
        description: "Task deleted",
      });

      return true;
    } catch (error) {
      logger.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
      return false;
    }
  }, [user, currentCompany]);

  useEffect(() => {
    if (!companyLoading) {
      fetchTasks();
    }
  }, [fetchTasks, companyLoading]);

  return {
    tasks,
    loading: loading || companyLoading,
    addTask,
    updateTask,
    deleteTask,
    refetchTasks: fetchTasks,
  };
};