import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { requestDeduplicator } from '@/utils/requestDeduplicator';
import { logger } from '@/utils/logger';

export interface DashboardGoal {
  id: string;
  title: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'on_track' | 'at_risk' | 'off_track' | 'complete';
  target_date?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardData {
  completedGoalsPercentage: number;
  completedTasksLast7DaysPercentage: number;
  goals: DashboardGoal[];
}

export const useDashboardData = () => {
  const [data, setData] = useState<DashboardData>({
    completedGoalsPercentage: 0,
    completedTasksLast7DaysPercentage: 0,
    goals: []
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { currentCompany } = useMultiCompanyAccess();

  useEffect(() => {
    if (!user || !currentCompany) {
      logger.log('🔍 useDashboardData: Missing user or company:', { user: !!user, currentCompany: !!currentCompany });
      return;
    }

    const fetchDashboardData = async () => {
      const cacheKey = `dashboard-kpis-${user.id}-${currentCompany?.id}`;
      
      try {
        const result = await requestDeduplicator.deduplicate(cacheKey, async () => {
          logger.log('🔍 useDashboardData: Fetching dashboard KPIs for user:', user.id, 'company:', currentCompany?.id);
          
          // Calculate date for 7 days ago
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Fetch user's team goals for the current company
        const { data: teamGoals, error: teamGoalsError } = await supabase
          .from('team_goals')
          .select(`
            *,
            teams!inner(company_id)
          `)
          .eq('teams.company_id', currentCompany?.id)
          .eq('archived', false)
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        logger.log('🔍 useDashboardData: Team goals query result:', { teamGoals, teamGoalsError, userId: user.id, companyId: currentCompany?.id });

        const allGoals = teamGoals || [];
        const completedGoals = allGoals.filter(g => g.status === 'complete').length;
        const completedGoalsPercentage = allGoals.length > 0 ? Math.round((completedGoals / allGoals.length) * 100) : 0;

        // Fetch user's tasks completion in last 7 days
        const { data: recentPersonalTasks } = await supabase
          .from('fast_tasks')
          .select('status, updated_at')
          .eq('user_id', user.id)
          .eq('task_type', 'personal')
          .eq('is_deleted', false)
          .gte('updated_at', sevenDaysAgo.toISOString());

        const { data: recentTeamTasks } = await supabase
          .from('fast_tasks')
          .select(`
            status, updated_at,
            teams!inner(company_id)
          `)
          .eq('task_type', 'team')
          .eq('teams.company_id', currentCompany?.id)
          .eq('is_deleted', false)
          .or(`user_id.eq.${user.id},assigned_to.cs.{${user.id}}`)
          .gte('updated_at', sevenDaysAgo.toISOString());

        const allRecentTasks = [...(recentPersonalTasks || []), ...(recentTeamTasks || [])];
        const completedRecentTasks = allRecentTasks.filter(t => t.status === 'done' || t.status === 'completed').length;
        const completedTasksLast7DaysPercentage = allRecentTasks.length > 0 ? Math.round((completedRecentTasks / allRecentTasks.length) * 100) : 0;

          const dashboardData = {
            completedGoalsPercentage,
            completedTasksLast7DaysPercentage,
            goals: (teamGoals || []).map(goal => ({
              ...goal,
              status: goal.status as DashboardGoal['status']
            }))
          };

          logger.log('🔍 useDashboardData: Final data:', dashboardData);
          return dashboardData;
        });
        
        setData(result);
      } catch (error) {
        logger.error('❌ useDashboardData: Error fetching dashboard data:', error);
        // Set default values on error
        setData({
          completedGoalsPercentage: 0,
          completedTasksLast7DaysPercentage: 0,
          goals: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, currentCompany]);

  return { ...data, loading };
};