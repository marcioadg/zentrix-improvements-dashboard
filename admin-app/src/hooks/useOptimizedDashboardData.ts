import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { requestDeduplicator } from '@/utils/requestDeduplicator';
import { DashboardData } from '@/hooks/useDashboardData';
import { logger } from '@/lib/logger';

// Helper function to get current quarter start date
const getCurrentQuarterStart = () => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
  return new Date(now.getFullYear(), quarterStartMonth, 1);
};

interface OptimizedDashboardData extends DashboardData {
  goals: any[];
  tasks: any[];
  metrics: any[];
  loading: boolean;
  error: string | null;
}

export const useOptimizedDashboardData = () => {
  const [data, setData] = useState<OptimizedDashboardData>({
    completedGoalsPercentage: 0,
    completedTasksLast7DaysPercentage: 0,
    goals: [],
    tasks: [],
    metrics: [],
    loading: true,
    error: null
  });

  const { user } = useAuth();
  const { currentCompany } = useMultiCompanyAccess();

  // Optimistic update function for goal completion
  const updateGoalCompletionOptimistically = useCallback((goalId: string, newStatus: string) => {
    setData(prev => {
      const updatedGoals = prev.goals.map(goal => {
        if (goal.id === goalId) {
          const updatedGoal = { ...goal, status: newStatus };
          // If goal is being marked as complete, set progress to 100%
          if (newStatus === 'complete' || newStatus === 'completed') {
            updatedGoal.progress = 100;
          }
          return updatedGoal;
        }
        return goal;
      });
      
      const completedGoals = updatedGoals.filter(g => g.status === 'complete').length;
      const completedGoalsPercentage = updatedGoals.length > 0 ? Math.round((completedGoals / updatedGoals.length) * 100) : 0;
      
      return {
        ...prev,
        goals: updatedGoals,
        completedGoalsPercentage
      };
    });
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!user || !currentCompany) {
      logger.debug('Missing user or company for dashboard data fetch');
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    const cacheKey = `dashboard-${user.id}-${currentCompany?.id}`;
    
    try {
      const result = await requestDeduplicator.deduplicate(cacheKey, async () => {
        logger.debug('Starting optimized dashboard data fetch');
        
        // Try to use the optimized RPC function first
        try {
          const { data: rpcData, error: rpcError } = await supabase
            .rpc('get_dashboard_data', {
              user_id_param: user.id,
              company_id_param: currentCompany?.id
            });

          if (rpcError) throw rpcError;
          
          logger.debug('RPC dashboard fetch successful');
          return rpcData;
        } catch (rpcError) {
          logger.debug('RPC failed, falling back to parallel queries');
          
          // Fallback to parallel queries if RPC fails
          // Calculate date for 7 days ago
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          // Get user's team memberships first
          const { data: userTeams } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', user.id);
          
          const userTeamIds = userTeams?.map(tm => tm.team_id) || [];
          
          // Execute all queries in parallel — use allSettled so a single failure
          // doesn't blank the entire dashboard
          const [
            teamGoalsSettled,
            personalGoalsSettled,
            personalTasksSettled,
            teamTasksSettled,
            metricsSettled
          ] = await Promise.allSettled([
            // Team/personal goals matching dashboard display logic
            supabase
              .from('team_goals')
              .select('id, title, status, target_date, created_at, is_company_goal, teams!inner(company_id)')
              .eq('teams.company_id', currentCompany.id)
              .eq('owner_id', user.id) // Only get goals owned by current user
              .eq('is_company_goal', false) // Personal goals only
              .or('archived.is.null,archived.eq.false')
              .order('created_at', { ascending: false }),

            // Company goals matching dashboard display logic
            supabase
              .from('team_goals')
              .select('id, title, status, target_date, created_at, is_company_goal, teams!inner(company_id)')
              .eq('teams.company_id', currentCompany.id)
              .eq('is_company_goal', true)
              .eq('owner_id', user.id)
              .or('archived.is.null,archived.eq.false')
              .order('display_order', { ascending: true }),

            // Personal tasks for last 7 days KPI
            supabase
              .from('fast_tasks')
              .select('status, updated_at')
              .eq('user_id', user.id)
              .eq('task_type', 'personal')
              .eq('is_deleted', false)
              .gte('updated_at', sevenDaysAgo.toISOString()),

            // Team tasks for last 7 days KPI
            supabase
              .from('fast_tasks')
              .select('status, updated_at, teams!inner(company_id)')
              .eq('task_type', 'team')
              .eq('teams.company_id', currentCompany.id)
              .eq('is_deleted', false)
              .or(`user_id.eq.${user.id},assigned_to.cs.{${user.id}}`)
              .gte('updated_at', sevenDaysAgo.toISOString()),

            // User's metrics (limited for dashboard)
            supabase
              .from('weekly_metrics')
              .select(`
                id, metric_name, unit, target_value, target_logic, metric_value,
                week_start_date, teams!inner(id, name, company_id),
                profiles!owner_id(full_name, avatar_url)
              `)
              .eq('owner_id', user.id)
              .eq('teams.company_id', currentCompany.id)
              .is('deleted_at', null)
              .order('week_start_date', { ascending: false })
              .limit(15)
          ]);

          // Extract data from settled results — failed queries fall back to empty arrays
          const teamGoalsResult = teamGoalsSettled.status === 'fulfilled' ? teamGoalsSettled.value : { data: null };
          const personalGoalsResult = personalGoalsSettled.status === 'fulfilled' ? personalGoalsSettled.value : { data: null };
          const personalTasksResult = personalTasksSettled.status === 'fulfilled' ? personalTasksSettled.value : { data: null };
          const teamTasksResult = teamTasksSettled.status === 'fulfilled' ? teamTasksSettled.value : { data: null };
          const metricsResult = metricsSettled.status === 'fulfilled' ? metricsSettled.value : { data: null };

          if (teamGoalsSettled.status === 'rejected') logger.debug('Team goals query failed', teamGoalsSettled.reason);
          if (personalGoalsSettled.status === 'rejected') logger.debug('Company goals query failed', personalGoalsSettled.reason);
          if (personalTasksSettled.status === 'rejected') logger.debug('Personal tasks query failed', personalTasksSettled.reason);
          if (teamTasksSettled.status === 'rejected') logger.debug('Team tasks query failed', teamTasksSettled.reason);
          if (metricsSettled.status === 'rejected') logger.debug('Metrics query failed', metricsSettled.reason);

          // Process goals for KPI - combine personal and company goals
          const personalGoals = teamGoalsResult.data || [];
          const companyGoals = personalGoalsResult.data || [];
          const allGoals = [...personalGoals, ...companyGoals];
          
          logger.debug('Goals fetched for KPI calculation', {
            personalGoalsCount: personalGoals.length,
            companyGoalsCount: companyGoals.length,
            totalGoalsCount: allGoals.length,
            userTeamCount: userTeamIds.length
          });
          
          const completedGoals = allGoals.filter(g => g.status === 'complete').length;
          const completedGoalsPercentage = allGoals.length > 0 ? Math.round((completedGoals / allGoals.length) * 100) : 0;
          
          logger.debug('KPI calculation completed', {
            completedGoalsCount: completedGoals,
            totalGoalsCount: allGoals.length,
            completedPercentage: completedGoalsPercentage,
            statusBreakdown: allGoals.reduce((acc, g) => {
              acc[g.status] = (acc[g.status] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          });

          // Process tasks for KPI
          const allRecentTasks = [...(personalTasksResult.data || []), ...(teamTasksResult.data || [])];
          const completedRecentTasks = allRecentTasks.filter(t => t.status === 'done' || t.status === 'completed').length;
          const completedTasksLast7DaysPercentage = allRecentTasks.length > 0 ? Math.round((completedRecentTasks / allRecentTasks.length) * 100) : 0;

          // Process metrics data
          const metricsData = metricsResult.data || [];
          const groupedMetrics = new Map();
          
          metricsData.forEach((metric: any) => {
            const teamId = metric.teams?.id;
            const key = `${metric.metric_name}-${teamId}`;
            if (!groupedMetrics.has(key)) {
              const profileData = metric.profiles;
              groupedMetrics.set(key, {
                id: metric.id,
                metric_name: metric.metric_name,
                unit: metric.unit,
                target_value: metric.target_value,
                target_logic: metric.target_logic,
                owner: profileData?.full_name || 'Unknown',
                weeklyValues: {}
              });
            }
            
            const metricData = groupedMetrics.get(key);
            if (metricData) {
              metricData.weeklyValues[metric.week_start_date] = metric.metric_value;
            }
          });

          const processedMetrics = Array.from(groupedMetrics.values());

          return {
            completedGoalsPercentage,
            completedTasksLast7DaysPercentage,
            goals: [...personalGoals, ...companyGoals].slice(0, 5),
            tasks: [],
            metrics: processedMetrics.slice(0, 10)
          };
        }
      });

      logger.debug('Dashboard data fetch completed successfully');
      setData(prev => ({
        ...prev,
        ...result,
        loading: false,
        error: null
      }));

    } catch (error) {
      logger.error('Dashboard data fetch failed:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load dashboard data'
      }));
    }
  }, [user, currentCompany]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    ...data,
    refetch: fetchDashboardData,
    updateGoalCompletionOptimistically
  };
};