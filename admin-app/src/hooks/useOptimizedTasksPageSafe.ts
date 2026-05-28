
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface TaskCounts {
  personal: number;
  [teamId: string]: number;
}

interface SafeTasksData {
  taskCounts: TaskCounts;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useOptimizedTasksPageSafe = (selectedTeamIds: string[]): SafeTasksData => {
  const [taskCounts, setTaskCounts] = useState<TaskCounts>({ personal: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTaskCounts = useCallback(async () => {
    if (!user) {
      setTaskCounts({ personal: 0 });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Try to use the new optimized function first
      try {
        const teamIds = selectedTeamIds.filter(id => id !== 'personal');
        
        const { data, error: rpcError } = await supabase.rpc('get_user_task_counts', {
          target_team_ids: teamIds.length > 0 ? teamIds : null
        });

        if (rpcError) throw rpcError;

        const newCounts: TaskCounts = { personal: 0 };
        
        if (data) {
          data.forEach((count: any) => {
            if (count.task_type === 'personal') {
              newCounts.personal += count.task_count;
            } else if (count.team_id && selectedTeamIds.includes(count.team_id)) {
              newCounts[count.team_id] = (newCounts[count.team_id] || 0) + count.task_count;
            }
          });
        }

        setTaskCounts(newCounts);
        return;
      } catch (rpcError) {
        logger.log('Optimized function not available, falling back to direct queries');
        
        // Fallback to direct queries if the function doesn't exist
        const teamIds = selectedTeamIds.filter(id => id !== 'personal');
        
        const queries = await Promise.all([
          // Personal tasks count
          supabase
            .from('kanban_tasks')
            .select('id', { count: 'exact', head: true })
            .eq('task_type', 'personal')
            .eq('user_id', user.id)
            .eq('is_archived', false),
          
          // Team tasks count - batch query for all teams
          teamIds.length > 0 
            ? supabase
                .from('kanban_tasks')
                .select('team_id', { count: 'exact' })
                .eq('task_type', 'team')
                .in('team_id', teamIds)
                .eq('is_archived', false)
            : Promise.resolve({ data: [], count: 0, error: null })
        ]);

        const [personalResult, teamResult] = queries;

        if (personalResult.error) throw personalResult.error;
        if (teamResult.error) throw teamResult.error;

        const newCounts: TaskCounts = {
          personal: personalResult.count || 0
        };

        // Aggregate team counts
        if (teamResult.data) {
          const teamCountsMap = new Map<string, number>();
          teamResult.data.forEach((task: any) => {
            if (task.team_id) {
              teamCountsMap.set(task.team_id, (teamCountsMap.get(task.team_id) || 0) + 1);
            }
          });
          
          teamCountsMap.forEach((count, teamId) => {
            newCounts[teamId] = count;
          });
        }

        setTaskCounts(newCounts);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load task counts';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, selectedTeamIds, toast]);

  // Memoized subscription channel name
  const channelName = useMemo(() => 
    `optimized_tasks_${selectedTeamIds.join('_')}_${user?.id}`, 
    [selectedTeamIds, user?.id]
  );

  useEffect(() => {
    fetchTaskCounts();

    // Single consolidated subscription for all task changes
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
          // Debounced refetch
          const timeoutId = setTimeout(fetchTaskCounts, 100);
          return () => clearTimeout(timeoutId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTaskCounts, channelName]);

  return {
    taskCounts,
    loading,
    error,
    refetch: fetchTaskCounts,
  };
};
