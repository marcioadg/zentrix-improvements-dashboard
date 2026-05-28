
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useUserTeams } from '@/hooks/useUserTeams';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OptimizedTaskData {
  tasks: any[];
  taskCounts: Array<{
    id: string;
    name: string;
    personalCount: number;
    teamCount: number;
    totalCount: number;
  }>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface TaskCountResult {
  team_id: string | null;
  task_type: string;
  count: number;
  team_name?: string;
}

export const useOptimizedTasksPage = (selectedTeamIds: string[]) => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const { teams } = useUserTeams();
  const { toast } = useToast();
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [taskCounts, setTaskCounts] = useState<Array<{
    id: string;
    name: string;
    personalCount: number;
    teamCount: number;
    totalCount: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize valid team IDs to prevent unnecessary queries
  const validTeamIds = useMemo(() => {
    if (!currentCompany) return [];
    return selectedTeamIds.filter(teamId => {
      if (teamId === 'personal') return true;
      const team = teams.find(t => t.id === teamId);
      return team && team.company_id === currentCompany?.id;
    });
  }, [selectedTeamIds, teams, currentCompany]);

  // Consolidated fetch function for both tasks and counts
  const fetchData = useCallback(async () => {
    if (!user || !currentCompany || validTeamIds.length === 0) {
      setTasks([]);
      setTaskCounts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Single optimized query for task counts using aggregation
      const teamIds = validTeamIds.filter(id => id !== 'personal');
      
      const queries = await Promise.allSettled([
        // Personal task counts
        validTeamIds.includes('personal') 
          ? supabase
              .from('kanban_tasks')
              .select('status', { count: 'exact' })
              .eq('task_type', 'personal')
              .eq('user_id', user.id)
              .eq('is_archived', false)
          : Promise.resolve({ data: [], count: 0, error: null }),
        
        // Team task counts (batch query)
        teamIds.length > 0
          ? supabase
              .from('kanban_tasks')
              .select('team_id, status', { count: 'exact' })
              .eq('task_type', 'team')
              .in('team_id', teamIds)
              .eq('is_archived', false)
          : Promise.resolve({ data: [], count: 0, error: null }),
        
        // Actual tasks data (paginated)
        validTeamIds.includes('personal')
          ? supabase
              .from('kanban_tasks')
              .select('*')
              .eq('task_type', 'personal')
              .eq('user_id', user.id)
              .eq('is_archived', false)
              .order('created_at', { ascending: false })
              .limit(50)
          : Promise.resolve({ data: [], error: null }),
        
        // Team tasks data
        teamIds.length > 0
          ? supabase
              .from('kanban_tasks')
              .select('*')
              .eq('task_type', 'team')
              .in('team_id', teamIds)
              .eq('is_archived', false)
              .order('created_at', { ascending: false })
              .limit(50)
          : Promise.resolve({ data: [], error: null })
      ]);

      // Process results
      const [personalCountResult, teamCountResult, personalTasksResult, teamTasksResult] = queries;

      // Combine tasks
      let allTasks: any[] = [];
      
      if (personalTasksResult.status === 'fulfilled' && personalTasksResult.value.data) {
        allTasks = [...allTasks, ...personalTasksResult.value.data];
      }
      
      if (teamTasksResult.status === 'fulfilled' && teamTasksResult.value.data) {
        allTasks = [...allTasks, ...teamTasksResult.value.data];
      }

      // Process task counts
      const newTaskCounts = [];
      
      // Personal tasks count
      if (validTeamIds.includes('personal')) {
        const personalCount = personalCountResult.status === 'fulfilled' 
          ? (personalCountResult.value.count || 0)
          : 0;
        
        newTaskCounts.push({
          id: 'personal',
          name: 'Personal Tasks',
          personalCount,
          teamCount: 0,
          totalCount: personalCount
        });
      }

      // Team tasks counts
      if (teamCountResult.status === 'fulfilled' && teamCountResult.value.data) {
        const teamCountsMap = new Map<string, number>();
        teamCountResult.value.data.forEach((task: any) => {
          if (task.team_id) {
            teamCountsMap.set(task.team_id, (teamCountsMap.get(task.team_id) || 0) + 1);
          }
        });
        
        teams.forEach(team => {
          if (teamIds.includes(team.id)) {
            const count = teamCountsMap.get(team.id) || 0;
            newTaskCounts.push({
              id: team.id,
              name: team.name,
              personalCount: 0,
              teamCount: count,
              totalCount: count
            });
          }
        });
      }

      setTasks(allTasks);
      setTaskCounts(newTaskCounts);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tasks';
      setError(errorMessage);
      
      toast({
        title: "Error Loading Tasks",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, currentCompany, validTeamIds, teams, toast]);

  // Debounced effect to prevent too many requests
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [fetchData]);

  // Optimized real-time subscription
  useEffect(() => {
    if (!user || !currentCompany || validTeamIds.length === 0) return;

    const channelName = `optimized_tasks_${currentCompany?.id}_${validTeamIds.join('_')}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kanban_tasks',
        },
        () => {
          // Debounced refetch to prevent spam
          const timeoutId = setTimeout(fetchData, 200);
          return () => clearTimeout(timeoutId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, currentCompany, validTeamIds, fetchData]);

  return {
    tasks,
    taskCounts,
    loading,
    error,
    refetch: fetchData,
  };
};
