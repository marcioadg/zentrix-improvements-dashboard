
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface ConsolidatedTask {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'inprogress' | 'done';
  task_type: 'personal' | 'team' | 'product';
  team_id?: string;
  user_id?: string;
  assigned_to?: string[];
  due_date?: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}

interface UseConsolidatedTasksResult {
  tasks: ConsolidatedTask[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  debugInfo: {
    userAuthenticated: boolean;
    hasPermissions: boolean;
    rlsEnabled: boolean;
  };
}

export const useConsolidatedTasks = (selectedTeamIds: string[]): UseConsolidatedTasksResult => {
  const [tasks, setTasks] = useState<ConsolidatedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState({
    userAuthenticated: false,
    hasPermissions: false,
    rlsEnabled: true // RLS is now enabled
  });
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      setError(null);
      setDebugInfo({ userAuthenticated: false, hasPermissions: false, rlsEnabled: true });
      return;
    }

    try {
      setLoading(true);
      setError(null);

      logger.debug('useConsolidatedTasks: Fetching tasks with RLS', { 
        userId: user.id, 
        selectedTeamIds 
      });

      // RLS-based query - security is handled by database policies
      let query = supabase
        .from('kanban_tasks')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      // Build filter conditions based on selected teams (UI filtering only)
      if (selectedTeamIds.length > 0) {
        const personalSelected = selectedTeamIds.includes('personal');
        const teamIds = selectedTeamIds.filter(id => id !== 'personal');

        if (personalSelected && teamIds.length > 0) {
          // Both personal and team tasks - RLS ensures user can only see their data
          query = query.or(`task_type.eq.personal,and(task_type.eq.team,team_id.in.(${teamIds.join(',')}))`);
        } else if (personalSelected) {
          // Only personal tasks - RLS ensures user only sees their personal tasks
          query = query.eq('task_type', 'personal');
        } else if (teamIds.length > 0) {
          // Only team tasks - RLS ensures user only sees teams they belong to
          query = query.eq('task_type', 'team').in('team_id', teamIds);
        }
      } else {
        // No teams selected, show personal tasks only - RLS handles user filtering
        query = query.eq('task_type', 'personal');
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      const consolidatedTasks: ConsolidatedTask[] = (data || []).map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status as 'todo' | 'inprogress' | 'done',
        task_type: task.task_type as 'personal' | 'team' | 'product',
        team_id: task.team_id,
        user_id: task.user_id,
        assigned_to: task.assigned_to,
        due_date: task.due_date,
        created_at: task.created_at,
        updated_at: task.updated_at,
        is_archived: task.is_archived
      }));

      logger.info('useConsolidatedTasks: Successfully fetched tasks', { 
        count: consolidatedTasks.length,
        selectedTeamIds
      });

      setTasks(consolidatedTasks);
      setError(null);
      
      // Update debug info to reflect successful RLS operation
      setDebugInfo({ 
        userAuthenticated: true, 
        hasPermissions: true, 
        rlsEnabled: true 
      });
    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Failed to fetch tasks';
      logger.error('useConsolidatedTasks: RLS-based fetch error', { 
        error: fetchError, 
        userId: user.id, 
        selectedTeamIds 
      });
      
      setError(errorMessage);
      
      // Show toast for all fetch errors (RLS will handle permissions automatically)
      toast({
        title: "Tasks Loading Error",
        description: `Unable to load tasks: ${errorMessage}`,
        variant: "destructive",
      });
      
      setTasks([]);
      setDebugInfo({ 
        userAuthenticated: true, 
        hasPermissions: false, 
        rlsEnabled: true 
      });
    } finally {
      setLoading(false);
    }
  }, [user, selectedTeamIds, toast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    debugInfo
  };
};
