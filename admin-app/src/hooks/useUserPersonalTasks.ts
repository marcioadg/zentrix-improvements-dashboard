
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { logger } from '@/utils/logger';

export interface UserTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  task_type: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  team_name?: string;
  team_id?: string;
  assigned_to?: string[];
  user_id?: string;
  is_archived?: boolean;
  company_id?: string;
}

export const useUserPersonalTasks = () => {
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { currentCompany } = useMultiCompanyAccess();

  const fetchUserTasks = async () => {
    if (!user || !currentCompany) {
      setLoading(false);
      return;
    }

    try {
      // Personal tasks scoped to current company (RLS also enforces this)
      const { data: personalTasks, error: personalError } = await supabase
        .from('fast_tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('task_type', 'personal')
        .eq('company_id', currentCompany?.id)
        .order('created_at', { ascending: false });

      if (personalError) throw personalError;

      // Team tasks where user is assigned (not tasks they created for others)
      const { data: teamTasks, error: teamError } = await supabase
        .from('fast_tasks')
        .select(`
          *,
          teams!inner(company_id, name)
        `)
        .eq('task_type', 'team')
        .eq('teams.company_id', currentCompany?.id)
        .contains('assigned_to', [user.id]) // Check if user ID is in the assigned_to array
        .order('created_at', { ascending: false });

      if (teamError) {
        // Team tasks error is not critical
      }

      // Transform and combine tasks
      const transformedPersonalTasks = (personalTasks || []).map((task: any) => ({
        ...task,
        team_name: 'Personal'
      }));

      const transformedTeamTasks = (teamTasks || []).map((task: any) => ({
        ...task,
        team_name: task.teams?.name || 'Team'
      }));

      const allTasks = [...transformedPersonalTasks, ...transformedTeamTasks]
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

      setTasks(allTasks);
    } catch (error) {
      logger.error('❌ useUserPersonalTasks: Error fetching tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserTasks();
  }, [user, currentCompany]);

  // Calculate completion stats for last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentTasks = tasks.filter(task => 
    new Date(task.updated_at) >= sevenDaysAgo
  );
  
  const recentCompletedTasks = recentTasks.filter(task => 
    task.status === 'completed' || task.status === 'done'
  );

  const recentCompletedPercentage = recentTasks.length > 0 
    ? Math.round((recentCompletedTasks.length / recentTasks.length) * 100) 
    : 0;

  // Group tasks by status
  const tasksByStatus = {
    todo: tasks.filter(t => t.status === 'todo'),
    inprogress: tasks.filter(t => t.status === 'in-progress' || t.status === 'inprogress'), 
    done: tasks.filter(t => t.status === 'done' || t.status === 'completed')
  };

  return { 
    tasks, 
    loading,
    tasksByStatus,
    recentCompletedTasks: recentCompletedTasks.length,
    recentTotalTasks: recentTasks.length,
    recentCompletedPercentage,
    refetch: fetchUserTasks
  };
};
