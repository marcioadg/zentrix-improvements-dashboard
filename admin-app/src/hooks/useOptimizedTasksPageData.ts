
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OptimizedTasksData {
  tasks: any[];
  taskCounts: any[];
  teams: any[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useOptimizedTasksPageData = (selectedTeamIds: string[]): OptimizedTasksData => {
  const [data, setData] = useState({
    tasks: [],
    taskCounts: [],
    teams: [],
    loading: true,
    error: null
  });
  
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const { toast } = useToast();

  // Memoize the selected team IDs to prevent unnecessary refetches
  const memoizedTeamIds = useMemo(() => 
    [...selectedTeamIds].sort().join(','), 
    [selectedTeamIds]
  );

  const fetchOptimizedData = useCallback(async () => {
    if (!user) {
      setData({ tasks: [], taskCounts: [], teams: [], loading: false, error: null });
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Use Promise.all for parallel execution instead of sequential queries
      const [tasksResult, teamsResult, countsResult] = await Promise.all([
        // Fetch all tasks in a single optimized query
        supabase
          .from('kanban_tasks')
          .select(`
            id, title, description, status, task_type, user_id, team_id, 
            assigned_to, due_date, created_at, updated_at, is_archived
          `)
          .eq('is_archived', false)
          .or(`and(task_type.eq.personal,user_id.eq.${user.id}),and(task_type.eq.team,team_id.in.(${selectedTeamIds.filter(id => id !== 'personal').join(',')}))`)
          .order('created_at', { ascending: false })
          .limit(200),

        // Fetch user teams with company filtering
        supabase
          .from('team_members')
          .select(`
            team_id,
            role,
            teams!inner (
              id, name, description, company_id
            )
          `)
          .eq('user_id', user.id),

        // Fetch task counts in parallel
        Promise.all([
          // Personal task count
          supabase
            .from('kanban_tasks')
            .select('id', { count: 'exact', head: true })
            .eq('task_type', 'personal')
            .eq('user_id', user.id)
            .eq('is_archived', false),
          
          // Team task counts
          selectedTeamIds.filter(id => id !== 'personal').length > 0
            ? supabase
                .from('kanban_tasks')
                .select('team_id', { count: 'exact' })
                .eq('task_type', 'team')
                .in('team_id', selectedTeamIds.filter(id => id !== 'personal'))
                .eq('is_archived', false)
            : Promise.resolve({ data: [], count: 0, error: null })
        ])
      ]);

      // Process results
      const tasks = tasksResult.data || [];
      
      // Transform teams data
      const teams = (teamsResult.data || [])
        .filter(tm => tm.teams && typeof tm.teams === 'object')
        .map(tm => {
          const team = tm.teams as any;
          return {
            id: team.id,
            name: team.name,
            description: team.description,
            company_id: team.company_id
          };
        })
        .filter(team => !currentCompany || team.company_id === currentCompany?.id);

      // Build task counts efficiently
      const taskCounts = [];
      
      // Personal tasks count
      if (selectedTeamIds.includes('personal')) {
        const personalCount = countsResult[0].count || 0;
        taskCounts.push({
          id: 'personal',
          name: 'Personal Tasks',
          personalCount,
          teamCount: 0,
          totalCount: personalCount
        });
      }

      // Team task counts
      if (countsResult[1].data) {
        const teamCountsMap = new Map();
        countsResult[1].data.forEach((task: any) => {
          if (task.team_id) {
            teamCountsMap.set(task.team_id, (teamCountsMap.get(task.team_id) || 0) + 1);
          }
        });
        
        teams.forEach(team => {
          const count = teamCountsMap.get(team.id) || 0;
          taskCounts.push({
            id: team.id,
            name: team.name,
            personalCount: 0,
            teamCount: count,
            totalCount: count
          });
        });
      }

      setData({
        tasks,
        taskCounts,
        teams,
        loading: false,
        error: null
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tasks data';
      setData(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      if (!errorMessage.includes('permission') && !errorMessage.includes('RLS')) {
        toast({
          title: "Error Loading Tasks",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  }, [user, currentCompany, memoizedTeamIds, toast]);

  // Debounced effect to prevent excessive requests
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchOptimizedData();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [fetchOptimizedData]);

  // Optimized subscription with debouncing
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`optimized_tasks_${user.id}_${memoizedTeamIds}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kanban_tasks',
        },
        () => {
          // Debounced refetch to prevent excessive updates
          const timeoutId = setTimeout(fetchOptimizedData, 500);
          return () => clearTimeout(timeoutId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, memoizedTeamIds, fetchOptimizedData]);

  return {
    ...data,
    refetch: fetchOptimizedData,
  };
};
