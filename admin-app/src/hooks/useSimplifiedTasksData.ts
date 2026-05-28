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
  status: 'todo' | 'in-progress' | 'done';
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

// Define the expected shape of the team_members query result
interface TeamMemberResult {
  team_id: string;
  teams: {
    id: string;
    name: string;
    company_id: string;
  }[] | null;
}

export const useSimplifiedTasksData = (selectedTeamIds: string[]) => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const { toast } = useToast();
  
  const [tasks, setTasks] = useState<SimpleTask[]>([]);
  const [teams, setTeams] = useState<SimpleTeam[]>([]);
  const [taskCounts, setTaskCounts] = useState<TaskCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState('Initializing...');

  const fetchData = useCallback(async () => {
    if (!user || !currentCompany) {
      setTasks([]);
      setTeams([]);
      setTaskCounts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Step 1: Load personal tasks first (fastest)
      setLoadingStep('Loading personal tasks...');
      const personalTasksPromise = supabase
        .from('fast_tasks')
        .select('*')
        .eq('task_type', 'personal')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(50);

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

      if (personalTasksResult.error) throw personalTasksResult.error;
      if (teamsResult.error) throw teamsResult.error;

      // Process teams data with proper type handling
      const userTeams: SimpleTeam[] = [];
      
      if (teamsResult.data) {
        // Type the result data properly - cast to unknown first then to our type
        const teamMembersData = teamsResult.data as unknown as TeamMemberResult[];
        
        for (const teamMember of teamMembersData) {
          const teamsArray = teamMember.teams;
          
          // Handle teams as an array (Supabase returns relationships as arrays)
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

      // Step 3: Load team tasks for selected teams
      let allTasks: SimpleTask[] = personalTasksResult.data || [];
      
      const teamIds = selectedTeamIds.filter(id => id !== 'personal');
      if (teamIds.length > 0) {
        setLoadingStep('Loading team tasks...');
        const { data: teamTasks, error: teamTasksError } = await supabase
          .from('fast_tasks')
          .select('*')
          .eq('task_type', 'team')
          .in('team_id', teamIds)
          .eq('is_deleted', false)
          .eq('is_archived', false)
          .order('created_at', { ascending: false })
          .limit(50);

        if (teamTasksError) throw teamTasksError;
        
        if (teamTasks) {
          allTasks = [...allTasks, ...teamTasks];
        }
      }

      setTasks(allTasks);

      // Step 4: Calculate task counts
      setLoadingStep('Calculating counts...');
      const counts: TaskCount[] = [];
      
      // Personal tasks count
      if (selectedTeamIds.includes('personal')) {
        const personalCount = (personalTasksResult.data || []).length;
        counts.push({
          id: 'personal',
          name: 'Personal Tasks',
          totalCount: personalCount
        });
      }

      // Team task counts
      for (const team of userTeams) {
        if (selectedTeamIds.includes(team.id)) {
          const teamTaskCount = allTasks.filter(task => task.team_id === team.id).length;
          counts.push({
            id: team.id,
            name: team.name,
            totalCount: teamTaskCount
          });
        }
      }

      setTaskCounts(counts);
      setLoadingStep('Complete');

    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Failed to load tasks';
      logger.error('❌ Simplified tasks data fetch error:', fetchError);
      setError(errorMessage);
      
      toast({
        title: "Loading Error",
        description: `Unable to load tasks: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, currentCompany, selectedTeamIds, toast]);

  useEffect(() => {
    // Add timeout mechanism
    const timeoutId = setTimeout(() => {
      if (loading) {
        logger.warn('⚠️ Tasks loading timeout after 10 seconds');
        setError('Loading timeout - please try refreshing the page');
        setLoading(false);
      }
    }, 10000);

    fetchData();

    return () => clearTimeout(timeoutId);
  }, [fetchData, loading]);

  return {
    tasks,
    teams,
    taskCounts,
    loading,
    error,
    loadingStep,
    refetch: fetchData
  };
};