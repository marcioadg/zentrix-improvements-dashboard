
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface SimpleTask {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'inprogress' | 'done';
  task_type: 'personal' | 'team' | 'product';
  user_id?: string;
  team_id?: string;
  assigned_to?: string[];
  due_date?: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}

export const getSimplifiedTasks = async (selectedTeamIds: string[], userId: string): Promise<SimpleTask[]> => {
  try {
    if (selectedTeamIds.length === 0) {
      return [];
    }

    let allTasks: SimpleTask[] = [];

    // Fetch personal tasks
    if (selectedTeamIds.includes('personal')) {
      const { data: personalTasks } = await supabase
        .from('kanban_tasks')
        .select('*')
        .eq('task_type', 'personal')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('order_position', { ascending: true });

      if (personalTasks) {
        allTasks = [...allTasks, ...personalTasks.map(task => ({
          ...task,
          status: task.status as 'todo' | 'inprogress' | 'done',
          task_type: task.task_type as 'personal' | 'team' | 'product'
        }))];
      }
    }

    // Fetch team tasks
    const teamIds = selectedTeamIds.filter(id => id !== 'personal');
    if (teamIds.length > 0) {
      const { data: teamTasks } = await supabase
        .from('kanban_tasks')
        .select('*')
        .eq('task_type', 'team')
        .in('team_id', teamIds)
        .eq('is_archived', false)
        .order('order_position', { ascending: true });

      if (teamTasks) {
        allTasks = [...allTasks, ...teamTasks.map(task => ({
          ...task,
          status: task.status as 'todo' | 'inprogress' | 'done',
          task_type: task.task_type as 'personal' | 'team' | 'product'
        }))];
      }
    }

    return allTasks;
  } catch (error) {
    logger.error('Error fetching simplified tasks:', error);
    return [];
  }
};

export const addSimplifiedTask = async (
  title: string, 
  description: string, 
  teamSelection: { type: 'personal' | 'team'; teamId?: string },
  userId: string
): Promise<void> => {
  const taskData = {
    title,
    description,
    task_type: teamSelection.type,
    user_id: userId,
    team_id: teamSelection.teamId,
    status: 'todo',
    source: 'manual',
    is_archived: false
  };

  const { error } = await supabase
    .from('kanban_tasks')
    .insert(taskData);

  if (error) throw error;
};

export const updateSimplifiedTaskStatus = async (
  taskId: string, 
  status: 'todo' | 'inprogress' | 'done'
): Promise<void> => {
  const { error } = await supabase
    .from('kanban_tasks')
    .update({ status })
    .eq('id', taskId);

  if (error) throw error;
};

export const deleteSimplifiedTask = async (taskId: string): Promise<void> => {
  const { error } = await supabase
    .from('kanban_tasks')
    .update({ is_archived: true, archived_at: new Date().toISOString() })
    .eq('id', taskId);

  if (error) throw error;
};
