import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface MigrationStats {
  totalTasks: number;
  personalTasks: number;
  teamTasks: number;
  productTasks: number;
  feedbackTasks: number;
  migratedTeamTasks: number;
  multiAssignTasks: number;
  orderedTasks: number;
}

export const useTaskMigrationVerification = () => {
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyMigration = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('fast_tasks')
          .select(`
            id,
            task_type,
            source,
            assigned_to,
            order_position
          `);

        if (error) throw error;

        const stats: MigrationStats = {
          totalTasks: data.length,
          personalTasks: data.filter(t => t.task_type === 'personal').length,
          teamTasks: data.filter(t => t.task_type === 'team').length,
          productTasks: data.filter(t => t.task_type === 'product').length,
          feedbackTasks: data.filter(t => t.source === 'feedback-widget').length,
          migratedTeamTasks: data.filter(t => t.source === 'team_tasks_migration').length,
          multiAssignTasks: data.filter(t => t.assigned_to && Array.isArray(t.assigned_to) && t.assigned_to.length > 1).length,
          orderedTasks: data.filter(t => t.order_position !== null).length
        };

        setStats(stats);
        
        logger.log('✅ Task Migration Verification:', stats);
        
      } catch (err) {
        logger.error('❌ Migration verification failed:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    verifyMigration();
  }, []);

  return {
    stats,
    loading,
    error,
    isSuccessful: stats?.totalTasks && stats.totalTasks > 1400 // Expected >1400 tasks
  };
};