import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedKanbanTask } from '@/types/tasks';
import { TaskStatus } from '@/types/kanban';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PendingArchiveTask } from '@/components/dashboard/AutoArchiveTimer';

export const useUnifiedPersonalTasks = () => {
  const [tasks, setTasks] = useState<UnifiedKanbanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingArchives, setPendingArchives] = useState<PendingArchiveTask[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('kanban_tasks')
        .select('*')
        .eq('task_type', 'personal')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedTasks: UnifiedKanbanTask[] = (data || []).map(task => ({
        ...task,
        status: task.status as TaskStatus,
        source: task.source as 'manual' | 'feedback-widget',
        task_type: task.task_type as 'product' | 'personal' | 'team',
      }));

      setTasks(typedTasks);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch personal tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const addTask = async (title: string, description?: string, priority?: string, due_date?: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('kanban_tasks')
        .insert({
          title,
          description,
          task_type: 'personal',
          user_id: user.id,
          due_date,
          status: 'todo',
          source: 'manual'
        })
        .select()
        .single();

      if (error) throw error;

      const newTask: UnifiedKanbanTask = {
        ...data,
        status: data.status as TaskStatus,
        source: data.source as 'manual' | 'feedback-widget',
        task_type: data.task_type as 'product' | 'personal' | 'team',
      };

      setTasks(prev => [newTask, ...prev]);
      toast({
        title: "Task added",
        description: title,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add task",
        variant: "destructive",
      });
    }
  };

  const updateTask = async (taskId: string, updates: Partial<UnifiedKanbanTask>) => {
    try {
      const { error } = await supabase
        .from('kanban_tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      ));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const toggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
    await updateTask(taskId, { status: newStatus });
  };

  const deleteTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const pendingTask: PendingArchiveTask = {
      taskId,
      title: task.title,
      timeLeft: 5
    };

    setPendingArchives(prev => [...prev, pendingTask]);
    
    const intervalId = setInterval(() => {
      setPendingArchives(prev => {
        const updated = prev.map(p => 
          p.taskId === taskId ? { ...p, timeLeft: p.timeLeft - 1 } : p
        );
        
        const currentTask = updated.find(p => p.taskId === taskId);
        if (currentTask && currentTask.timeLeft <= 0) {
          clearInterval(intervalId);
          archiveTask(taskId);
          return updated.filter(p => p.taskId !== taskId);
        }
        
        return updated;
      });
    }, 1000);
  };

  const archiveTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('kanban_tasks')
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.filter(task => task.id !== taskId));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to archive task",
        variant: "destructive",
      });
    }
  };

  const undoArchive = (taskId: string) => {
    setPendingArchives(prev => prev.filter(p => p.taskId !== taskId));
  };

  useEffect(() => {
    fetchTasks();

    const channel = supabase
      .channel(`personal_tasks_${user?.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kanban_tasks',
          filter: `task_type=eq.personal,user_id=eq.${user?.id}`
        },
        () => fetchTasks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTasks, user?.id]);

  return {
    tasks,
    loading,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    pendingArchives,
    undoArchive,
  };
};
