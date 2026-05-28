import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedKanbanTask } from '@/types/tasks';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { logger } from '@/utils/logger';

export const useUnifiedKanbanTasksData = (selectedTeamIds: string[] = [], showArchived: boolean = false) => {
  const [tasks, setTasks] = useState<UnifiedKanbanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('fast_tasks')
        .select('*')
        .eq('is_deleted', false)
        .eq('company_id', currentCompany?.id);

      if (selectedTeamIds.length > 0) {
        query = query.in('team_id', selectedTeamIds);
      }

      if (!showArchived) {
        query = query.eq('is_archived', false);
      }

      const { data, error } = await query;

      if (error) {
        logger.error("Error fetching tasks:", error);
        setError(error);
      } else {
        setTasks(data || []);
      }
    } catch (err: any) {
      logger.error("Unexpected error fetching tasks:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentCompany) {
      fetchTasks();
    }
  }, [selectedTeamIds, currentCompany, showArchived]);

  return {
    tasks,
    loading,
    error,
    setTasks,
    fetchTasks
  };
};
