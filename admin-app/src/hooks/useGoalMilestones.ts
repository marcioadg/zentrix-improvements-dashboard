import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { syncStatusFromProgress, triggerCelebrationSafely } from '@/lib/goalProgressStatusSync';
import { logger } from '@/lib/logger';

export interface GoalMilestone {
  id: string;
  goal_id: string;
  title: string;
  description?: string;
  due_date?: string;
  progress?: number; // Add progress field
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const useGoalMilestones = (goalId?: string, progressValues?: {[key: string]: number}, enabled: boolean = true) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use React Query for milestones - matches Dashboard pattern
  const { data: milestones = [], isLoading: loading } = useQuery({
    queryKey: ['goal-milestones', goalId],
    queryFn: async () => {
      if (!goalId || goalId.startsWith('temp-')) {
        return [];
      }

      const { data, error } = await supabase
        .from('goal_milestones')
        .select('*')
        .eq('goal_id', goalId)
        .order('display_order', { ascending: true });

      if (error) {
        logger.error('❌ useGoalMilestones: Error loading milestones', {
          goalId,
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      return data || [];
    },
    enabled: enabled && !!goalId && !goalId.startsWith('temp-'),
  });

  const addMilestone = async (title: string, description?: string, dueDate?: string, progress: number = 0) => {
    if (!goalId) return false;

    logger.log('🎯 Adding milestone for goal ID:', goalId);
    
    // Verify goal exists before adding milestone (check both goals and team_goals tables)
    let goalExists = null;
    let goalError = null;
    
    // First check team_goals table
    const { data: teamGoal, error: teamGoalError } = await supabase
      .from('team_goals')
      .select('id, title')
      .eq('id', goalId)
      .maybeSingle();
    
    if (teamGoal) {
      goalExists = teamGoal;
    } else {
      // Goal not found in team_goals table (goals table is deprecated)
      logger.warn('Goal not found in team_goals table:', goalId);
      goalExists = null;
      goalError = null;
    }
    
    if (goalError || !goalExists) {
      logger.error('❌ Goal does not exist:', goalId, goalError);
      toast({
        title: "Error",
        description: "Goal not found. Please refresh the page and try again.",
        variant: "destructive",
      });
      return false;
    }
    
    logger.log('✅ Goal exists, proceeding with milestone creation:', goalExists);

    try {
      // Get the next display_order by finding the max in current milestones
      const maxOrder = milestones.length > 0 ? Math.max(...milestones.map(m => m.display_order || 0)) : 0;
      
      const { error } = await supabase
        .from('goal_milestones')
        .insert({
          goal_id: goalId,
          title,
          description,
          due_date: dueDate,
          progress,
          display_order: maxOrder + 1,
        });

      if (error) {
        logger.error('Error adding milestone:', error);
        throw error;
      }

      // Invalidate React Query cache - matches Dashboard pattern
      await queryClient.invalidateQueries({ queryKey: ['goal-milestones', goalId] });

      toast({
        title: "Milestone added",
        description: title,
      });

      return true;
    } catch (error) {
      logger.error('Error adding milestone:', error);
      toast({
        title: "Error",
        description: "Failed to add milestone",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateMilestone = async (milestoneId: string, updates: Partial<GoalMilestone>) => {
    try {
      // Optimistic update - instant UI feedback
      queryClient.setQueryData<GoalMilestone[]>(
        ['goal-milestones', goalId],
        (old) => old?.map(m => m.id === milestoneId ? { ...m, ...updates } : m) || []
      );
      
      // 1. Update database
      const { error } = await supabase
        .from('goal_milestones')
        .update(updates)
        .eq('id', milestoneId);

      if (error) {
        logger.error('Error updating milestone:', error);
        throw error;
      }

      // BIDIRECTIONAL SYNC: If progress was updated, sync parent goal status
      if (updates.progress !== undefined && goalId) {
        try {
          // 1. Fetch parent goal
          const { data: parentGoal, error: goalError } = await supabase
            .from('team_goals')
            .select('id, status, progress')
            .eq('id', goalId)
            .single();
          
          if (goalError || !parentGoal) {
            logger.warn('Could not fetch parent goal for milestone sync:', goalError);
          } else {
            // 2. Fetch all milestones to calculate new progress
            const { data: allMilestones, error: milestonesError } = await supabase
              .from('goal_milestones')
              .select('id, progress')
              .eq('goal_id', goalId);
            
            if (!milestonesError && allMilestones && allMilestones.length > 0) {
              // 3. Calculate new average progress
              const totalProgress = allMilestones.reduce((sum, m) => {
                if (m.id === milestoneId) {
                  return sum + updates.progress!; // Use new value
                }
                return sum + (m.progress ?? 0);
              }, 0);
              const newProgress = Math.round(totalProgress / allMilestones.length);
              
              // 4. Check if status should change
              const syncResult = syncStatusFromProgress(
                parentGoal.progress ?? 0,
                newProgress,
                parentGoal.status
              );
              
              // 5. Update goal status if needed (only if status actually changes)
              if (syncResult.status && syncResult.status !== parentGoal.status) {
                logger.debug('🔄 Milestone progress change triggers goal status update:', {
                  goalId,
                  oldStatus: parentGoal.status,
                  newStatus: syncResult.status,
                  oldProgress: parentGoal.progress,
                  newProgress
                });
                
                await supabase
                  .from('team_goals')
                  .update({
                    status: syncResult.status,
                    progress: newProgress,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', goalId);
                
                // Trigger celebration if needed
                if (syncResult.shouldCelebrate) {
                  triggerCelebrationSafely();
                }
                
                // Invalidate goal caches
                await queryClient.invalidateQueries({ queryKey: ['team-goals'] });
                await queryClient.invalidateQueries({ queryKey: ['company-goals'] });
              }
            }
          }
        } catch (error) {
          logger.error('Error syncing goal status from milestone update:', error);
          // Don't fail the milestone update if sync fails
        }
      }
      
      // Invalidate React Query cache - matches Dashboard pattern
      await queryClient.invalidateQueries({ queryKey: ['goal-milestones', goalId] });
      
      return true;
    } catch (error) {
      logger.error('Error updating milestone:', error);
      toast({
        title: "Error",
        description: "Failed to update milestone",
        variant: "destructive",
      });
      return false;
    }
  };


  const deleteMilestone = async (milestoneId: string) => {
    try {
      const { error } = await supabase
        .from('goal_milestones')
        .delete()
        .eq('id', milestoneId);

      if (error) {
        logger.error('Error deleting milestone:', error);
        throw error;
      }
      
      // Invalidate React Query cache - matches Dashboard pattern
      await queryClient.invalidateQueries({ queryKey: ['goal-milestones', goalId] });
      
      toast({
        title: "Milestone deleted",
        description: "Milestone has been removed successfully",
      });
      
      return true;
    } catch (error) {
      logger.error('Error deleting milestone:', error);
      toast({
        title: "Error",
        description: "Failed to delete milestone",
        variant: "destructive",
      });
      return false;
    }
  };

  const reorderMilestones = async (milestoneIds: string[]) => {
    try {
      // Update the database using display_order, just like goals reordering
      const updates = milestoneIds.map((id, index) => ({
        id,
        display_order: index + 1,
        updated_at: new Date().toISOString()
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('goal_milestones')
          .update({
            display_order: update.display_order,
            updated_at: update.updated_at
          })
          .eq('id', update.id);

        if (error) {
          logger.error('Error updating milestone order:', error);
          throw error;
        }
      }

      // Invalidate React Query cache - matches Dashboard pattern
      await queryClient.invalidateQueries({ queryKey: ['goal-milestones', goalId] });

      toast({
        title: "Milestones reordered",
        description: "Milestone order updated successfully",
      });
      
      return true;
    } catch (error) {
      logger.error('Error reordering milestones:', error);
      toast({
        title: "Error",
        description: "Failed to reorder milestones",
        variant: "destructive",
      });
      return false;
    }
  };

  // No need for custom event listeners - React Query handles cache invalidation

  // Calculate progress based on actual progress values
  const progress = useMemo(() => {
    if (milestones.length === 0) return 0;
    
    let totalProgress = 0;
    let validMilestones = 0;
    
    milestones.forEach(milestone => {
      // Use actual progress value if available
      let milestoneProgress = 0;
      
      if (progressValues && progressValues[milestone.id] !== undefined) {
        milestoneProgress = progressValues[milestone.id];
      } else if (milestone.progress !== undefined && milestone.progress !== null) {
        // Use saved progress from database
        milestoneProgress = milestone.progress;
      }
      
      totalProgress += milestoneProgress;
      validMilestones++;
    });
    
    return validMilestones > 0 ? Math.round(totalProgress / validMilestones) : 0;
  }, [milestones, progressValues]);

  const upcomingMilestones = milestones.filter(m => 
    m.due_date && new Date(m.due_date) > new Date()
  );

  const overdueMilestones = milestones.filter(m => 
    m.due_date && new Date(m.due_date) < new Date()
  );

  return {
    milestones,
    loading,
    progress,
    upcomingMilestones,
    overdueMilestones,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    reorderMilestones,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['goal-milestones', goalId] }),
  };
};