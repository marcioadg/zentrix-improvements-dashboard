import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserTeams } from '@/hooks/useUserTeams';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { useGlobalReorderLock } from '@/hooks/useGlobalReorderLock';
import { logger } from '@/lib/logger';

export interface Goal {
  id: string;
  title: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'on_track' | 'at_risk' | 'off_track' | 'complete';
  target_date?: string;
  owner_id: string;
  team_id: string;
  is_company_goal: boolean;
  archived: boolean;
  progress?: number;
  display_order?: number;
  created_at: string;
  updated_at: string;
}

// Module-level cache to prevent flash on re-mount
let goalsCache: { companyId: string; goals: Goal[] } | null = null;

export const useGoals = () => {
  const { currentCompany } = useMultiCompany();
  const cachedGoals = goalsCache?.companyId === currentCompany?.id ? goalsCache.goals : [];
  const [goals, setGoals] = useState<Goal[]>(cachedGoals);
  const [loading, setLoading] = useState(cachedGoals.length === 0);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { teams } = useUserTeams();
  const { isVisible: isPageVisible, shouldRefetchOnVisibility } = usePageVisibility();
  const { isGloballyReordering } = useGlobalReorderLock();
  const previousVisibleRef = useRef(isPageVisible);
  
  // Get first team ID for personal goals
  const firstTeamId = teams.length > 0 ? teams[0].id : null;

  // Helper to ensure team is within current company
  const isTeamInCompany = (teamId: string) => {
    const t = teams.find((t) => t.id === teamId);
    return t && currentCompany ? t.company_id === currentCompany?.id : false;
  };

  const loadGoals = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (!currentCompany) {
        logger.debug('No company selected, clearing goals data');
        setGoals([]);
        setLoading(false);
        return;
      }

      logger.debug('Loading goals for selected company');
      if (teams.length === 0) {
        logger.debug('User has no teams, showing no goals');
        setGoals([]);
        setLoading(false);
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('team_goals')
        .select('*')
        .eq('owner_id', user.id)
        .eq('is_company_goal', false)
        .in('team_id', teams.map(t => t.id))
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error loading goals:', error);
        throw error;
      }

      logger.debug('Goals data retrieved from database', { count: data?.length || 0 });

      // Map the data with proper typing
      const typedGoals: Goal[] = (data || []).map(goal => ({
        ...goal,
        status: goal.status as Goal['status']
      }));

      logger.debug('Goals processed and filtered', { count: typedGoals.length });
      setGoals(typedGoals);
      if (currentCompany?.id) {
        goalsCache = { companyId: currentCompany.id, goals: typedGoals };
      }
    } catch (error) {
      logger.error('Error loading goals:', error);
      toast({
        title: "Error",
        description: "Failed to load goals",
        variant: "destructive",
      });
      setGoals([]);
    } finally {
      setLoading(false);
    }
  };

  const addGoal = async (title: string, description?: string, targetDate?: string) => {
    try {
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      // Check company context
      if (!currentCompany) {
        logger.debug('Attempt to add goal without company context');
        toast({
          title: "Error",
          description: "No company selected.",
          variant: "destructive",
        });
        return false;
      }

      setIsCreating(true);
      logger.debug('Creating new goal');

      // Trigger optimistic update in onboarding context by dispatching event
      const optimisticEvent = new CustomEvent('optimistic-goal-creation');
      window.dispatchEvent(optimisticEvent);

      // Create optimistic goal for immediate UI feedback
      const optimisticGoal: Goal = {
        id: `temp_${Date.now()}`,
        title,
        description: description || '',
        status: 'on_track',
        target_date: targetDate || '',
        owner_id: user.id,
        team_id: firstTeamId || '',
        is_company_goal: false,
        archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Add optimistic goal immediately
      setGoals(prev => [optimisticGoal, ...prev]);
      
      const { data, error } = await supabase
        .from('team_goals')
        .insert({
          title,
          description,
          owner_id: user.id,
          team_id: firstTeamId,
          target_date: targetDate,
          status: 'on_track',
          is_company_goal: false,
          archived: false,
          display_order: 1,
          progress: 0
        })
        .select()
        .single();

      if (error) {
        logger.error('Error adding goal:', error);
        throw error;
      }

      logger.debug('Goal created successfully');
      
      // Replace optimistic goal with real data
      setGoals(prev => prev.map(goal => 
        goal.id === optimisticGoal.id ? {
          ...data,
          status: data.status as Goal['status']
        } : goal
      ));

      toast({
        title: "Goal added",
        description: title,
      });

      return true;
    } catch (error) {
      logger.error('Error adding goal:', error);
      
      // Remove optimistic goal on error
      setGoals(prev => prev.filter(goal => !goal.id.startsWith('temp_')));
      
      toast({
        title: "Error",
        description: "Failed to add goal",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsCreating(false);
    }
  };

  const updateGoal = async (goalId: string, updates: Partial<Goal>) => {
    // Store original goal for potential rollback
    const originalGoal = goals.find(goal => goal.id === goalId);
    if (!originalGoal) {
      logger.error('Goal not found for update');
      toast({
        title: "Error",
        description: "Goal not found",
        variant: "destructive",
      });
      return false;
    }

    logger.debug('Updating goal');

    // Apply optimistic update immediately
    setGoals(prev => prev.map(goal => 
      goal.id === goalId 
        ? { ...goal, ...updates, updated_at: new Date().toISOString() }
        : goal
    ));

    try {
      const { error } = await supabase
        .from('team_goals')
        .update(updates)
        .eq('id', goalId);

      if (error) {
        logger.error('Error updating goal:', error);
        throw error;
      }
      
      logger.debug('Goal updated successfully');
      return true;
    } catch (error) {
      logger.error('Error updating goal:', error);
      
      // Rollback optimistic update on error
      setGoals(prev => prev.map(goal => 
        goal.id === goalId ? originalGoal : goal
      ));
      
      toast({
        title: "Error",
        description: "Failed to update goal",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateGoalStatus = async (goalId: string, newStatus: Goal['status']) => {
    logger.log('🚀 [updateGoalStatus] Called with:', { goalId, newStatus });
    
    try {
      const { error } = await supabase
        .from('team_goals')
        .update({ status: newStatus })
        .eq('id', goalId);

      if (error) {
        logger.error('Error updating goal status:', error);
        throw error;
      }
      
      logger.log('✅ [updateGoalStatus] Status updated in database');
      
      // If goal is marked as complete, check for milestones and set them all to 100%
      if (newStatus === 'complete') {
        logger.log('🎯 [MILESTONE UPDATE] Goal marked complete, checking for milestones:', goalId);
        
        const { data: milestones, error: milestonesQueryError } = await supabase
          .from('goal_milestones')
          .select('id, title, progress')
          .eq('goal_id', goalId);
        
        logger.log('📊 [MILESTONE UPDATE] Query result:', { milestones, milestonesQueryError });
        
        if (milestonesQueryError) {
          logger.error('❌ [MILESTONE UPDATE] Error querying milestones:', milestonesQueryError);
          toast({
            title: "Warning",
            description: "Could not check milestones for this goal",
            variant: "destructive"
          });
        } else if (milestones && milestones.length > 0) {
          logger.log(`📝 [MILESTONE UPDATE] Found ${milestones.length} milestones:`, milestones);
          
          const { data: updateData, error: updateError } = await supabase
            .from('goal_milestones')
            .update({ progress: 100 })
            .eq('goal_id', goalId)
            .select('id, title, progress');
          
          logger.log('🔄 [MILESTONE UPDATE] Update result:', { updateData, updateError });
          
          if (updateError) {
            logger.error('❌ [MILESTONE UPDATE] Failed to update milestones:', updateError);
            toast({
              title: "Warning",
              description: `Could not update ${milestones.length} milestone(s) to 100%`,
              variant: "destructive"
            });
          } else {
            logger.log('✅ [MILESTONE UPDATE] Successfully updated milestones to 100%:', updateData);
            toast({
              title: "Goal Completed!",
              description: `${milestones.length} milestone(s) automatically set to 100%`,
            });
          }
        } else {
          logger.log('ℹ️ [MILESTONE UPDATE] No milestones found for this goal');
        }
      } else {
        logger.log('ℹ️ [updateGoalStatus] Status is not "complete", skipping milestone update. Status:', newStatus);
      }
      
      await loadGoals();
      
      toast({
        title: "Goal updated",
        description: "Goal status has been updated successfully",
      });
      
      return true;
    } catch (error) {
      logger.error('Error updating goal status:', error);
      toast({
        title: "Error",
        description: "Failed to update goal status",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    // Only trigger on visibility CHANGE from hidden to visible
    if (isPageVisible && !previousVisibleRef.current) {
      // Only refetch if page was hidden for a significant time (5+ minutes)
      if (shouldRefetchOnVisibility()) {
        logger.debug('Page visible after extended absence, silent refreshing goals');
        loadGoals(true);
      } else {
        logger.debug('Page visible but data still fresh, skipping refresh');
      }
    } else if (isPageVisible && previousVisibleRef.current) {
      // Page was already visible, this is initial load or company change
      // Use silent refresh if we already have goals data to prevent flash
      loadGoals(goals.length > 0);
    }
    previousVisibleRef.current = isPageVisible;
    // eslint-disable-next-line
  }, [teams, currentCompany?.id, isPageVisible]);

  // Real-time subscription for goals - stays connected in background
  useEffect(() => {
    logger.debug('Setting up goals real-time subscription');
    const channel = supabase
      .channel('goals_changes')
      .on(
        'postgres_changes',
         {
           event: '*',
           schema: 'public',
           table: 'team_goals',
           filter: 'is_company_goal=eq.false'
         },
         async (payload) => {
           logger.debug('Goals real-time update received', { eventType: payload.eventType });
           
           // Block real-time updates during ANY reordering operations globally
           if (isGloballyReordering()) {
             logger.log('🚫 useGoals: Real-time update blocked due to global reordering lock');
             return;
           }
           
           // Only skip reloads if actively creating AND it's an INSERT event
           if (isCreating && payload.eventType === 'INSERT') {
             logger.debug('Skipping reload - actively creating goal');
             return;
           }
           
           // Skip processing if page is not visible to prevent unnecessary re-renders
           if (!isPageVisible) {
             logger.debug('Skipping reload - page not visible');
             return;
           }
          
          // Reload goals to reflect changes (silent to prevent flash)
          logger.debug('Reloading goals due to real-time update');
          await loadGoals(true);
        }
      )
      .subscribe((status) => {
        logger.debug('Goals subscription status changed', { status });
        if (status === 'SUBSCRIBED') {
          logger.debug('Goals real-time subscription ready');
        }
      });

    return () => {
      logger.debug('Cleaning up goals subscription');
      supabase.removeChannel(channel);
    };
  }, [currentCompany?.id, isCreating]);

  return {
    goals,
    loading,
    addGoal,
    updateGoal,
    updateGoalStatus,
    refetch: loadGoals,
  };
};
