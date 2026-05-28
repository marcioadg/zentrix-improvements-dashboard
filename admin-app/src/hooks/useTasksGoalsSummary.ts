import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface Task {
  id: string;
  title: string;
  priority: string;
  due_date?: string;
  status: string;
}

interface Goal {
  id: string;
  title: string;
  progress?: number;
  target_date?: string;
}

export const useTasksGoalsSummary = () => {
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [upcomingGoals, setUpcomingGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { currentCompany } = useMultiCompanyAccess();

  useEffect(() => {
    if (!user || !currentCompany) {
      logger.log('🔍 useTasksGoalsSummary: Missing user or company:', { 
        user: !!user, 
        userId: user?.id, 
        currentCompany: !!currentCompany,
        companyId: currentCompany?.id
      });
      setLoading(false);
      return;
    }

    const fetchTasksAndGoals = async () => {
      try {
        logger.log('🔍 useTasksGoalsSummary: Starting fetch for:', { userId: user.id, companyName: currentCompany?.name });
        
        // Fetch recent pending tasks - both personal and team tasks for the user
        // Personal tasks (no team filtering needed)
        const { data: personalTasks } = await supabase
          .from('fast_tasks')
          .select('id, title, due_date, status, task_type, created_at')
          .eq('user_id', user.id)
          .eq('status', 'todo')
          .eq('task_type', 'personal')
          .order('created_at', { ascending: false })
          .limit(3);

        // Team tasks where user is either creator or assigned
        const { data: teamTasks } = await supabase
          .from('fast_tasks')
          .select(`
            id, title, due_date, status, task_type, assigned_to,
            team_id, created_at
          `)
          .eq('task_type', 'team')
          .eq('status', 'todo')
          .or(`user_id.eq.${user.id},assigned_to.cs.{${user.id}}`)
          .order('created_at', { ascending: false })
          .limit(3);

        logger.log('🔍 useTasksGoalsSummary: Found personal tasks:', personalTasks?.length || 0);
        logger.log('🔍 useTasksGoalsSummary: Found team tasks:', teamTasks?.length || 0);

        // Combine and sort tasks
        const allTasks = [...(personalTasks || []), ...(teamTasks || [])]
          .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
          .slice(0, 5);

        // Fetch active goals - try both personal goals and team goals
        let allGoals: any[] = [];
        
        // First try personal goals - include all non-completed statuses  
        logger.log('🔍 useTasksGoalsSummary: Fetching personal goals for user:', user.id);
        
        // Debug: First check if we can query auth.users to verify our user exists
        const { data: authCheck } = await supabase.rpc('get_current_user_profile');
        logger.log('🔍 useTasksGoalsSummary: Auth check result:', authCheck);
        
        const { data: personalGoals, error: personalGoalsError } = await supabase
          .from('team_goals')
          .select('id, title, description, status, target_date, owner_id, progress')
          .eq('owner_id', user.id)
          .eq('is_company_goal', false)
          .neq('status', 'completed')
          .order('target_date', { ascending: true })
          .limit(3);

        logger.log('🔍 useTasksGoalsSummary: Personal goals query result:', { 
          data: personalGoals, 
          error: personalGoalsError,
          count: personalGoals?.length || 0,
          userId: user.id 
        });

        if (personalGoals && personalGoals.length > 0) {
          allGoals = [...personalGoals];
        }

        // Then try team goals (only if we have fewer than 3 goals)
        if (allGoals.length < 3) {
          const { data: teamGoals, error: teamGoalsError } = await supabase
            .from('team_goals')
            .select(`
              id, title, description, status, target_date,
              teams!inner(company_id)
            `)
            .eq('teams.company_id', currentCompany?.id)
            .eq('status', 'active')
            .order('target_date', { ascending: true })
            .limit(3 - allGoals.length);

          if (teamGoalsError) {
            logger.log('🔍 useTasksGoalsSummary: Team goals query error (may be expected):', teamGoalsError.message);
          } else if (teamGoals && teamGoals.length > 0) {
            allGoals = [...allGoals, ...teamGoals];
          }
        }

        logger.log('🔍 useTasksGoalsSummary: Found personal goals:', personalGoals?.length || 0);
        logger.log('🔍 useTasksGoalsSummary: Total goals found:', allGoals.length);

        // Transform tasks to add missing priority field
        const transformedTasks = allTasks.map((task: any) => ({
          id: task.id,
          title: task.title,
          priority: task.task_type === 'team' ? 'high' : 'medium',
          due_date: task.due_date,
          status: task.status
        }));

        // Transform goals to add progress calculation
        const transformedGoals = allGoals.map((goal: any) => ({
          id: goal.id,
          title: goal.title,
          progress: Math.floor(Math.random() * 80) + 10, // Placeholder progress between 10-90%
          target_date: goal.target_date
        }));

        setRecentTasks(transformedTasks);
        setUpcomingGoals(transformedGoals);
      } catch (error) {
        logger.error('❌ useTasksGoalsSummary: Error fetching tasks and goals:', error);
        setRecentTasks([]);
        setUpcomingGoals([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTasksAndGoals();
  }, [user, currentCompany]);

  const markTaskComplete = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('fast_tasks')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;

      setRecentTasks(prev => prev.filter(task => task.id !== taskId));
      toast.success('Task completed!');
    } catch (error) {
      logger.error('Error completing task:', error);
      toast.error('Failed to complete task');
    }
  };

  return { 
    recentTasks, 
    upcomingGoals, 
    loading, 
    markTaskComplete 
  };
};