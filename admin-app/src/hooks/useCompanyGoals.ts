
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { TeamGoal } from '@/hooks/useTeamGoals';
import { useOptimizedUserTeams } from '@/hooks/useOptimizedUserTeams';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalReorderLock } from '@/hooks/useGlobalReorderLock';
import { syncStatusFromProgress, syncProgressFromStatus, triggerCelebrationSafely } from '@/lib/goalProgressStatusSync';
import { logger } from '@/utils/logger';

// Debounce utility for real-time updates (with cleanup on unmount)
const useDebounce = (callback: () => void, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(callback, delay);
  }, [callback, delay]);
};

export const useCompanyGoals = (teams?: any[], hasLeadershipAccess?: boolean, leadershipTeamContext?: { id: string; company_id: string }, showArchived: boolean = false) => {
  const [goals, setGoals] = useState<TeamGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLeadershipMember, setIsLeadershipMember] = useState(false);
  const { toast } = useToast();
  const { allTeams: fallbackTeams } = useOptimizedUserTeams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isGloballyReordering, isSectionReordering } = useGlobalReorderLock();
  
  // Use provided teams or fallback to hook teams — ensure always an array
  const userTeams = Array.isArray(teams) ? teams : (Array.isArray(fallbackTeams) ? fallbackTeams : []);

  // Stable keys to avoid reloading on reference changes
  const teamIdsKey = useMemo(() => (userTeams?.map(t => t.id).sort().join(',')) || '', [userTeams]);
  const currentCompanyId = useMemo(() => userTeams?.[0]?.company_id || null, [teamIdsKey]);
  const isReorderingRef = useRef(false);
  
  // ✅ CRITICAL FIX: Use ref to store userTeams to avoid closure stale issues in subscription callback
  const userTeamsRef = useRef(userTeams);
  useEffect(() => {
    userTeamsRef.current = userTeams;
  }, [userTeams]);
  
  // ARCHITECTURAL FIX: Add optimistic state protection to prevent overwrites
  const isOptimisticallyUpdatingRef = useRef(false);

  // Track all pending timeouts for cleanup on unmount
  const pendingTimeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  
  // ✅ CRITICAL FIX: Track recently updated goal IDs to prevent self-triggering
  // This helps catch any Postgres Changes events that arrive after the optimistic update completes
  const recentlyUpdatedGoalIdsRef = useRef<Set<string>>(new Set());
  
  // Signal start/end of optimistic updates
  const setOptimisticUpdating = useCallback((updating: boolean, goalId?: string) => {
    logger.log(`🎯 [OPTIMISTIC COMPANY] Setting optimistic updating: ${updating}${goalId ? ` for goal: ${goalId}` : ''}`);
    isOptimisticallyUpdatingRef.current = updating;
    
    if (goalId && updating) {
      // Add goal ID to recently updated set
      recentlyUpdatedGoalIdsRef.current.add(goalId);
      // Remove after 2 seconds (enough time for Postgres Changes to propagate)
      const timer = setTimeout(() => {
        recentlyUpdatedGoalIdsRef.current.delete(goalId);
        pendingTimeoutsRef.current.delete(timer);
      }, 2000);
      pendingTimeoutsRef.current.add(timer);
    }
  }, []);

  const checkLeadershipAccess = async () => {
    if (!user || userTeams.length === 0) {
      setIsLeadershipMember(false);
      return false;
    }

    try {
      // Check if user is member of the leadership team
      const { data: leadershipTeam, error } = await supabase
        .from('teams')
        .select('id')
        .eq('is_leadership', true)
        .in('id', userTeams.map(team => team.id))
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        logger.error('Error checking leadership access:', error);
        setIsLeadershipMember(false);
        return false;
      }

      const hasAccess = !!leadershipTeam;
      setIsLeadershipMember(hasAccess);
      return hasAccess;
    } catch (error) {
      logger.error('Error checking leadership access:', error);
      setIsLeadershipMember(false);
      return false;
    }
  };

  const loadCompanyGoals = async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) setLoading(true);
    
    // First check if user has leadership access
    const hasAccess = await checkLeadershipAccess();
    
    if (!hasAccess) {
      setGoals([]);
      if (!silent) setLoading(false);
      return;
    }
    
    try {
      // Get current company ID from first team (all user teams should be from same company)
      const currentCompanyId = userTeams[0]?.company_id;
      if (!currentCompanyId) {
        setGoals([]);
        if (!silent) setLoading(false);
        return;
      }
      
      // Get all company goals from the user's current company
      // Apply archived filter based on showArchived flag
      const query = showArchived 
        ? supabase.from('team_goals')
            .select(`
              *,
              teams!inner(company_id)
            `)
            .eq('teams.company_id', currentCompanyId)
            .eq('is_company_goal', true)
            .eq('archived', true)
            .or('is_deleted.is.null,is_deleted.eq.false')  // Filter out deleted goals
            .order('display_order', { ascending: true })
        : supabase.from('team_goals')
            .select(`
              *,
              teams!inner(company_id)
            `)
            .eq('teams.company_id', currentCompanyId)
            .eq('is_company_goal', true)
            .or('archived.is.null,archived.eq.false')
            .or('is_deleted.is.null,is_deleted.eq.false')  // Filter out deleted goals
            .order('display_order', { ascending: true });

      const { data, error } = await query;

      if (error) {
        logger.error('Error loading company goals:', error);
        throw error;
      }
      
      // Safety filter: Ensure all goals belong to the current company
      const filteredData = (data || []).filter(goal => {
        const goalCompanyId = goal.teams?.company_id;
        const isValid = goalCompanyId === currentCompanyId;
        if (!isValid) {
          logger.warn('🚨 Company goal filtered out - wrong company:', {
            goalId: goal.id,
            goalTitle: goal.title,
            goalCompanyId,
            expectedCompanyId: currentCompanyId
          });
        }
        return isValid;
      });
      
      const typedGoals: TeamGoal[] = filteredData.map(goal => ({
        ...goal,
        status: goal.status as 'on_track' | 'off_track' | 'complete' | 'canceled',
        archived: goal.archived || false,
        display_order: goal.display_order || 0
      }));
      
      // ARCHITECTURAL FIX: Check if optimistic updates are in progress
      if (isOptimisticallyUpdatingRef.current) {
        logger.log('🚫 [OPTIMISTIC COMPANY] Blocking setGoals() during optimistic update to prevent overwrite');
        return; // Skip state update to preserve optimistic changes
      }
      
      setGoals(typedGoals);
    } catch (error) {
      logger.error('Error loading company goals:', error);
      toast({
        title: "Error",
        description: "Failed to load company goals",
        variant: "destructive",
      });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const reorderCompanyGoals = async (goalIds: string[]) => {
    isReorderingRef.current = true;
    try {
      // Optimistically update the local state
      const reorderedGoals = goalIds.map((id, index) => {
        const goal = goals.find(g => g.id === id);
        return goal ? { ...goal, display_order: index + 1 } : null;
      }).filter(Boolean) as TeamGoal[];
      
      setGoals(reorderedGoals);

      // Update the database
      const updates = goalIds.map((id, index) => ({
        id,
        display_order: index + 1,
        updated_at: new Date().toISOString()
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('team_goals')
          .update({
            display_order: update.display_order,
            updated_at: update.updated_at
          })
          .eq('id', update.id);

        if (error) {
          logger.error('Error updating company goal order:', error);
          // Reload goals if there's an error to sync with database
          await loadCompanyGoals({ silent: true });
          throw error;
        }
      }

      return true;
    } catch (error) {
      logger.error('Error reordering company goals:', error);
      toast({
        title: "Error",
        description: "Failed to reorder company goals",
        variant: "destructive",
      });
      return false;
    } finally {
      // Release the reordering lock slightly after updates to avoid race with realtime
      const timer = setTimeout(() => {
        isReorderingRef.current = false;
        pendingTimeoutsRef.current.delete(timer);
      }, 150);
      pendingTimeoutsRef.current.add(timer);
    }
  };

  const updateGoal = async (goalId: string, updates: Partial<TeamGoal>) => {
    try {
      const currentGoal = goals.find(g => g.id === goalId);
      const oldStatus = currentGoal?.status;
      // ONLY sync status from progress for goals WITHOUT milestones
      // When milestones exist, they control the goal completion
      if (currentGoal && updates.progress !== undefined) {
        const { data: milestonesData } = await supabase
          .from('goal_milestones')
          .select('id')
          .eq('goal_id', goalId)
          .limit(1);
        
        const hasMilestones = milestonesData && milestonesData.length > 0;
        
        if (!hasMilestones) {
          // No milestones: Progress-driven completion
          if (updates.progress === 100 && currentGoal.status !== 'complete') {
            logger.debug('🎯 Progress reached 100% (no milestones) - auto-completing goal');
            updates.status = 'complete';
            triggerCelebrationSafely();
          }
          // Revert completion
          else if (updates.progress < 100 && currentGoal.status === 'complete') {
            logger.debug('↩️ Progress dropped below 100% (no milestones) - reverting to on_track');
            updates.status = 'on_track';
          }
        }
      }
      
      // Status-driven completion ONLY for goals WITHOUT milestones
      if (currentGoal && updates.status === 'complete' && currentGoal.progress !== 100) {
        const { data: milestonesData } = await supabase
          .from('goal_milestones')
          .select('id')
          .eq('goal_id', goalId)
          .limit(1);
        
        const hasMilestones = milestonesData && milestonesData.length > 0;
        
        if (!hasMilestones) {
          logger.debug('✅ Status set to complete (no milestones) - ensuring progress is 100%');
          updates.progress = 100;
          triggerCelebrationSafely();
        }
      }
      
      // ✅ CRITICAL: Set optimistic updating flag to block real-time subscription during update
      setOptimisticUpdating(true, goalId);
      
      // Optimistically update local state first
      setGoals(prev => prev.map(goal => 
        goal.id === goalId 
          ? { ...goal, ...updates, updated_at: new Date().toISOString() }
          : goal
      ));

      // Separate team_assignments from regular updates
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

      // Update the goal record
      const { error: goalError } = await supabase
        .from('team_goals')
        .update({ 
          ...goalUpdates,
          ...(progressFromMilestones !== undefined ? { progress: progressFromMilestones } : {}),
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId);

      if (goalError) {
        logger.error('Error updating company goal:', goalError);
        // Reset optimistic updating flag on error
        setOptimisticUpdating(false, goalId);
        // Remove from recently updated set on error
        recentlyUpdatedGoalIdsRef.current.delete(goalId);
        // Revert optimistic update on error
        await loadCompanyGoals();
        throw goalError;
      }
      
      // ✅ CRITICAL: Reset optimistic updating flag after successful update
      // The goal ID will remain in recentlyUpdatedGoalIdsRef for 2 seconds to catch late-arriving events
      // This prevents self-triggering while still allowing remote updates to sync
      const resetTimer = setTimeout(() => {
        setOptimisticUpdating(false, goalId);
        pendingTimeoutsRef.current.delete(resetTimer);
      }, 500);
      pendingTimeoutsRef.current.add(resetTimer);

      // If goal is marked as complete and has milestones, set all milestones to 100%
      if (updates.status === 'complete') {
        logger.log('🎯 [MILESTONE UPDATE] Goal marked complete, checking for milestones:', goalId);
        
        const { data: milestones, error: milestonesQueryError } = await supabase
          .from('goal_milestones')
          .select('id, title, progress')
          .eq('goal_id', goalId);
        
        if (milestonesQueryError) {
          logger.error('❌ [MILESTONE UPDATE] Error querying milestones:', milestonesQueryError);
          toast({
            title: "Warning",
            description: "Goal marked complete but couldn't check milestones",
            variant: "destructive"
          });
        } else if (milestones && milestones.length > 0) {
          logger.log(`📝 [MILESTONE UPDATE] Found ${milestones.length} milestones:`, milestones.map(m => ({ id: m.id, title: m.title, progress: m.progress })));
          
          // Only update milestones that are NOT already at 100%
          const milestonesNeedingUpdate = milestones.filter(m => m.progress !== 100);
          
          if (milestonesNeedingUpdate.length > 0) {
            logger.log(`🔄 [MILESTONE UPDATE] Updating ${milestonesNeedingUpdate.length} milestones to 100%`);
            
            const { data: updateData, error: updateError } = await supabase
              .from('goal_milestones')
              .update({ progress: 100, updated_at: new Date().toISOString() })
              .eq('goal_id', goalId)
              .in('id', milestonesNeedingUpdate.map(m => m.id))
              .select('id, title, progress');
            
            const rowCount = updateData?.length || 0;
            
            logger.log('🔍 [MILESTONE UPDATE] Update result:', { 
              error: updateError, 
              rowsReturned: rowCount,
              expectedCount: milestonesNeedingUpdate.length,
              data: updateData 
            });
            
            if (updateError) {
              logger.error('❌ [MILESTONE UPDATE] Failed to update milestones:', updateError);
              toast({
                title: "Milestone Update Failed",
                description: `Could not update milestones to 100%. Error: ${updateError.message}`,
                variant: "destructive"
              });
            } else if (!updateData || rowCount === 0) {
              logger.error('❌ [MILESTONE UPDATE] Update succeeded but 0 rows affected:', { updateData, rowCount });
              toast({
                title: "Warning",
                description: "Goal marked complete but milestones were not updated. Please refresh the page.",
                variant: "destructive"
              });
            } else if (rowCount !== milestonesNeedingUpdate.length) {
              logger.warn('⚠️ [MILESTONE UPDATE] Partial update:', { expected: milestonesNeedingUpdate.length, actual: rowCount });
              toast({
                title: "Partial Update",
                description: `Only ${rowCount} of ${milestonesNeedingUpdate.length} milestones were updated`,
                variant: "destructive"
              });
            } else {
              logger.log('✅ [MILESTONE UPDATE] Successfully updated all milestones:', updateData);
              
              // CRITICAL: Invalidate React Query cache to update UI immediately
              queryClient.invalidateQueries({ queryKey: ['goal-milestones', goalId] });
              
              toast({
                title: "Goal Completed!",
                description: `${milestonesNeedingUpdate.length} milestone(s) marked as complete`,
              });
              triggerCelebrationSafely();
            }
          } else {
            // All milestones already at 100% - just invalidate cache, no celebration
            logger.log('✅ [MILESTONE UPDATE] All milestones already at 100%, skipping update and celebration');
            queryClient.invalidateQueries({ queryKey: ['goal-milestones', goalId] });
          }
        } else {
          logger.log('ℹ️ [MILESTONE UPDATE] No milestones found for this goal');
        }
      }

      // CRITICAL FIX: Handle is_company_goal false transition
      if (Object.prototype.hasOwnProperty.call(goalUpdates, 'is_company_goal') && goalUpdates.is_company_goal === false) {
        // Immediately remove from company goals list
        setGoals(prev => prev.filter(g => g.id !== goalId));
        
        // Dispatch event to update other views immediately
        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new CustomEvent('company-goal-toggled', {
              detail: { goalId, is_company_goal: false }
            }));
            // Ensure any milestone-based views refresh immediately
            window.dispatchEvent(new CustomEvent('milestone-cache-invalidate', { detail: { goalId } }));
          } catch (e) {
            logger.warn('Failed to dispatch events', e);
          }
        }
      }

      // Handle team assignments separately if provided - use delta approach
      if (team_assignments) {
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

      // Track status changes in Statsig if status was updated
      if (updates.status && oldStatus && oldStatus !== updates.status) {
        try {
          const companyId = userTeams?.[0]?.company_id;
          
          const { trackGoalStatusChanged, trackGoalCompleted } = await import('@/lib/statsigAnalytics');
          
          // Track status change
          trackGoalStatusChanged({
            user_id: user?.id,
            company_id: companyId || undefined,
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
              company_id: companyId || undefined,
              goal_id: goalId,
              days_to_complete: daysToComplete
            });
          }
        } catch (e) {
          // Non-blocking
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Error updating company goal:', error);
      toast({
        title: "Error",
        description: "Failed to update company goal",
        variant: "destructive",
      });
      return false;
    }
  };

  const addGoal = async (title: string, description?: string, ownerId?: string, targetDate?: string) => {
    try {
      // Use provided leadership access or fall back to async check
      const hasAccess = hasLeadershipAccess !== undefined ? hasLeadershipAccess : isLeadershipMember;
      
      // Only leadership members can create company goals
      if (!hasAccess) {
        toast({
          title: "Access Denied",
          description: "Only leadership team members can create company goals",
          variant: "destructive",
        });
        return false;
      }

      // Dispatch optimistic event for onboarding
      window.dispatchEvent(new CustomEvent('optimistic-goal-creation'));
      
      // Get leadership team for company goals - use provided context or search userTeams
      const leadershipTeam = leadershipTeamContext || userTeams.find(team => team.is_leadership === true);
      if (!leadershipTeam) {
        logger.error('🚨 Leadership team context missing:', { 
          leadershipTeamContext, 
          userTeamsCount: userTeams.length,
          userTeams: userTeams.map(t => ({ id: t.id, name: t.name, is_leadership: t.is_leadership }))
        });
        throw new Error('Leadership team not found - required for company goals');
      }
      
      // Get the next display_order for company goals
      const maxOrder = goals.length > 0 ? Math.max(...goals.map(g => g.display_order || 0)) : 0;
      
      // Use provided ownerId or fallback to current user
      const validOwnerId = ownerId && ownerId.trim() !== '' ? ownerId : user?.id;
      if (!validOwnerId) {
        throw new Error('Valid owner ID is required');
      }
      
      const { data: newGoal, error } = await supabase
        .from('team_goals')
        .insert({
          title,
          description,
          team_id: leadershipTeam.id,
          owner_id: validOwnerId,
          target_date: targetDate,
          status: 'on_track',
          archived: false,
          display_order: maxOrder + 1,
          is_company_goal: true // This makes it a company goal
        })
        .select()
        .single();

      if (error) {
        logger.error('Error adding company goal:', error);
        throw error;
      }
      
      // Immediately add to local state
      if (newGoal) {
        const typedNewGoal: TeamGoal = {
          ...newGoal,
          status: newGoal.status as TeamGoal['status'],
          archived: newGoal.archived || false,
          display_order: newGoal.display_order || 0,
          is_company_goal: newGoal.is_company_goal || false,
        };
        setGoals(prev => [...prev, typedNewGoal]);
        
        // Track goal_created event for Statsig
        try {
          const { trackGoalCreated } = await import('@/lib/statsigAnalytics');
          trackGoalCreated({
            user_id: user?.id,
            company_id: leadershipTeam.company_id || undefined,
            goal_id: newGoal.id,
            goal_type: 'annual', // Company goals are typically annual
            goal_title: title
          });
        } catch (e) {
          // Non-blocking
        }
        
        toast({
          title: "Success",
          description: "Company goal created successfully",
        });
        
        return typedNewGoal;
      }
      
      return false;
    } catch (error) {
      logger.error('Error adding company goal:', error);
      toast({
        title: "Error",
        description: "Failed to create company goal",
        variant: "destructive",
      });
      return false;
    }
  };

  const undoArchive = async (goalId: string, originalGoal: TeamGoal) => {
    try {
      // Optimistically restore goal to UI
      setGoals(prev => [originalGoal, ...prev]);

      // Update database to restore
      const { error } = await supabase
        .from('team_goals')
        .update({ 
          archived: false,
          archived_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId);

      if (error) throw error;

      toast({
        title: "Goal restored",
        description: `"${originalGoal.title}" has been restored`
      });

    } catch (error) {
      logger.error('Error restoring goal:', error);
      
      // Remove from UI again if restore failed
      setGoals(prev => prev.filter(g => g.id !== goalId));
      
      toast({
        title: "Error",
        description: "Failed to restore goal",
        variant: "destructive",
      });
    }
  };

  const archiveGoal = async (goalId: string) => {
    const goalToArchive = goals.find(g => g.id === goalId);
    if (!goalToArchive) return false;

    try {
      // Optimistically remove from UI immediately
      setGoals(prev => prev.filter(goal => goal.id !== goalId));

      // Show optimistic feedback with undo option
      toast({
        title: "Goal archived",
        description: `"${goalToArchive.title}" has been archived`,
        action: {
          label: "Undo",
          onClick: () => undoArchive(goalId, goalToArchive)
        }
      });

      // Update database
      const updateData = { 
        archived: true,
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      logger.log('🔍 COMPANY GOALS - Archiving with data:', updateData);
      logger.log('🔍 COMPANY GOALS - Goal to archive:', goalToArchive);
      
      const { data, error } = await supabase
        .from('team_goals')
        .update(updateData)
        .eq('id', goalId)
        .select();

      logger.log('🔍 COMPANY GOALS - Update response:', { data, error });
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      logger.error('Error archiving company goal:', error);
      
      // Rollback optimistic update on error
      setGoals(prev => [goalToArchive, ...prev]);
      
      toast({
        title: "Error",
        description: "Failed to archive goal. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const unarchiveGoal = async (goalId: string) => {
    logger.log('🔓 UNARCHIVE GOAL - Starting unarchive operation');
    logger.log('🎯 Goal ID:', goalId);
    
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
      
      // Reload goals to reflect the change (respects showArchived filter)
      logger.log('🔄 Reloading company goals...');
      await loadCompanyGoals({ silent: true });
      
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
    logger.log('🗑️ DELETE COMPANY GOAL - Starting delete operation');
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
    loadCompanyGoals();
  }, [teamIdsKey, user?.id, currentCompanyId, showArchived]);

  // Listen for company goal toggle events for instant refresh
  useEffect(() => {
    const handler = (e: any) => {
      try {
        const detail = e?.detail || {};
        if (detail && Object.prototype.hasOwnProperty.call(detail, 'is_company_goal')) {
          logger.log('⚡ Company Goals: company-goal-toggled event received:', detail);
          
          // Optimistically update local state immediately
          if (detail.goalId && detail.is_company_goal === false) {
            // Remove the goal from company goals if it's no longer a company goal
            setGoals(prev => prev.filter(g => g.id !== detail.goalId));
            logger.log('🗑️ Company Goals: Optimistically removed goal from company goals:', detail.goalId);
          } else if (detail.goalId && detail.is_company_goal === true && detail.optimisticGoal) {
            // Add the goal to company goals optimistically
            setGoals(prev => {
              const exists = prev.some(g => g.id === detail.goalId);
              if (!exists) {
                const sortedGoals = [...prev, detail.optimisticGoal].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
                logger.log('➕ Company Goals: Optimistically added goal to company goals:', detail.goalId);
                return sortedGoals;
              }
              return prev;
            });
          }
          
          // Still refresh to ensure consistency
          loadCompanyGoals({ silent: true });
        }
      } catch (err) {
        logger.warn('Company Goals: error handling company-goal-toggled event', err);
      }
    };
    window.addEventListener('company-goal-toggled', handler as EventListener);
    return () => window.removeEventListener('company-goal-toggled', handler as EventListener);
  }, [teamIdsKey, user]);

  // Debounced reload function to prevent excessive updates
  const debouncedReload = useDebounce(async () => {
    const sectionId = 'company';
    if (!isReorderingRef.current && !isSectionReordering(sectionId)) {
      logger.log(`🔄 Company goals debounced reload EXECUTING for section ${sectionId}`);
      await loadCompanyGoals({ silent: true });
    } else {
      logger.log(`🚫 Company goals debounced reload BLOCKED for section ${sectionId} due to scoped reordering lock`);
    }
  }, 250);

  // Real-time subscription for company goals
  useEffect(() => {
    if (!isLeadershipMember || !user?.id) {
      return;
    }

    // Use memoized company ID
    if (!currentCompanyId) {
      return;
    }
    
    const channel = supabase
      .channel(`company_goals_changes_${currentCompanyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_goals'
          // FIXED: Remove filter to catch all goal changes, including is_company_goal transitions
        },
        async (payload: any) => {
          // Company goals use 'company' as section ID
          const sectionId = 'company';
          
          // CRITICAL: Block during optimistic updates to prevent race conditions
          if (isOptimisticallyUpdatingRef.current) {
            return;
          }
          
          // Only block updates for company section if it's being reordered
          if (isReorderingRef.current || isSectionReordering(sectionId)) {
            return;
          }
          
          // ✅ CRITICAL FIX: Check if this goal was recently updated by current user to avoid self-triggering
          // This prevents the user who made the change from reloading unnecessarily
          // The optimistic update already handles the UI update, so reload is only needed for remote changes
          const goalId = (payload.new as any)?.id || (payload.old as any)?.id;
          if (goalId && recentlyUpdatedGoalIdsRef.current.has(goalId)) {
            return;
          }
          
          // ✅ CRITICAL FIX: Check if this change is relevant to our company
          // Use ref to avoid closure stale issues - always gets the latest userTeams value
          const goalTeamId = (payload.new as any)?.team_id || (payload.old as any)?.team_id;
          const currentUserTeams = userTeamsRef.current; // Always use latest value from ref
          const isRelevantToCompany = goalTeamId ? currentUserTeams?.some(team => team.id === goalTeamId) : false;
          
          if (!isRelevantToCompany) {
            return;
          }
          
          // Check if this is a company goal related change
          const isCompanyGoalRelated = 
            (payload.new as any)?.is_company_goal === true || 
            (payload.old as any)?.is_company_goal === true;
          
          if (!isCompanyGoalRelated) {
            return;
          }
          
          // Use debounced reload to prevent excessive updates
          debouncedReload();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLeadershipMember, user?.id, currentCompanyId, debouncedReload]);

  // Update goal progress specifically for progress sliders
  const updateGoalProgress = useCallback(async (goalId: string, progress: number) => {
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
      setGoals(prev =>
        prev.map(goal =>
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
        // Revert optimistic update on error
        await loadCompanyGoals({ silent: true });
        throw error;
      }
      
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
  }, [toast, loadCompanyGoals, goals]);

  // Cleanup all pending timeouts on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      pendingTimeoutsRef.current.forEach(timer => clearTimeout(timer));
      pendingTimeoutsRef.current.clear();
    };
  }, []);

  return {
    goals,
    setGoals,
    loading,
    isLeadershipMember,
    addGoal,
    refetch: loadCompanyGoals,
    reorderCompanyGoals,
    updateGoal,
    updateGoalProgress,
    archiveGoal,
    unarchiveGoal,
    deleteGoal,
    undoArchive, // Keep for toast undo functionality
    setOptimisticUpdating, // Export for bulk archive protection
  };
};
