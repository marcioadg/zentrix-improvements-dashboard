import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserTeams } from '@/hooks/useUserTeams';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useGlobalReorderLock } from '@/hooks/useGlobalReorderLock';
import { syncProgressFromStatus, triggerCelebrationSafely } from '@/lib/goalProgressStatusSync';
import { logger } from '@/utils/logger';

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
  created_at: string;
  updated_at: string;
}

export const useOptimizedGoals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const teamsRef = useRef<any[]>([]);
  const { toast } = useToast();
  const { teams } = useUserTeams();
  const { currentCompany } = useMultiCompany();
  const { isGloballyReordering } = useGlobalReorderLock();

  // Update teams ref without triggering re-renders
  useEffect(() => {
    teamsRef.current = teams;
  }, [teams]);

  const loadGoals = useCallback(async (options?: { silent?: boolean }) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    const silent = options?.silent === true;
    if (!silent) setLoading(true);
    try {
      if (!currentCompany) {
        setGoals([]);
        if (!silent) setLoading(false);
        return;
      }
      if (teamsRef.current.length === 0) {
        setGoals([]);
        if (!silent) setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('team_goals')
        .select(`
          *,
          teams!inner(
            company_id
          )
        `)
        .eq('teams.company_id', currentCompany?.id)
        .eq('is_company_goal', false)
        .order('created_at', { ascending: false });

      if (abortControllerRef.current?.signal.aborted) return;

      if (error) {
        logger.error('Error loading goals:', error);
        throw error;
      }

      const typedGoals: Goal[] = (data || []).map(goal => ({
        ...goal,
        status: goal.status as Goal['status']
      }));

      setGoals(typedGoals);
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      logger.error('Error loading goals:', error);
      toast({
        title: "Error",
        description: "Failed to load goals",
        variant: "destructive",
      });
      setGoals([]);
    } finally {
      if (!abortControllerRef.current?.signal.aborted && !silent) {
        setLoading(false);
      }
    }
  }, [currentCompany, toast]);

  const addGoal = useCallback(async (title: string, description?: string, targetDate?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      if (!currentCompany) {
        toast({
          title: "Error",
          description: "No company selected.",
          variant: "destructive",
        });
        return false;
      }
      
      const { error } = await supabase
        .from('team_goals')
        .insert({
          title,
          description,
          target_date: targetDate,
          status: 'on_track',
          owner_id: user.id,
          team_id: teams.length > 0 ? teams[0].id : '',
          is_company_goal: false,
          archived: false,
          progress: 0
        });

      if (error) {
        logger.error('Error adding goal:', error);
        throw error;
      }

      // Don't fetch immediately - let real-time handle it
      toast({
        title: "Goal added",
        description: title,
      });

      return true;
    } catch (error) {
      logger.error('Error adding goal:', error);
      toast({
        title: "Error",
        description: "Failed to add goal",
        variant: "destructive",
      });
      return false;
    }
  }, [currentCompany, toast]);

  const updateGoal = useCallback(async (goalId: string, updates: Partial<Goal>) => {
    try {
      const currentGoal = goals.find(g => g.id === goalId);
      
      // Progress-driven completion: when progress reaches 100%, auto-complete
      if (currentGoal && updates.progress === 100 && currentGoal.status !== 'complete') {
        logger.log('🎯 Progress reached 100% - auto-completing goal');
        updates.status = 'complete';
        
        // Update ALL milestones to 100%
        const { error: milestonesError } = await supabase
          .from('goal_milestones')
          .update({ progress: 100, updated_at: new Date().toISOString() })
          .eq('goal_id', goalId);
        
        if (milestonesError) {
          logger.error('Error updating milestones:', milestonesError);
        } else {
          window.dispatchEvent(new CustomEvent('milestone-cache-invalidate', { 
            detail: { goalId } 
          }));
        }
        
        // Celebrate with cooldown
        triggerCelebrationSafely();
      }
      
      // Revert completion: when progress drops below 100% from complete status
      if (currentGoal && updates.progress !== undefined && updates.progress < 100 && currentGoal.status === 'complete') {
        logger.log('↩️ Progress dropped below 100% from complete - reverting to on_track');
        updates.status = 'on_track';
      }
      
      // Status-driven completion: when status changes to complete, ensure progress is 100%
      if (currentGoal && updates.status === 'complete' && currentGoal.progress !== 100) {
        logger.log('✅ Status set to complete - ensuring progress is 100%');
        updates.progress = 100;
        
        // Update ALL milestones to 100%
        const { error: milestonesError } = await supabase
          .from('goal_milestones')
          .update({ progress: 100, updated_at: new Date().toISOString() })
          .eq('goal_id', goalId);
        
        if (milestonesError) {
          logger.error('Error updating milestones:', milestonesError);
        } else {
          window.dispatchEvent(new CustomEvent('milestone-cache-invalidate', { 
            detail: { goalId } 
          }));
        }
        
        // Celebrate with cooldown
        triggerCelebrationSafely();
      }

      // Optimistic update
      setGoals(prev =>
        prev.map(goal =>
          goal.id === goalId ? { ...goal, ...updates } : goal
        )
      );

      const { error } = await supabase
        .from('team_goals')
        .update(updates)
        .eq('id', goalId);

      if (error) {
        // Revert optimistic update on error
        await loadGoals();
        throw error;
      }
      
      return true;
    } catch (error) {
      logger.error('Error updating goal:', error);
      toast({
        title: "Error",
        description: "Failed to update goal",
        variant: "destructive",
      });
      return false;
    }
  }, [loadGoals, toast]);

  const updateGoalStatus = useCallback(async (goalId: string, newStatus: Goal['status']) => {
    try {
      // Optimistic update
      setGoals(prev =>
        prev.map(goal =>
          goal.id === goalId ? { ...goal, status: newStatus } : goal
        )
      );

      const { error } = await supabase
        .from('team_goals')
        .update({ status: newStatus })
        .eq('id', goalId);

      if (error) {
        // Revert optimistic update on error
        await loadGoals();
        throw error;
      }
      
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
  }, [loadGoals, toast]);

  const archiveGoal = useCallback(async (goalId: string) => {
    try {
      // Optimistic remove from view
      setGoals(prev => prev.filter(goal => goal.id !== goalId));

      const { error } = await supabase
        .from('team_goals')
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId);

      if (error) {
        // Revert optimistic update on error
        await loadGoals();
        throw error;
      }
      
      toast({
        title: "Goal archived",
        description: "Goal has been archived successfully",
      });
      
      return true;
    } catch (error) {
      logger.error('Error archiving goal:', error);
      toast({
        title: "Error",
        description: "Failed to archive goal",
        variant: "destructive",
      });
      return false;
    }
  }, [loadGoals, toast]);

  // Load goals when dependencies change
  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  // Debounced reload function to prevent excessive updates during reordering
  const debouncedReloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedReload = useCallback(() => {
    if (debouncedReloadTimeoutRef.current) {
      clearTimeout(debouncedReloadTimeoutRef.current);
    }
    debouncedReloadTimeoutRef.current = setTimeout(() => {
      loadGoals({ silent: true });
    }, 500); // Increased debounce for stability
  }, [loadGoals]);

  // Set up real-time subscription without filter (like Company Goals)
  useEffect(() => {
    if (!currentCompany) return;
    
    const channelName = `team_goals_${currentCompany?.id}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'team_goals'
          // No filter - handle filtering in callback like Company Goals
        },
          async (payload: any) => {
          // Block real-time updates during ANY reordering operations globally  
          if (isGloballyReordering()) {
            return;
          }
          
          // Check if this change is relevant to our company's team goals
          const goalTeamId = (payload.new as any)?.team_id || (payload.old as any)?.team_id;
          const isRelevantToCompany = teamsRef.current?.some(team => team.id === goalTeamId);
          
          if (!isRelevantToCompany) {
            return;
          }
          
          // Check if this is a team goal (not company goal)
          const isTeamGoalRelated = 
            (payload.new as any)?.is_company_goal === false || 
            (payload.old as any)?.is_company_goal === false;
          
          if (!isTeamGoalRelated) {
            return;
          }
          
          // Use debounced reload for smooth updates
          debouncedReload();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentCompany?.id, debouncedReload, isGloballyReordering]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    goals,
    loading,
    addGoal,
    updateGoal,
    updateGoalStatus,
    archiveGoal,
    refetch: loadGoals,
  };
};