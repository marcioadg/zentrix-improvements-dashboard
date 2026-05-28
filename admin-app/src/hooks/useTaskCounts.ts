
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface TaskCount {
  id: string;
  name: string;
  count: number;
  type: 'personal' | 'team';
}

export const useTaskCounts = () => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompanyAccess();
  const [taskCounts, setTaskCounts] = useState<TaskCount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTaskCounts = async () => {
    if (!user || !currentCompany) {
      setTaskCounts([]);
      setLoading(false);
      return;
    }

    try {
      // Single optimized query to get all task counts at once
      const [personalCountResult, teamCountsResult] = await Promise.all([
        // Personal task count
        supabase
          .from('kanban_tasks')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('task_type', 'personal')
          .is('team_id', null)
          .eq('is_archived', false),

        // Team tasks count with team info in single query
        supabase
          .from('kanban_tasks')
          .select(`
            team_id,
            teams!inner (
              id,
              name,
              company_id,
              team_members!inner (
                user_id
              )
            )
          `, { count: 'exact' })
          .eq('task_type', 'team')
          .eq('is_archived', false)
          .eq('teams.company_id', currentCompany?.id)
          .eq('teams.team_members.user_id', user.id)
      ]);

      const personalCount = personalCountResult.count || 0;
      
      // Process team counts from the aggregated result
      const teamCountsMap = new Map<string, { name: string; count: number }>();
      
      if (teamCountsResult.data) {
        teamCountsResult.data.forEach((task: any) => {
          if (task.teams) {
            const teamId = task.teams.id;
            const teamName = task.teams.name;
            
            if (teamCountsMap.has(teamId)) {
              teamCountsMap.get(teamId)!.count += 1;
            } else {
              teamCountsMap.set(teamId, { name: teamName, count: 1 });
            }
          }
        });
      }

      const teamCounts: TaskCount[] = Array.from(teamCountsMap.entries()).map(
        ([teamId, { name, count }]) => ({
          id: teamId,
          name,
          count,
          type: 'team' as const
        })
      );

      const allCounts = [
        {
          id: 'personal',
          name: 'Personal',
          count: personalCount,
          type: 'personal' as const
        },
        ...teamCounts
      ];

      setTaskCounts(allCounts);
    } catch (error) {
      logger.error('Error fetching task counts:', error);
      setTaskCounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskCounts();
  }, [user, currentCompany?.id]);

  const getDefaultSelection = () => {
    if (taskCounts.length === 0) return 'personal';
    return ['personal', ...taskCounts.filter(tc => tc.type === 'team').map(tc => tc.id)];
  };

  const getAllTasksCount = () => {
    return taskCounts.reduce((total, tc) => total + tc.count, 0);
  };

  return {
    taskCounts,
    loading,
    refetch: fetchTaskCounts,
    getDefaultSelection,
    getAllTasksCount
  };
};
