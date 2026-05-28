
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

export const useSimpleTasks = () => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const { toast } = useToast();
  
  const [tasks, setTasks] = useState<SimpleTask[]>([]);
  const [teams, setTeams] = useState<SimpleTeam[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(['personal']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) {
      setError('Please log in to view your tasks');
      setLoading(false);
      return;
    }

    if (!currentCompany) {
      setError('Company context required. Please select a company.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Fetch personal tasks
      const { data: personalTasks, error: personalError } = await supabase
        .from('kanban_tasks')
        .select('*')
        .eq('task_type', 'personal')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (personalError) throw personalError;

      // Fetch user teams
      const { data: teamMemberships, error: teamsError } = await supabase
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

      if (teamsError) throw teamsError;

      // Process teams
      const userTeams: SimpleTeam[] = [];
      if (teamMemberships) {
        for (const membership of teamMemberships) {
          const teamsArray = membership.teams as any;
          if (Array.isArray(teamsArray)) {
            for (const team of teamsArray) {
              if (team && team.company_id === currentCompany?.id) {
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

      // Fetch team tasks
      let allTasks = personalTasks || [];
      if (userTeams.length > 0) {
        const teamIds = userTeams.map(team => team.id);
        const { data: teamTasks, error: teamTasksError } = await supabase
          .from('kanban_tasks')
          .select('*')
          .eq('task_type', 'team')
          .in('team_id', teamIds)
          .eq('is_archived', false)
          .order('created_at', { ascending: false });

        if (teamTasksError) throw teamTasksError;
        
        if (teamTasks) {
          allTasks = [...allTasks, ...teamTasks];
        }
      }

      setTasks(allTasks);

    } catch (error) {
      logger.error('Error fetching tasks:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load tasks';
      setError(errorMessage);
      toast({
        title: "Error loading tasks",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, currentCompany, toast]);

  const addTask = useCallback(async (title: string, description: string, teamSelection: { type: 'personal' | 'team'; teamId?: string }) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('kanban_tasks')
        .insert({
          title,
          description,
          task_type: teamSelection.type,
          user_id: user.id,
          team_id: teamSelection.teamId,
          status: 'todo',
          source: 'manual',
          is_archived: false
        });

      if (error) throw error;
      
      await fetchData(); // Refresh data
      
      toast({
        title: "Task created",
        description: "Your task has been added successfully.",
      });
    } catch (error) {
      logger.error('Error adding task:', error);
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    }
  }, [user, fetchData, toast]);

  const updateTaskStatus = useCallback(async (taskId: string, status: 'todo' | 'inprogress' | 'done') => {
    try {
      const { error } = await supabase
        .from('kanban_tasks')
        .update({ status })
        .eq('id', taskId);

      if (error) throw error;
      
      await fetchData(); // Refresh data
    } catch (error) {
      logger.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task status.",
        variant: "destructive",
      });
    }
  }, [fetchData, toast]);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('kanban_tasks')
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .eq('id', taskId);

      if (error) throw error;
      
      await fetchData(); // Refresh data
      
      toast({
        title: "Task archived",
        description: "Task has been archived successfully.",
      });
    } catch (error) {
      logger.error('Error archiving task:', error);
      toast({
        title: "Error",
        description: "Failed to archive task.",
        variant: "destructive",
      });
    }
  }, [fetchData, toast]);

  // Filter tasks based on selected teams
  const filteredTasks = tasks.filter(task => {
    if (task.task_type === 'personal') {
      return selectedTeamIds.includes('personal');
    }
    if (task.task_type === 'team' && task.team_id) {
      return selectedTeamIds.includes(task.team_id);
    }
    return false;
  });

  // Calculate task counts
  const taskCounts = {
    personal: tasks.filter(t => t.task_type === 'personal').length,
    teams: teams.reduce((acc, team) => {
      acc[team.id] = tasks.filter(t => t.team_id === team.id).length;
      return acc;
    }, {} as Record<string, number>)
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    tasks: filteredTasks,
    allTasks: tasks,
    teams,
    selectedTeamIds,
    setSelectedTeamIds,
    taskCounts,
    loading,
    error,
    addTask,
    updateTaskStatus,
    deleteTask,
    refetch: fetchData
  };
};
