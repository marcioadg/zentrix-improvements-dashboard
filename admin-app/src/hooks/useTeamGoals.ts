import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useOptimisticGoalArchiving } from './useOptimisticGoalArchiving';
import { useGlobalReorderLock } from './useGlobalReorderLock';
import { syncStatusFromProgress, syncProgressFromStatus, triggerCelebrationSafely } from '@/lib/goalProgressStatusSync';
import { logger } from '@/utils/logger';
import { useQueryClient } from '@tanstack/react-query';

  // Enhanced debounce utility for real-time updates with better batching
const useDebounce = (callback: () => void, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(callback, delay);
  }, [callback, delay]);
};

export interface TeamGoal {
  id: string;
  title: string;
  description?: string;
  status: 'on_track' | 'off_track' | 'complete' | 'canceled';
  target_date?: string;
  team_id: string;
  owner_id: string;
  archived: boolean;
  display_order: number;
  is_company_goal?: boolean;
  progress?: number;
  created_at: string;
  updated_at: string;
  team_assignments?: Array<{ team_id: string }>;
}

export const useTeamGoals = (teamId: string, showArchived: boolean = false) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [goals, setGoals] = useState<TeamGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const isReorderingRef = useRef(false);
  const { setGlobalReordering, isSectionReordering } = useGlobalReorderLock();
  
  // CRITICAL FIX: Keep a fresh ref to isSectionReordering to avoid stale closures
  const isSectionReorderingRef = useRef(isSectionReordering);
  isSectionReorderingRef.current = isSectionReordering;

  // ARCHITECTURAL FIX: Add optimistic state protection to prevent overwrites
  const isOptimisticallyUpdatingRef = useRef(false);
  
  // Signal start/end of optimistic updates
  const setOptimisticUpdating = useCallback((updating: boolean) => {
    logger.log(`🎯 [OPTIMISTIC] Setting optimistic updating: ${updating}`);
    isOptimisticallyUpdatingRef.current = updating;
  }, []);

  // Add optimistic archiving
  const {
    archiveGoalOptimistically,
    archivingGoals,
    undoArchive
  } = useOptimisticGoalArchiving(goals, setGoals);

  const loadGoals = async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!teamId) {
      setGoals([]);
      if (!silent) setLoading(false);
      return;
    }
    
    if (!silent) setLoading(true);
    try {
      // Step 1: Get goal IDs that are assigned to this team via the junction table
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('goal_team_assignments')
        .select('goal_id')
        .eq('team_id', teamId);

      if (assignmentError) {
        logger.error('Error loading goal assignments:', assignmentError);
      }

      const assignedGoalIds = assignmentData?.map(assignment => assignment.goal_id) || [];

      // Step 2: Query goals that are either directly assigned to this team OR in the assigned goal IDs
      // CRITICAL: Only load team goals (not company goals)
      let query = supabase
        .from('team_goals')
        .select('*')
        .eq('is_company_goal', false)  // FIXED: Use simple equality instead of OR condition
        .or('is_deleted.is.null,is_deleted.eq.false')  // Filter out deleted goals
        .order('owner_id', { ascending: true })
        .order('display_order', { ascending: true });

      // Apply archived filter based on showArchived flag
      if (showArchived) {
        query = query.eq('archived', true);
      } else {
        query = query.or('archived.is.null,archived.eq.false');
      }

      // Build the OR condition properly with correct syntax
      if (assignedGoalIds.length > 0) {
        query = query.or(`team_id.eq.${teamId},id.in.(${assignedGoalIds.join(',')})`);
      } else {
        query = query.eq('team_id', teamId);
      }

      const { data: goalsData, error: goalsError } = await query;

      if (goalsError) {
        logger.error('Error loading team goals:', goalsError);
        throw goalsError;
      }

      // Step 3: Get all team assignments for the retrieved goals
      const goalIds = goalsData?.map(goal => goal.id) || [];
      let teamAssignments: any[] = [];
      
      if (goalIds.length > 0) {
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('goal_team_assignments')
          .select('goal_id, team_id')
          .in('goal_id', goalIds);

        if (assignmentsError) {
          logger.error('Error loading team assignments:', assignmentsError);
        } else {
          teamAssignments = assignmentsData || [];
        }
      }

      // Step 4: Combine goals with their team assignments and remove duplicates
      const uniqueGoalsMap = new Map();
      
      (goalsData || []).forEach(goal => {
        if (!uniqueGoalsMap.has(goal.id)) {
          const typedGoal: TeamGoal = {
            ...goal,
            status: goal.status as 'on_track' | 'off_track' | 'complete' | 'canceled',
            archived: goal.archived || false,
            display_order: goal.display_order || 0,
            is_company_goal: goal.is_company_goal || false,
            team_assignments: teamAssignments
              .filter(assignment => assignment.goal_id === goal.id)
              .map(assignment => ({ team_id: assignment.team_id }))
          };
          uniqueGoalsMap.set(goal.id, typedGoal);
        }
      });
      
      let uniqueGoals = Array.from(uniqueGoalsMap.values());

      // SAFETY NET: Double-check to ensure no company goals slip through
      uniqueGoals = uniqueGoals.filter(goal => !goal.is_company_goal);

      // ARCHITECTURAL FIX: Check if optimistic updates are in progress
      if (isOptimisticallyUpdatingRef.current) {
        logger.log('🚫 [OPTIMISTIC] Blocking setGoals() during optimistic update to prevent overwrite');
        return; // Skip state update to preserve optimistic changes
      }

      setGoals(uniqueGoals);
    } catch (error) {
      logger.error('Error loading team goals:', error);
      toast({
        title: "Error",
        description: "Failed to load team goals",
        variant: "destructive",
      });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const addGoal = async (title: string, description?: string, ownerId?: string, targetDate?: string, isCompanyGoal?: boolean) => {
    // Generate temp ID for optimistic update
    const tempId = `temp-goal-${crypto.randomUUID()}`;
    let optimisticGoal: TeamGoal | null = null;
    
    try {
      // Dispatch optimistic event for onboarding FIRST
      window.dispatchEvent(new CustomEvent('optimistic-goal-creation'));
      
      // Validate teamId first
      if (!teamId || teamId.trim() === '') {
        logger.error('🚨 Invalid teamId:', teamId);
        throw new Error('Team ID is required to add a goal');
      }
      
      // Get the next display_order
      const tentativeOwnerId = ownerId && ownerId.trim() !== '' ? ownerId : (user?.id || teamId);
      const ownerGoals = goals.filter(g => g.owner_id === tentativeOwnerId);
      const maxOrder = ownerGoals.length > 0 ? Math.max(...ownerGoals.map(g => g.display_order || 0)) : 0;
      
      // Ensure ownerId is not an empty string
      const validOwnerId = ownerId && ownerId.trim() !== '' ? ownerId : teamId;
      
      // Create optimistic goal
      optimisticGoal = {
        id: tempId,
        title,
        description,
        status: 'on_track' as TeamGoal['status'],
        target_date: targetDate,
        team_id: teamId,
        owner_id: validOwnerId,
        archived: false,
        display_order: maxOrder + 1,
        is_company_goal: isCompanyGoal || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        team_assignments: [{ team_id: teamId }]
      };
      
      // CRITICAL: Block real-time updates during optimistic operation
      logger.log('🎯 [OPTIMISTIC] Starting goal creation, blocking real-time updates');
      setOptimisticUpdating(true);
      
      // Add to UI immediately
      setGoals(prev => [...prev, optimisticGoal!]);
      
      logger.log('✨ [OPTIMISTIC] Goal added to UI, syncing with backend...');
      
      // Backend sync
      const { data: newGoal, error } = await supabase
        .from('team_goals')
        .insert({
          title,
          description,
          status: 'on_track',
          target_date: targetDate,
          team_id: teamId,
          owner_id: validOwnerId,
          is_company_goal: isCompanyGoal || false,
          display_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Add initial team assignment
      if (newGoal) {
        const { error: assignmentError } = await supabase
          .from('goal_team_assignments')
          .insert({
            goal_id: newGoal.id,
            team_id: teamId
          });

        if (assignmentError) {
          logger.error('Error adding team assignment:', assignmentError);
        }
      }
      
      // Replace optimistic goal with real one
      if (newGoal) {
        const typedNewGoal: TeamGoal = {
          ...newGoal,
          status: newGoal.status as TeamGoal['status'],
          archived: newGoal.archived || false,
          display_order: newGoal.display_order || 0,
          is_company_goal: newGoal.is_company_goal || false,
          team_assignments: [{ team_id: teamId }]
        };
        
        setGoals(prev => prev.map(g => g.id === tempId ? typedNewGoal : g));
        
        logger.log('✅ [OPTIMISTIC] Goal created successfully, replaced temp with real goal');
        
        // Dispatch event for broadcast in meeting context
        window.dispatchEvent(new CustomEvent('goal-created', { 
          detail: { goal: typedNewGoal } 
        }));
        
        // Track goal creation in analytics (legacy)
        const { trackGoalCreated: legacyTrackGoalCreated } = await import('@/lib/analytics');
        legacyTrackGoalCreated('team');
        
        // Track goal_created event for Statsig
        try {
          const { data: teamData } = await supabase
            .from('teams')
            .select('company_id')
            .eq('id', teamId)
            .maybeSingle();
          
          const { trackGoalCreated } = await import('@/lib/statsigAnalytics');
          trackGoalCreated({
            user_id: user?.id,
            company_id: teamData?.company_id || undefined,
            goal_id: newGoal.id,
            goal_type: 'quarterly', // Team goals are quarterly by default
            goal_title: title,
            teamId
          });
        } catch (e) {
          // Non-blocking
        }
        
        // Show success toast
        toast({
          title: "Goal Created ✓",
          description: `"${title}" has been added successfully`,
        });
        
        // Release real-time block
        setOptimisticUpdating(false);
        
        // Verification timeout - check if goal appears in database after 3 seconds
        setTimeout(async () => {
          try {
            const { data: verifyGoal } = await supabase
              .from('team_goals')
              .select('id')
              .eq('id', newGoal.id)
              .maybeSingle();
            
            if (!verifyGoal) {
              logger.warn('⚠️ [VERIFY] Goal not found in database after 3s, reloading...');
              toast({
                title: "Syncing...",
                description: "Refreshing goals to ensure sync",
              });
              await loadGoals({ silent: true });
            } else {
              logger.log('✓ [VERIFY] Goal confirmed in database');
            }
          } catch (verifyError) {
            logger.error('Error verifying goal:', verifyError);
          }
        }, 3000);
        
        return typedNewGoal;
      }
      
      return false;
    } catch (error) {
      logger.error('❌ [OPTIMISTIC] Error adding goal:', error);
      
      // Rollback on error - remove optimistic goal
      if (optimisticGoal) {
        setGoals(prev => prev.filter(g => g.id !== tempId));
        logger.log('↩️ [OPTIMISTIC] Rolled back optimistic goal');
      }
      
      // Release real-time block
      setOptimisticUpdating(false);
      
      toast({
        title: "Error",
        description: "Failed to add goal. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateGoal = async (goalId: string, updates: Partial<TeamGoal>) => {
    try {
      const currentGoal = goals.find(g => g.id === goalId);
      const oldStatus = currentGoal?.status;
      
      // ONLY sync status from progress/status for goals WITHOUT milestones
      // When milestones exist, they control the goal completion
      if (currentGoal && updates.status) {
        const { data: milestonesData } = await supabase
          .from('goal_milestones')
          .select('id')
          .eq('goal_id', goalId)
          .limit(1);
        
        const hasMilestones = milestonesData && milestonesData.length > 0;
        
        if (!hasMilestones) {
          const syncResult = syncProgressFromStatus(updates.status, currentGoal.progress || 0);
          if (syncResult.progress !== undefined) {
            updates.progress = syncResult.progress;
          }
          if (syncResult.shouldCelebrate) {
            triggerCelebrationSafely();
          }
        }
      }
      
      // Separate team assignments from other updates
      const { team_assignments, ...goalUpdates } = updates;
      
      
      // Compute safe progress fallback from milestones when toggling company flag
      let progressFromMilestones: number | undefined = undefined;
      if (Object.prototype.hasOwnProperty.call(goalUpdates, 'is_company_goal')) {
        const { data: ms, error: msError } = await supabase
          .from('goal_milestones')
          .select('progress')
          .eq('goal_id', goalId);
        if (!msError && ms && ms.length > 0) {
          const values = ms.map((m: any) => (m.progress ?? 0));
          progressFromMilestones = Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length);
        }
      }
      
      // Update the main goal record (excluding team_assignments)
      const { error: goalError } = await supabase
        .from('team_goals')
        .update({ 
          ...goalUpdates,
          ...(progressFromMilestones !== undefined ? { progress: progressFromMilestones } : {}),
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId);
      if (goalError) {
        logger.error('Error updating goal:', goalError);
        throw goalError;
      }

      // If goal is marked as complete and has milestones, set all milestones to 100%
      if (updates.status === 'complete') {
        const { data: milestones } = await supabase
          .from('goal_milestones')
          .select('id, progress')
          .eq('goal_id', goalId);
        
        if (milestones && milestones.length > 0) {
          // Only update milestones that are NOT already at 100%
          const milestonesNeedingUpdate = milestones.filter(m => m.progress !== 100);
          
          if (milestonesNeedingUpdate.length > 0) {
            // Update milestones in database - matches Dashboard pattern
            await supabase
              .from('goal_milestones')
              .update({ progress: 100 })
              .eq('goal_id', goalId)
              .in('id', milestonesNeedingUpdate.map(m => m.id));
            
            // Invalidate React Query cache for milestones
            queryClient.invalidateQueries({ queryKey: ['goal-milestones', goalId] });
            
            toast({
              title: "Goal Completed!",
              description: `${milestonesNeedingUpdate.length} milestone(s) marked as complete`,
            });
            triggerCelebrationSafely();
          } else {
            // All milestones already at 100% - just invalidate cache, no celebration
            queryClient.invalidateQueries({ queryKey: ['goal-milestones', goalId] });
          }
        }
      }

      // Handle team assignments separately if provided - use delta approach
      if (team_assignments !== undefined) {
        
        
        // Get current assignments
        const { data: currentAssignments } = await supabase
          .from('goal_team_assignments')
          .select('team_id')
          .eq('goal_id', goalId);

        const currentTeamIds = (currentAssignments || []).map(a => a.team_id);
        const newTeamIds = team_assignments.map(a => a.team_id);
        
        // Find teams to add and remove
        const toInsert = newTeamIds.filter(id => !currentTeamIds.includes(id));
        const toDelete = currentTeamIds.filter(id => !newTeamIds.includes(id));
        
        // Insert new assignments
        if (toInsert.length > 0) {
          const assignmentsToInsert = toInsert.map(teamId => ({
            goal_id: goalId,
            team_id: teamId
          }));

          const { error: insertError } = await supabase
            .from('goal_team_assignments')
            .insert(assignmentsToInsert);

          if (insertError) {
            logger.error('Error inserting new team assignments:', insertError);
            throw insertError;
          }
        }

        // Delete removed assignments - handle RLS gracefully
        if (toDelete.length > 0) {
          for (const teamId of toDelete) {
            const { error: deleteError } = await supabase
              .from('goal_team_assignments')
              .delete()
              .eq('goal_id', goalId)
              .eq('team_id', teamId);

            if (deleteError) {
              logger.warn('Could not remove team assignment (RLS):', teamId, deleteError);
              // Show non-blocking toast for partial failure
              if (typeof window !== 'undefined') {
                setTimeout(() => {
                  const event = new CustomEvent('show-toast', {
                    detail: {
                      title: 'Partial Update',
                      description: `Could not remove assignment from some teams due to permissions`,
                      variant: 'default'
                    }
                  });
                  window.dispatchEvent(event);
                }, 100);
              }
            }
          }
        }
      }
      
      // Optimistically update local state immediately
      setGoals(prevGoals => {
        // Check if the goal should still be visible in this team's view
        if (team_assignments !== undefined) {
          const isAssignedToCurrentTeam = team_assignments.some(a => a.team_id === teamId);
          
          // If the current team is not in the assignments, remove the goal from view
          if (!isAssignedToCurrentTeam) {
            return prevGoals.filter(goal => goal.id !== goalId);
          }
        }
        
        // Otherwise, update the goal normally
        return prevGoals.map(goal => 
          goal.id === goalId 
            ? { 
                ...goal, 
                ...goalUpdates,
                team_assignments: team_assignments !== undefined ? team_assignments : goal.team_assignments,
                ...(progressFromMilestones !== undefined ? { progress: progressFromMilestones } : {}),
                updated_at: new Date().toISOString()
              } 
            : goal
        );
      });

      // Track goal update in analytics
      import('@/lib/analytics').then(({ trackGoalUpdated }) => {
        trackGoalUpdated('team');
      });

      // Track status changes in Statsig if status was updated
      if (updates.status && oldStatus && oldStatus !== updates.status) {
        try {
          const { data: teamData } = await supabase
            .from('teams')
            .select('company_id')
            .eq('id', teamId)
            .maybeSingle();
          
          const { trackGoalStatusChanged, trackGoalCompleted } = await import('@/lib/statsigAnalytics');
          
          // Track status change
          trackGoalStatusChanged({
            user_id: user?.id,
            company_id: teamData?.company_id || undefined,
            goal_id: goalId,
            old_status: oldStatus,
            new_status: updates.status
          });
          
          // Track goal completion specifically
          if (updates.status === 'complete' && currentGoal) {
            const createdAt = new Date(currentGoal.created_at);
            const now = new Date();
            const daysToComplete = Math.round((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
            
            trackGoalCompleted({
              user_id: user?.id,
              company_id: teamData?.company_id || undefined,
              goal_id: goalId,
              days_to_complete: daysToComplete
            });
          }
        } catch (e) {
          // Non-blocking
        }
      }

      // Immediately notify other views (e.g., meeting company goals) to refresh without waiting for realtime
      if (typeof window !== 'undefined' && Object.prototype.hasOwnProperty.call(goalUpdates, 'is_company_goal')) {
        try {
          window.dispatchEvent(new CustomEvent('company-goal-toggled', {
            detail: { goalId, is_company_goal: (goalUpdates as any).is_company_goal }
          }));
          // Also invalidate milestone cache for this goal to refresh progress sources immediately
          window.dispatchEvent(new CustomEvent('milestone-cache-invalidate', { detail: { goalId } }));
        } catch (e) {
          logger.warn('Failed to dispatch events', e);
        }
      }
      return true;
    } catch (error) {
      logger.error('Error updating goal:', error);
      toast({
        title: "Error",
        description: "Failed to update goal. Please check console for details.",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateGoalProgress = useCallback(async (goalId: string, progress: number) => {
    if (!teamId || !user) {
      logger.warn('updateGoalProgress called but teamId or user not available:', { teamId, user });
      return false;
    }

    try {
      // Find current goal to check status
      const currentGoal = goals.find(g => g.id === goalId);
      if (!currentGoal) {
        logger.warn('Goal not found for progress update:', goalId);
        return false;
      }

      // Calculate status sync from progress change
      const syncResult = syncStatusFromProgress(
        currentGoal.progress || 0,
        progress,
        currentGoal.status
      );

      // Build update data with synced values
      const updateData: { progress: number; status?: TeamGoal['status']; updated_at: string } = {
        progress,
        updated_at: new Date().toISOString()
      };

      if (syncResult.status) {
        updateData.status = syncResult.status as TeamGoal['status'];
        logger.debug('🔄 Auto-syncing status from progress:', { goalId, newStatus: syncResult.status, progress });
      }

      // Optimistic update with both progress and status
      setGoals(prevGoals => 
        prevGoals.map(goal => 
          goal.id === goalId ? { ...goal, ...updateData } as TeamGoal : goal
        )
      );

      // Celebrate if goal reached 100%
      if (syncResult.shouldCelebrate) {
        triggerCelebrationSafely();
      }

      // Update database
      const { error } = await supabase
        .from('team_goals')
        .update(updateData)
        .eq('id', goalId);

      if (error) {
        // Revert optimistic update
        setGoals(prevGoals => 
          prevGoals.map(goal => 
            goal.id === goalId ? { ...goal, progress: currentGoal.progress, status: currentGoal.status } : goal
          )
        );
        logger.error('Error updating goal progress:', error);
        toast({
          title: "Error",
          description: "Failed to update goal progress",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Progress updated",
        description: `Goal progress set to ${progress}%${syncResult.status ? ` (status: ${syncResult.status})` : ''}`,
      });

      return true;
    } catch (error) {
      logger.error('Error updating goal progress:', error);
      toast({
        title: "Error", 
        description: "Failed to update goal progress",
        variant: "destructive",
      });
      return false;
    }
  }, [teamId, user, goals, setGoals, toast]);

  const updateGoalStatus = async (goalId: string, status: TeamGoal['status']) => {
    try {
      // Get the current goal to track old status
      const currentGoal = goals.find(g => g.id === goalId);
      const oldStatus = currentGoal?.status;
      
      // Prepare update data - set progress to 100% when status becomes complete
      const updateData: { status: TeamGoal['status']; updated_at: string; progress?: number } = { 
        status,
        updated_at: new Date().toISOString()
      };
      if (status === 'complete') {
        updateData.progress = 100;
      }

      // Optimistically update local state first
      setGoals(prevGoals => 
        prevGoals.map(goal => 
          goal.id === goalId ? { ...goal, ...updateData } : goal
        )
      );

      const { error } = await supabase
        .from('team_goals')
        .update(updateData)
        .eq('id', goalId);

      if (error) {
        logger.error('Error updating goal status:', error);
        throw error;
      }
      
      // Track goal status change and completion in Statsig
      try {
        const { data: teamData } = await supabase
          .from('teams')
          .select('company_id')
          .eq('id', teamId)
          .maybeSingle();
        
        const companyId = teamData?.company_id || undefined;
        
        // Track status change event
        if (oldStatus && oldStatus !== status) {
          const { trackGoalStatusChanged } = await import('@/lib/statsigAnalytics');
          trackGoalStatusChanged({
            user_id: user?.id,
            company_id: companyId,
            goal_id: goalId,
            old_status: oldStatus,
            new_status: status
          });
        }
        
        // Track goal completion event
        if (status === 'complete' && currentGoal) {
          const { trackGoalCompleted } = await import('@/lib/statsigAnalytics');
          // Calculate days to complete from created_at
          const createdAt = new Date(currentGoal.created_at);
          const completedAt = new Date();
          const daysToComplete = Math.round((completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          
          trackGoalCompleted({
            user_id: user?.id,
            company_id: companyId,
            goal_id: goalId,
            days_to_complete: daysToComplete
          });
        }
      } catch (e) {
        // Non-blocking
      }
      
      await loadGoals();
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

  const reorderGoals = async (goalIds: string[]) => {
    logger.log('🔄 REORDER GOALS - Batched database operation');
    logger.log('🎯 Goal IDs to reorder:', goalIds);

    try {
      // Update local state immediately (optimistic) — keep goals not in goalIds unchanged
      setGoals(prev => {
        const reorderedMap = new Map(goalIds.map((id, index) => [id, index + 1]));
        return prev.map(goal => {
          const newOrder = reorderedMap.get(goal.id);
          if (newOrder !== undefined) {
            return { ...goal, display_order: newOrder };
          }
          return goal;
        });
      });

      // Persist to database
      const updates = goalIds.map((id, index) =>
        supabase
          .from('team_goals')
          .update({
            display_order: index + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
      );

      await Promise.all(updates);

      logger.log('✅ Database reorder completed');
      return true;
    } catch (error) {
      logger.error('Error reordering goals:', error);
      // Reload from DB to get correct state on error
      await loadGoals({ silent: true });
      toast({
        title: "Error",
        description: "Failed to reorder goals",
        variant: "destructive",
      });
      return false;
    }
  };

  const archiveGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('team_goals')
        .update({ 
          archived: true,
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId);

      if (error) {
        logger.error('Error archiving goal:', error);
        throw error;
      }
      
      setGoals(prev => prev.filter(goal => goal.id !== goalId));
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
  };

  const unarchiveGoal = async (goalId: string) => {
    logger.log('🔓 UNARCHIVE TEAM GOAL - Starting unarchive operation');
    logger.log('🎯 Goal ID:', goalId);
    logger.log('👥 Team ID:', teamId);
    
    try {
      logger.log('📤 Sending update to Supabase...');
      
      const { data, error, count } = await supabase
        .from('team_goals')
        .update({ 
          archived: false,
          archived_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId)
        .select(); // Add .select() to get the updated row back

      logger.log('📥 Supabase response:', { data, error, count });

      if (error) {
        logger.error('❌ Supabase error details:', error);
        logger.error('Error code:', error.code);
        logger.error('Error message:', error.message);
        logger.error('Error details:', error.details);
        throw error;
      }
      
      logger.log('✅ Goal unarchived successfully in database');
      logger.log('📊 Updated rows:', data);
      
      logger.log('🔄 Reloading team goals...');
      await loadGoals();
      
      toast({
        title: "Goal restored",
        description: "The goal has been restored successfully"
      });
      
      return true;
    } catch (error) {
      logger.error('❌ UNARCHIVE FAILED - Full error:', error);
      toast({
        title: "Error",
        description: "Failed to unarchive goal",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteGoal = async (goalId: string) => {
    logger.log('🗑️ DELETE GOAL - Starting delete operation');
    logger.log('🎯 Goal ID:', goalId);
    
    try {
      const { error } = await supabase
        .from('team_goals')
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId);

      if (error) {
        logger.error('❌ Error deleting goal:', error);
        throw error;
      }

      logger.log('✅ Goal deleted successfully');
      
      // Remove from local state immediately (optimistic)
      setGoals(prevGoals => prevGoals.filter(g => g.id !== goalId));
      
      toast({
        title: "Goal deleted",
        description: "The goal has been permanently deleted",
      });

      return true;
    } catch (error: any) {
      logger.error('❌ Delete goal error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete goal",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    loadGoals();
  }, [teamId, showArchived]);

  // Debounced reload function to prevent excessive updates - reduced delay for better UX
  const debouncedReload = useDebounce(async () => {
    // Block reload if THIS team is reordering OR if this specific team section is locked
    const sectionId = `team-${teamId}`;
    // CRITICAL FIX: Use fresh ref to avoid stale closure issue
    if (!isReorderingRef.current && !isSectionReorderingRef.current(sectionId)) {
      logger.log(`🔄 [RT-RELOAD] Team goals debounced reload EXECUTING for section ${sectionId}`);
      await loadGoals({ silent: true });
    } else {
      logger.log(`🚫 [RT-RELOAD] Team goals debounced reload BLOCKED for section ${sectionId} due to scoped reordering lock`);
    }
  }, 250); // Match useCompanyGoals debounce for milestone update consistency

  // Listen for goal creation events for instant refresh
  useEffect(() => {
    const handleGoalCreated = (e: any) => {
      try {
        // Block event handling during THIS team's reordering only
        const sectionId = `team-${teamId}`;
        if (isReorderingRef.current || isSectionReorderingRef.current(sectionId)) {
          logger.log(`🚫 Goal creation event blocked for section ${sectionId} during reordering`);
          return;
        }
        
        const detail = e?.detail || {};
        // Immediately refresh goals when a new goal is created
        loadGoals({ silent: true });
      } catch (err) {
        logger.warn('Team Goals: error handling goal creation event', err);
      }
    };

    const handleCompanyGoalToggle = (e: any) => {
      try {
        // Block event handling during THIS team's reordering only
        const sectionId = `team-${teamId}`;
        if (isReorderingRef.current || isSectionReorderingRef.current(sectionId)) {
          logger.log(`🚫 Company goal toggle event blocked for section ${sectionId} during reordering`);
          return;
        }
        
        const detail = e?.detail || {};
        if (detail && Object.prototype.hasOwnProperty.call(detail, 'is_company_goal')) {
          // Optimistically add goal to team goals if it's no longer a company goal
          if (detail.goalId && detail.is_company_goal === false) {
            // Refresh team goals to pick up the newly unmarked goal
            loadGoals({ silent: true });
          }
        }
      } catch (err) {
        logger.warn('Team Goals: error handling company-goal-toggled event', err);
      }
    };

    // Listen for both goal creation and company goal toggle events
    window.addEventListener('meeting-goal-created', handleGoalCreated as EventListener);
    window.addEventListener('goal-created-success', handleGoalCreated as EventListener);
    window.addEventListener('company-goal-toggled', handleCompanyGoalToggle as EventListener);
    
    return () => {
      window.removeEventListener('meeting-goal-created', handleGoalCreated as EventListener);
      window.removeEventListener('goal-created-success', handleGoalCreated as EventListener);
      window.removeEventListener('company-goal-toggled', handleCompanyGoalToggle as EventListener);
    };
  }, [teamId]);

  // Real-time subscription for team goals
  useEffect(() => {
    if (!teamId) {
      return;
    }

    
    const channel = supabase
      .channel(`team_goals_changes_${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_goals',
          filter: 'is_company_goal=eq.false'  // Only listen to team goals
        },
        async (payload: any) => {
          // Get the section ID for this team to check scoped locking
          const sectionId = `team-${teamId}`;
          
          // CRITICAL: Block during optimistic updates to prevent race conditions
          if (isOptimisticallyUpdatingRef.current) {
            logger.log(`🚫 [OPTIMISTIC] Team goals real-time update BLOCKED during optimistic operation`);
            return;
          }
          
          // Only block updates for THIS specific team section if it's being reordered
          if (isReorderingRef.current || isSectionReorderingRef.current(sectionId)) {
            logger.log(`🚫 Team goals real-time update BLOCKED for section ${sectionId} due to scoped reordering lock`);
            return;
          }
          
          // Check if this change is relevant to our team
          const isRelevantToTeam = 
            (payload.new as any)?.team_id === teamId || 
            (payload.old as any)?.team_id === teamId;
          
          if (!isRelevantToTeam) return;
          
          logger.log('🔄 Team goals real-time update ALLOWED - triggering reload for team:', teamId);
          // Use debounced reload to prevent excessive updates
          debouncedReload();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, debouncedReload]);


  return {
    goals,
    setGoals,
    loading,
    addGoal,
    updateGoal,
    updateGoalStatus,
    updateGoalProgress,
    reorderGoals,
    archiveGoal: archiveGoalOptimistically, // Use optimistic archiving
    unarchiveGoal,
    deleteGoal,
    refetch: loadGoals,
    setOptimisticUpdating, // ARCHITECTURAL FIX: Expose optimistic state control
  };
};
