
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

// Simple fallback function for team fetching without using problematic RPC
const fetchUserTeamsSimple = async (userId: string, companyId?: string) => {
  try {
    logger.log('🔍 Fetching teams using simple query instead of RPC');
    
    // Use a simple team_members query instead of the missing get_user_teams RPC
    const { data: teamMemberships, error } = await supabase
      .from('team_members')
      .select(`
        team_id,
        role,
        teams!inner (
          id,
          name,
          description,
          company_id
        )
      `)
      .eq('user_id', userId);

    if (error) {
      logger.error('Error fetching team memberships:', error);
      return [];
    }

    // Transform the data
    const teams = (teamMemberships || [])
      .filter(tm => tm.teams && typeof tm.teams === 'object' && !Array.isArray(tm.teams))
      .map(tm => {
        const team = tm.teams as any;
        return {
          id: team.id,
          name: team.name,
          description: team.description,
          company_id: team.company_id
        };
      })
      .filter(team => !companyId || team.company_id === companyId);

    logger.log('✅ Teams fetched successfully:', teams.length);
    return teams;
  } catch (error) {
    logger.error('Error in fetchUserTeamsSimple:', error);
    return [];
  }
};

const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  delay: number = 1000
): Promise<T> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      logger.error(`Attempt ${attempt + 1} failed:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Don't retry if it's the get_user_teams error - just skip teams
      if (error instanceof Error && error.message.includes('get_user_teams')) {
        logger.log('Skipping teams fetch due to missing RPC function');
        throw new Error('Failed to fetch teams: Database function not available');
      }
      
      await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
    }
  }
  throw new Error('Max retries exceeded');
};

interface TasksPageData {
  tasks: any[];
  taskCounts: Array<{
    id: string;
    name: string;
    personalCount: number;
    teamCount: number;
    totalCount: number;
  }>;
  teams: any[];
  loading: boolean;
  error: string | null;
}

export const useTasksPageOptimized = (selectedTeamIds: string[]) => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const { toast } = useToast();
  
  const [data, setData] = useState<TasksPageData>({
    tasks: [],
    taskCounts: [],
    teams: [],
    loading: true,
    error: null
  });

  // Memoize valid team IDs to prevent unnecessary queries
  const validTeamIds = useMemo(() => {
    if (!currentCompany) return ['personal']; // Default to personal
    return selectedTeamIds.filter(teamId => {
      if (teamId === 'personal') return true;
      const team = data.teams.find(t => t.id === teamId);
      return team && team.company_id === currentCompany?.id;
    });
  }, [selectedTeamIds, data.teams, currentCompany]);

  const fetchData = useCallback(async () => {
    if (!user) {
      setData({
        tasks: [],
        taskCounts: [],
        teams: [],
        loading: false,
        error: null
      });
      return;
    }

    logger.log('🚀 Starting optimized tasks page data fetch');

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Fetch teams using simple query instead of problematic RPC
      let teams: any[] = [];
      try {
        teams = await withRetry(() => fetchUserTeamsSimple(user.id, currentCompany?.id));
      } catch (error) {
        logger.error('Error fetching teams:', error);
        // Continue without teams rather than failing entirely
        teams = [];
      }

      // Use validTeamIds for consistent data fetching
      const teamIdsToFetch = validTeamIds.length > 0 ? validTeamIds : ['personal'];

      // Fetch tasks and task counts using optimized queries
      const queries = await Promise.allSettled([
        // Personal tasks
        teamIdsToFetch.includes('personal')
          ? supabase
              .from('kanban_tasks')
              .select('*')
              .eq('task_type', 'personal')
              .eq('user_id', user.id)
              .eq('is_archived', false)
              .order('created_at', { ascending: false })
              .limit(100)
          : Promise.resolve({ data: [], error: null }),

        // Team tasks
        teams.length > 0
          ? supabase
              .from('kanban_tasks')
              .select('*')
              .eq('task_type', 'team')
              .in('team_id', teams.map(t => t.id))
              .eq('is_archived', false)
              .order('created_at', { ascending: false })
              .limit(100)
          : Promise.resolve({ data: [], error: null }),

        // Personal task counts
        teamIdsToFetch.includes('personal')
          ? supabase
              .from('kanban_tasks')
              .select('id', { count: 'exact', head: true })
              .eq('task_type', 'personal')
              .eq('user_id', user.id)
              .eq('is_archived', false)
          : Promise.resolve({ count: 0, error: null }),

        // Team task counts
        teams.length > 0
          ? supabase
              .from('kanban_tasks')
              .select('team_id', { count: 'exact' })
              .eq('task_type', 'team')
              .in('team_id', teams.map(t => t.id))
              .eq('is_archived', false)
          : Promise.resolve({ data: [], count: 0, error: null })
      ]);

      // Process results
      const [personalTasksResult, teamTasksResult, personalCountResult, teamCountResult] = queries;

      // Combine all tasks
      let allTasks: any[] = [];
      
      if (personalTasksResult.status === 'fulfilled' && personalTasksResult.value.data) {
        allTasks = [...allTasks, ...personalTasksResult.value.data];
      }
      
      if (teamTasksResult.status === 'fulfilled' && teamTasksResult.value.data) {
        allTasks = [...allTasks, ...teamTasksResult.value.data];
      }

      // Build task counts
      const taskCounts = [];

      // Personal tasks count
      if (teamIdsToFetch.includes('personal')) {
        const personalCount = personalCountResult.status === 'fulfilled' 
          ? (personalCountResult.value.count || 0)
          : 0;
        
        taskCounts.push({
          id: 'personal',
          name: 'Personal Tasks',
          personalCount,
          teamCount: 0,
          totalCount: personalCount
        });
      }

      // Team task counts
      if (teamCountResult.status === 'fulfilled' && teamCountResult.value.data) {
        const teamCountsMap = new Map<string, number>();
        teamCountResult.value.data.forEach((task: any) => {
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
        tasks: allTasks,
        taskCounts,
        teams,
        loading: false,
        error: null
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tasks page data';
      logger.error('❌ Error fetching tasks page data:', error);
      
      setData(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      // Only show toast for actual errors, not missing function warnings
      if (!errorMessage.includes('get_user_teams') && !errorMessage.includes('Database function not available')) {
        toast({
          title: "Error Loading Data",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  }, [user, currentCompany, validTeamIds, toast]);

  // Debounced effect to prevent excessive requests - only trigger when dependencies actually change
  useEffect(() => {
    // Don't fetch if we're already loading or if essential data is missing
    if (data.loading && data.teams.length === 0) return;
    
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [user?.id, currentCompany?.id]); // Removed validTeamIds to prevent circular updates

  return {
    ...data,
    refetch: fetchData,
  };
};
