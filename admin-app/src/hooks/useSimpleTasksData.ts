
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface SimpleTask {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'inprogress' | 'done';
  task_type: 'personal' | 'team' | 'product';
  team_id?: string;
  user_id?: string;
  created_at: string;
  is_archived: boolean;
}

interface SimpleTeam {
  id: string;
  name: string;
  company_id: string;
}

interface TaskCount {
  id: string;
  name: string;
  totalCount: number;
}

interface TeamMemberResult {
  team_id: string;
  teams: {
    id: string;
    name: string;
    company_id: string;
  }[] | null;
}

export const useSimpleTasksData = (selectedTeamIds: string[]) => {
  const { user, loading: authLoading } = useAuth();
  const { currentCompany, loading: companyLoading } = useMultiCompany();
  const { toast } = useToast();
  
  const [tasks, setTasks] = useState<SimpleTask[]>([]);
  const [teams, setTeams] = useState<SimpleTeam[]>([]);
  const [taskCounts, setTaskCounts] = useState<TaskCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState('Initializing...');
  const [retryAttempt, setRetryAttempt] = useState(0);

  const fetchData = useCallback(async () => {
    logger.log('🔄 useSimpleTasksData: Starting fetch', {
      user: user?.id,
      currentCompany: currentCompany?.id,
      authLoading,
      companyLoading,
      selectedTeamIds
    });

    // Wait for authentication to complete
    if (authLoading || companyLoading) {
      setLoadingStep('Waiting for authentication...');
      setLoading(true);
      return;
    }

    // Handle missing authentication context
    if (!user) {
      logger.warn('🔄 useSimpleTasksData: No user found');
      setError('Please log in to view your tasks');
      setLoadingStep('Authentication required');
      setLoading(false);
      return;
    }

    if (!currentCompany) {
      logger.warn('🔄 useSimpleTasksData: No company context found');
      setError('Company context required. Please select a company or contact support.');
      setLoadingStep('Company context required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      logger.log('🔄 Fetching ALL user tasks and teams for filtering');
      
      // Step 1: Load personal tasks first (fastest) - get ALL personal tasks
      setLoadingStep('Loading personal tasks...');
      const personalTasksPromise = supabase
        .from('kanban_tasks')
        .select('*')
        .eq('task_type', 'personal')
        .or(`user_id.eq.${user.id},assigned_to.cs.["${user.id}"]`)
        .eq('is_archived', false)
        .neq('status', 'done')
        .order('created_at', { ascending: false });

      // Step 2: Load teams in parallel
      setLoadingStep('Loading teams...');
      const teamsPromise = supabase
        .from('team_members')
        .select(`
          team_id,
          teams!inner (
            id,
            name,
            company_id
          )
        `)
        .eq('user_id', user.id);

      // Execute personal tasks and teams in parallel
      const [personalTasksResult, teamsResult] = await Promise.all([
        personalTasksPromise,
        teamsPromise
      ]);

      if (personalTasksResult.error) {
        logger.error('❌ Personal tasks error:', personalTasksResult.error);
        throw personalTasksResult.error;
      }
      if (teamsResult.error) {
        logger.error('❌ Teams error:', teamsResult.error);
        throw teamsResult.error;
      }

      // Process teams data with proper type handling
      const userTeams: SimpleTeam[] = [];
      
      if (teamsResult.data) {
        const teamMembersData = teamsResult.data as unknown as TeamMemberResult[];
        
        for (const teamMember of teamMembersData) {
          const teamsArray = teamMember.teams;
          
          if (teamsArray && Array.isArray(teamsArray)) {
            for (const team of teamsArray) {
              if (team && team.id && team.name && team.company_id === currentCompany?.id) {
                userTeams.push({
                  id: team.id,
                  name: team.name,
                  company_id: team.company_id
                });
              }
            }
          }
        }
      }

      setTeams(userTeams);

      // Step 3: Load ALL team tasks (not filtered by selection here)
      let allTasks: SimpleTask[] = personalTasksResult.data || [];
      
      if (userTeams.length > 0) {
        setLoadingStep('Loading team tasks...');
        const teamIds = userTeams.map(team => team.id);
        
        const { data: teamTasks, error: teamTasksError } = await supabase
          .from('kanban_tasks')
          .select('*')
          .eq('task_type', 'team')
          .in('team_id', teamIds)
          .or(`user_id.eq.${user.id},assigned_to.cs.["${user.id}"]`)
          .eq('is_archived', false)
          .neq('status', 'done')
          .order('created_at', { ascending: false });

        if (teamTasksError) {
          logger.error('❌ Team tasks error:', teamTasksError);
          throw teamTasksError;
        }
        
        if (teamTasks) {
          allTasks = [...allTasks, ...teamTasks];
        }
      }

      logger.log('📊 Fetched ALL user tasks for filtering:', {
        personalTasks: allTasks.filter(t => t.task_type === 'personal').length,
        teamTasks: allTasks.filter(t => t.task_type === 'team').length,
        totalTasks: allTasks.length,
        teams: userTeams.length
      });

      setTasks(allTasks);

      // Step 4: Calculate base task counts
      setLoadingStep('Calculating counts...');
      const counts: TaskCount[] = [];
      
      // Personal tasks count
      const personalCount = allTasks.filter(t => t.task_type === 'personal').length;
      counts.push({
        id: 'personal',
        name: 'Personal Tasks',
        totalCount: personalCount
      });

      // Team task counts
      for (const team of userTeams) {
        const teamTaskCount = allTasks.filter(t => 
          (t.task_type === 'team' || t.task_type === 'product') && t.team_id === team.id
        ).length;
        counts.push({
          id: team.id,
          name: team.name,
          totalCount: teamTaskCount
        });
      }

      setTaskCounts(counts);
      setLoadingStep('Complete');
      setRetryAttempt(0); // Reset retry count on success

    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Failed to load tasks';
      logger.error('❌ Simplified tasks data fetch error:', fetchError);
      setError(errorMessage);
      
      // Don't show toast on authentication errors to avoid spam
      if (!errorMessage.includes('log in') && !errorMessage.includes('Company context')) {
        toast({
          title: "Loading Error",
          description: `Unable to load tasks: ${errorMessage}`,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user, currentCompany, authLoading, companyLoading, toast]);

  // Retry mechanism
  const retry = useCallback(() => {
    logger.log('🔄 useSimpleTasksData: Retrying fetch attempt', retryAttempt + 1);
    setRetryAttempt(prev => prev + 1);
    setError(null);
    fetchData();
  }, [fetchData, retryAttempt]);

  useEffect(() => {
    // Add timeout mechanism for stuck states
    const timeoutId = setTimeout(() => {
      if (loading && !authLoading && !companyLoading) {
        logger.warn('⚠️ Tasks loading timeout after 10 seconds');
        setError('Loading timeout - please try refreshing the page');
        setLoading(false);
      }
    }, 10000);

    fetchData();

    return () => clearTimeout(timeoutId);
  }, [fetchData, loading, authLoading, companyLoading]);

  return {
    tasks,
    teams,
    taskCounts,
    loading: loading || authLoading || companyLoading,
    error,
    loadingStep,
    refetch: fetchData,
    retry,
    retryAttempt
  };
};
