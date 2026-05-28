
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useUserTeams } from '@/hooks/useUserTeams';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { logger } from '@/utils/logger';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'inprogress' | 'done';
  task_type: 'personal' | 'team';
  user_id?: string;
  team_id?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  source: 'manual' | 'feedback-widget';
}

interface TaskCount {
  id: string;
  name: string;
  personalCount: number;
  teamCount: number;
  totalCount: number;
}

export const useStableTasksPage = (selectedTeamIds: string[]) => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const { teams, loading: teamsLoading } = useUserTeams();
  const { toast } = useToast();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskCounts, setTaskCounts] = useState<TaskCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use refs to track previous values for meaningful change detection
  const prevUserIdRef = useRef<string | undefined>();
  const prevCompanyIdRef = useRef<string | undefined>();
  const prevSelectedTeamIdsRef = useRef<string>('');

  // Memoize selectedTeamIds string for stable comparison
  const selectedTeamIdsString = useMemo(() => selectedTeamIds.join(','), [selectedTeamIds]);

  // Memoize valid team IDs to prevent unnecessary recalculations
  const validTeamIds = useMemo(() => {
    if (!currentCompany) return [];
    return selectedTeamIds.filter(teamId => {
      if (teamId === 'personal') return true;
      return teams.some(team => team.id === teamId);
    });
  }, [selectedTeamIds, teams, currentCompany]);

  const fetchTasksAndCounts = useCallback(async () => {
    if (!user || !currentCompany) {
      setTasks([]);
      setTaskCounts([]);
      setLoading(false);
      setInitialLoading(false);
      return;
    }

    // Check if this is a meaningful change that requires refetching
    const userIdChanged = prevUserIdRef.current !== user.id;
    const companyIdChanged = prevCompanyIdRef.current !== currentCompany?.id;
    const teamIdsChanged = prevSelectedTeamIdsRef.current !== selectedTeamIdsString;

    if (!userIdChanged && !companyIdChanged && !teamIdsChanged && tasks.length > 0) {
      // No significant changes and we already have data, skip fetch
      setLoading(false);
      setInitialLoading(false);
      return;
    }

    // Update refs to track current values
    prevUserIdRef.current = user.id;
    prevCompanyIdRef.current = currentCompany?.id;
    prevSelectedTeamIdsRef.current = selectedTeamIdsString;

    try {
      setLoading(true);
      setError(null);

      logger.log('🔍 useStableTasksPage: Fetching with meaningful changes:', {
        userIdChanged,
        companyIdChanged,
        teamIdsChanged,
        validTeamIds
      });

      // Build task counts first
      const newTaskCounts: TaskCount[] = [];
      let allTasks: Task[] = [];
      
      // Personal tasks count and data
      if (validTeamIds.includes('personal')) {
        const { data: personalTasks, error: personalError } = await supabase
          .from('kanban_tasks')
          .select('*')
          .eq('task_type', 'personal')
          .eq('user_id', user.id) // Explicit user filtering
          .eq('is_archived', false)
          .order('created_at', { ascending: false });

        if (personalError) {
          logger.error('Error fetching personal tasks:', personalError);
          throw personalError;
        }

        const personalCount = personalTasks?.length || 0;
        newTaskCounts.push({
          id: 'personal',
          name: 'Personal Tasks',
          personalCount,
          teamCount: 0,
          totalCount: personalCount
        });

        // Add personal tasks to main tasks array with source property
        if (personalTasks) {
          const tasksWithSource = personalTasks.map(task => ({
            ...task,
            source: (task.source || 'manual') as 'manual' | 'feedback-widget'
          })) as Task[];
          allTasks = [...allTasks, ...tasksWithSource];
        }
      }

      // Team tasks - first verify user has access to selected teams
      const teamIds = validTeamIds.filter(id => id !== 'personal' && teams.some(t => t.id === id));
      
      if (teamIds.length > 0) {
        // Get user's team memberships to validate access
        const { data: teamMemberships, error: membershipError } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id)
          .in('team_id', teamIds);

        if (membershipError) {
          logger.error('Error fetching team memberships:', membershipError);
          throw membershipError;
        }

        const accessibleTeamIds = teamMemberships?.map(tm => tm.team_id) || [];
        const filteredTeamIds = teamIds.filter(id => accessibleTeamIds.includes(id));

        if (filteredTeamIds.length > 0) {
          const { data: teamTasks, error: teamError } = await supabase
            .from('kanban_tasks')
            .select('*')
            .eq('task_type', 'team')
            .in('team_id', filteredTeamIds)
            .eq('is_archived', false)
            .order('created_at', { ascending: false });

          if (teamError) {
            logger.error('Error fetching team tasks:', teamError);
            throw teamError;
          }

          // Group by team for counts
          const teamTasksMap = new Map<string, Task[]>();
          (teamTasks || []).forEach(task => {
            if (task.team_id) {
              const taskWithSource = {
                ...task,
                source: (task.source || 'manual') as 'manual' | 'feedback-widget'
              } as Task;
              
              const existing = teamTasksMap.get(task.team_id) || [];
              teamTasksMap.set(task.team_id, [...existing, taskWithSource]);
            }
          });

          // Add team counts
          teams.forEach(team => {
            if (filteredTeamIds.includes(team.id)) {
              const teamTaskList = teamTasksMap.get(team.id) || [];
              const count = teamTaskList.length;
              newTaskCounts.push({
                id: team.id,
                name: team.name,
                personalCount: 0,
                teamCount: count,
                totalCount: count
              });
            }
          });

          // Add team tasks to main tasks array
          if (teamTasks) {
            const tasksWithSource = teamTasks.map(task => ({
              ...task,
              source: (task.source || 'manual') as 'manual' | 'feedback-widget'
            })) as Task[];
            allTasks = [...allTasks, ...tasksWithSource];
          }
        }
      }

      // Update state in a single batch to prevent multiple re-renders
      setTasks(allTasks);
      setTaskCounts(newTaskCounts);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tasks';
      setError(errorMessage);
      logger.error('Error fetching tasks:', err);
      
      toast({
        title: "Error",
        description: "Failed to load tasks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [user, currentCompany, validTeamIds, teams, selectedTeamIdsString, tasks.length, toast]);

  // Debounced fetch to prevent rapid successive calls
  const [debouncedFetch] = useDebouncedCallback(fetchTasksAndCounts, 300);

  // Effect to trigger fetch when dependencies change meaningfully
  useEffect(() => {
    if (teamsLoading) return;
    
    // Only fetch if we have valid data
    if (user && currentCompany && selectedTeamIds.length > 0) {
      debouncedFetch();
    }
  }, [user?.id, currentCompany?.id, selectedTeamIdsString, teamsLoading, debouncedFetch]);

  // Real-time subscription with cleanup
  useEffect(() => {
    if (!user || !currentCompany || validTeamIds.length === 0) return;

    const channelName = `stable_tasks_${currentCompany?.id}_${validTeamIds.join('_')}`;
    
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
          logger.log('🔄 Real-time stable tasks update received');
          // Debounced refetch on changes to prevent spam
          debouncedFetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, currentCompany?.id, validTeamIds.join(','), debouncedFetch]);

  return {
    tasks,
    teams,
    taskCounts,
    loading,
    initialLoading,
    error,
    refetch: fetchTasksAndCounts,
  };
};
