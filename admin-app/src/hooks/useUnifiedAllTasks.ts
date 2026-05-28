
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedKanbanTask } from '@/types/tasks';
import { TaskStatus } from '@/types/kanban';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useAutoArchive } from '@/hooks/useAutoArchive';
import { logger } from '@/utils/logger';

export interface UnifiedAllTask extends UnifiedKanbanTask {
  team_name?: string;
  source_label: string;
}

export const useUnifiedAllTasks = (selectedTeamIds: string[]) => {
  const [tasks, setTasks] = useState<UnifiedAllTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Create the updateTaskStatus function that useAutoArchive expects
  const updateTaskStatus = async (taskId: string, status: 'todo' | 'in-progress' | 'done'): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('kanban_tasks')
        .update({ status })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: status as TaskStatus } : t
      ));

      return true;
    } catch (error) {
      logger.error('Error updating task status:', error);
      return false;
    }
  };

  // Create the updateTask function that useAutoArchive expects
  const updateTaskInDb = async (taskId: string, updates: any): Promise<void> => {
    const { error } = await supabase
      .from('kanban_tasks')
      .update(updates)
      .eq('id', taskId);

    if (error) throw error;

    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, ...updates } : t
    ));
  };

  // Handle task archiving locally
  const handleTaskArchived = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const { pendingArchives, undoArchive } = useAutoArchive(
    updateTaskStatus,
    updateTaskInDb,
    handleTaskArchived
  );

  const fetchAllTasks = async () => {
    if (!user || selectedTeamIds.length === 0) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      logger.log('🔍 useUnifiedAllTasks: Fetching all tasks for teams:', selectedTeamIds);

      let allTasks: UnifiedAllTask[] = [];

      // Fetch personal tasks if included
      if (selectedTeamIds.includes('personal')) {
        const { data: personalData, error: personalError } = await supabase
          .from('kanban_tasks')
          .select('*')
          .eq('task_type', 'personal')
          .eq('user_id', user.id)
          .eq('is_archived', false)
          .order('created_at', { ascending: false });

        if (personalError) throw personalError;

        if (personalData) {
          const personalTasks: UnifiedAllTask[] = personalData.map(task => ({
            ...task,
            status: task.status as TaskStatus,
            source: task.source as 'manual' | 'feedback-widget',
            task_type: task.task_type as 'product' | 'personal' | 'team',
            source_label: 'Personal'
          }));
          allTasks = [...allTasks, ...personalTasks];
        }
      }

      // Fetch team tasks if any teams are selected
      const teamIds = selectedTeamIds.filter(id => id !== 'personal');
      if (teamIds.length > 0) {
        const { data: teamData, error: teamError } = await supabase
          .from('kanban_tasks')
          .select(`
            *,
            teams!inner (
              id,
              name
            )
          `)
          .eq('task_type', 'team')
          .in('team_id', teamIds)
          .eq('is_archived', false)
          .order('created_at', { ascending: false });

        if (teamError) throw teamError;

        if (teamData) {
          const teamTasks: UnifiedAllTask[] = teamData.map((task: any) => ({
            ...task,
            status: task.status as TaskStatus,
            source: task.source as 'manual' | 'feedback-widget',
            task_type: task.task_type as 'product' | 'personal' | 'team',
            team_name: task.teams?.name,
            source_label: task.teams?.name || 'Team'
          }));
          allTasks = [...allTasks, ...teamTasks];
        }
      }

      logger.log('🔍 useUnifiedAllTasks: Total tasks fetched:', allTasks.length);
      setTasks(allTasks);
    } catch (error) {
      logger.error('💥 useUnifiedAllTasks: Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tasks. Please refresh the page.",
        variant: "destructive",
      });
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';

    try {
      const { error } = await supabase
        .from('kanban_tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: newStatus } : t
      ));

      toast({
        title: "Success",
        description: `Task marked as ${newStatus === 'done' ? 'completed' : 'incomplete'}`,
      });
    } catch (error) {
      logger.error('Error toggling task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
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

      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, ...updates } : t
      ));

      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    } catch (error) {
      logger.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('kanban_tasks')
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== taskId));

      toast({
        title: "Success",
        description: "Task archived successfully",
      });
    } catch (error) {
      logger.error('Error archiving task:', error);
      toast({
        title: "Error",
        description: "Failed to archive task",
        variant: "destructive",
      });
    }
  };

  const addTask = async (title: string, description?: string, due_date?: string) => {
    // For "All Tasks" view, we'll default to personal tasks
    // Users can create team-specific tasks through the team selection
    try {
      const taskData = {
        title,
        description: description || '',
        status: 'todo' as TaskStatus,
        task_type: 'personal',
        user_id: user?.id,
        due_date,
        source: 'manual' as const,
        order_position: 0,
      };

      const { data, error } = await supabase
        .from('kanban_tasks')
        .insert(taskData)
        .select()
        .single();

      if (error) throw error;

      const newTask: UnifiedAllTask = {
        ...data,
        status: data.status as TaskStatus,
        source: data.source as 'manual' | 'feedback-widget',
        task_type: data.task_type as 'product' | 'personal' | 'team',
        source_label: 'Personal'
      };

      setTasks(prev => [newTask, ...prev]);

      toast({
        title: "Success",
        description: "Personal task created successfully",
      });
    } catch (error) {
      logger.error('Error adding task:', error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchAllTasks();

    // Set up real-time subscription
    const channel = supabase
      .channel(`all_tasks_${selectedTeamIds.join('_')}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kanban_tasks',
        },
        () => {
          fetchAllTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTeamIds, user?.id]);

  return {
    tasks,
    loading,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    pendingArchives,
    undoArchive,
    refetch: fetchAllTasks,
  };
};
