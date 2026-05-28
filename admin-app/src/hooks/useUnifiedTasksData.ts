import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useQuery } from '@tanstack/react-query';
import { logger } from '@/lib/logger';

interface UnifiedTask {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  task_type: 'personal' | 'team';
  team_id?: string;
  team_name?: string;
  assigned_to: string[];
  user_id: string;
  due_date?: string;
  is_archived: boolean;
  archived_at?: string;
  created_at: string;
  updated_at: string;
}

interface UnifiedTeam {
  id: string;
  name: string;
  company_id: string;
  role?: string;
}

interface TasksDataResult {
  tasks: UnifiedTask[];
  teams: UnifiedTeam[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useUnifiedTasksData = (): TasksDataResult => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();

  // Single query key for both tasks and teams
  const queryKey = useMemo(() => 
    ['unified-tasks-data', user?.id, currentCompany?.id], 
    [user?.id, currentCompany?.id]
  );

  const fetchUnifiedData = async () => {
    if (!user || !currentCompany) {
      throw new Error('Authentication required');
    }

    logger.info('Fetching unified tasks data', { userId: user.id, companyId: currentCompany?.id });

    try {
      // Fetch teams and tasks in parallel
      const [teamsResult, personalTasksResult, teamTasksResult] = await Promise.allSettled([
        // Teams query
        supabase
          .from('team_members')
          .select(`
            team_id,
            role,
            teams!inner (
              id,
              name,
              company_id
            )
          `)
          .eq('user_id', user.id)
          .eq('teams.company_id', currentCompany?.id),

        // Personal tasks query
        supabase
          .from('fast_tasks')
          .select('*')
          .eq('task_type', 'personal')
          .eq('user_id', user.id)
          .eq('is_archived', false)
          .order('created_at', { ascending: false }),

        // Team tasks query - we'll filter this after getting teams
        supabase
          .from('fast_tasks')
          .select('*')
          .eq('task_type', 'team')
          .contains('assigned_to', [user.id])
          .eq('is_archived', false)
          .order('created_at', { ascending: false })
      ]);

      // Process teams
      let teams: UnifiedTeam[] = [];
      if (teamsResult.status === 'fulfilled' && teamsResult.value.data) {
        teams = teamsResult.value.data
          .filter((tm: any) => tm.teams && typeof tm.teams === 'object')
          .map((tm: any) => ({
            id: tm.teams.id,
            name: tm.teams.name,
            company_id: tm.teams.company_id,
            role: 'member'
          }));
      }

      // Process tasks
      let allTasks: UnifiedTask[] = [];

      // Add personal tasks
      if (personalTasksResult.status === 'fulfilled' && personalTasksResult.value.data) {
        allTasks = [...allTasks, ...personalTasksResult.value.data];
      }

      // Add team tasks (filter by user's teams)
      if (teamTasksResult.status === 'fulfilled' && teamTasksResult.value.data) {
        const userTeamIds = teams.map(t => t.id);
        const filteredTeamTasks = teamTasksResult.value.data.filter((task: any) => 
          task.team_id && userTeamIds.includes(task.team_id)
        );
        allTasks = [...allTasks, ...filteredTeamTasks];
      }

      logger.info('Unified data fetch complete', {
        teamsCount: teams.length,
        tasksCount: allTasks.length,
        personalTasks: allTasks.filter(t => t.task_type === 'personal').length,
        teamTasks: allTasks.filter(t => t.task_type === 'team').length
      });

      return { tasks: allTasks, teams };
    } catch (error) {
      logger.error('Failed to fetch unified tasks data', error);
      throw error;
    }
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: fetchUnifiedData,
    enabled: !!user && !!currentCompany,
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false
  });

  // Real-time subscription
  useEffect(() => {
    if (!user || !currentCompany) return;

    const channel = supabase
      .channel(`unified-tasks-${user.id}-${currentCompany?.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fast_tasks'
        },
        () => {
          logger.debug('Task change detected, refetching data');
          setTimeout(refetch, 100); // Debounced refetch
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, currentCompany?.id, refetch]);

  return {
    tasks: data?.tasks || [],
    teams: data?.teams || [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch
  };
};