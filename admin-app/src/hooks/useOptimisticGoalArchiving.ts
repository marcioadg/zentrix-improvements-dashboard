import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TeamGoal } from './useTeamGoals';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export const useOptimisticGoalArchiving = (
  goals: TeamGoal[],
  setGoals: React.Dispatch<React.SetStateAction<TeamGoal[]>>
) => {
  const [archivingGoals, setArchivingGoals] = useState<Set<string>>(new Set());

  const archiveGoalOptimistically = useCallback(async (goalId: string): Promise<boolean> => {
    const goalToArchive = goals.find(g => g.id === goalId);
    if (!goalToArchive) return false;

    try {
      // 1. Add to archiving set for loading state
      setArchivingGoals(prev => new Set([...prev, goalId]));

      // 2. Optimistically remove from UI immediately
      setGoals(prev => prev.filter(g => g.id !== goalId));

      // 3. Show optimistic feedback with undo option
      toast.success(`"${goalToArchive.title}" archived`, {
        action: {
          label: "Undo",
          onClick: () => undoArchive(goalId, goalToArchive)
        }
      });

      // 4. Perform actual database update
      const updateData = { 
        archived: true,
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      logger.log('🔍 TEAM GOALS - Archiving with data:', updateData);
      logger.log('🔍 TEAM GOALS - Goal to archive:', goalToArchive);
      
      const { data, error } = await supabase
        .from('team_goals')
        .update(updateData)
        .eq('id', goalId)
        .select();

      logger.log('🔍 TEAM GOALS - Update response:', { data, error });
      
      if (error) throw error;

      // 5. Success - remove from archiving set
      setArchivingGoals(prev => {
        const newSet = new Set(prev);
        newSet.delete(goalId);
        return newSet;
      });

      return true;

    } catch (error) {
      logger.error('Error archiving goal:', error);
      
      // 6. Rollback optimistic update on error
      setGoals(prev => [goalToArchive, ...prev]);
      setArchivingGoals(prev => {
        const newSet = new Set(prev);
        newSet.delete(goalId);
        return newSet;
      });

      toast.error("Failed to archive goal. Please try again.");
      return false;
    }
  }, [goals, setGoals]);

  const undoArchive = useCallback(async (goalId: string, originalGoal: TeamGoal) => {
    try {
      // 1. Optimistically restore goal to UI
      setGoals(prev => [originalGoal, ...prev]);

      // 2. Update database to restore
      const { error } = await supabase
        .from('team_goals')
        .update({ 
          archived: false,
          archived_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId);

      if (error) throw error;

      toast.success(`"${originalGoal.title}" restored`);

    } catch (error) {
      logger.error('Error restoring goal:', error);
      
      // Remove from UI again if restore failed
      setGoals(prev => prev.filter(g => g.id !== goalId));
      
      toast.error("Failed to restore goal");
    }
  }, [setGoals]);

  return {
    archiveGoalOptimistically,
    archivingGoals,
    undoArchive
  };
};