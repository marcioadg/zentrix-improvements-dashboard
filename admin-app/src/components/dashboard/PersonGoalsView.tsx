import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useTeamGoals, TeamGoal } from '@/hooks/useTeamGoals';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { AddGoalItem } from './goals/AddGoalItem';
import { EditGoalModal } from '@/components/modals/EditGoalModal';
import { getEndOfCurrentQuarter, formatDateForInput } from '@/lib/dateUtils';
import { UserAvatar } from '@/components/UserAvatar';
import { User, Plus } from 'lucide-react';
import { celebrate } from '@/lib/celebration';
import { Button } from '@/components/ui/button';
import { useGlobalReorderLock } from '@/hooks/useGlobalReorderLock';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { DraggableGoalItem } from './goals/DraggableGoalItem';
import { logger } from '@/utils/logger';

interface PersonGoalsViewProps {
  teamId: string;
  onRefreshReady?: (refreshFn: () => void) => void;
  // Meeting context props to avoid dual data sources
  externalGoals?: TeamGoal[];
  externalLoading?: boolean;
  externalSetGoals?: (goals: TeamGoal[] | ((prev: TeamGoal[]) => TeamGoal[])) => void;
  externalSetDragging?: (dragging: boolean) => void;
  externalUpdateGoalStatus?: (goalId: string, status: TeamGoal['status']) => Promise<boolean>;
  externalUpdateGoalProgress?: (goalId: string, progress: number) => Promise<boolean>;
}

interface PersonGoalsGroup {
  personId: string;
  personName: string;
  goals: TeamGoal[];
}

export const PersonGoalsView: React.FC<PersonGoalsViewProps> = ({ 
  teamId, 
  onRefreshReady,
  externalGoals,
  externalLoading,
  externalSetGoals,
  externalSetDragging,
  externalUpdateGoalStatus,
  externalUpdateGoalProgress
}) => {
  // Use external data source if provided (meeting context), otherwise use own hook
  const hookData = useTeamGoals(teamId); // Always pass teamId for operations like addGoal
  
  const goals = externalGoals || hookData.goals;
  const setGoals = externalSetGoals || hookData.setGoals;
  const loading = externalLoading !== undefined ? externalLoading : hookData.loading;
  const addGoal = hookData.addGoal;
  const updateGoal = hookData.updateGoal;
  const updateGoalStatus = externalUpdateGoalStatus || hookData.updateGoalStatus;
  const updateGoalProgress = externalUpdateGoalProgress || hookData.updateGoalProgress;
  const reorderGoals = hookData.reorderGoals;
  const archiveGoal = hookData.archiveGoal;
  const refetch = hookData.refetch;
  const { members } = useTeamMembers(teamId);
  const { profiles } = useProfiles();
  const { user } = useAuth();
  const { toast } = useToast();

  const [editingGoal, setEditingGoal] = useState<TeamGoal | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const lastOverIdRef = useRef<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { setGlobalReordering } = useGlobalReorderLock();

  // Expose refetch function to parent
  React.useEffect(() => {
    onRefreshReady?.(refetch);
  }, [onRefreshReady, refetch]);

  // Don't render anything until core dependencies are ready to prevent undefined function errors
  if (!teamId || loading) {
    logger.log('🔍 PersonGoalsView: Waiting for core dependencies', { teamId: !!teamId, loading });
    return (
      <div className="w-full max-w-5xl mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Goals</h1>
          </div>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading goals...</p>
        </div>
      </div>
    );
  }

  // Early return if user is not available - safer than blocking render
  if (!user) {
    logger.warn('🔍 PersonGoalsView: User not available, rendering minimal view');
    return (
      <div className="w-full max-w-5xl mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Please log in to view goals.</p>
        </div>
      </div>
    );
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getProfileName = (userId: string) => {
    const profile = profiles.find(p => p.id === userId);
    return profile ? profile.full_name : 'Unknown User';
  };

  const getProfile = (userId: string) => {
    return profiles.find(p => p.id === userId);
  };

  // Filter out members with invalid user_id values
  const validMembers = members.filter(member => 
    member.user_id && member.user_id.trim() !== ''
  );

  // Group goals by person and include all team members (including company goals)
  const personGoalsGroups: PersonGoalsGroup[] = React.useMemo(() => {
    // Include all goals (company goals should appear in both sections)
    const teamGoalsOnly = goals;
    
    // Create a map of all team members
    const memberMap = new Map();
    validMembers.forEach(member => {
      memberMap.set(member.user_id, {
        personId: member.user_id,
        personName: getProfileName(member.user_id),
        goals: []
      });
    });

    // Add goals to their respective owners
    teamGoalsOnly.forEach(goal => {
      if (memberMap.has(goal.owner_id)) {
        memberMap.get(goal.owner_id).goals.push(goal);
      } else {
        // Handle case where goal owner is not in current team members
        memberMap.set(goal.owner_id, {
          personId: goal.owner_id,
          personName: getProfileName(goal.owner_id),
          goals: [goal]
        });
      }
    });

    // Convert map to array and sort (people with goals first, then alphabetically)
    return Array.from(memberMap.values())
      .sort((a, b) => {
        // First, sort by whether they have goals (people with goals come first)
        if (a.goals.length > 0 && b.goals.length === 0) return -1;
        if (a.goals.length === 0 && b.goals.length > 0) return 1;
        
        // Then sort alphabetically within each group
        return a.personName.localeCompare(b.personName);
      });
  }, [goals, validMembers, profiles]);

  const handleQuickAddGoal = async (title: string, personId?: string) => {
    // Use specified person or current authenticated user as default owner, fallback to first valid member
    const defaultOwner = personId || user?.id || (validMembers.length > 0 ? validMembers[0].user_id : '');
    
    // Get end of current quarter as default target date
    const quarterEndDate = formatDateForInput(getEndOfCurrentQuarter());
    
    // If in meeting context, optimistically update the external state immediately
    if (externalGoals && setGoals) {
      const tempId = `temp-${Date.now()}`;
      const newGoal: TeamGoal = {
        id: tempId,
        title,
        description: undefined,
        owner_id: defaultOwner,
        target_date: quarterEndDate,
        status: 'on_track',
        team_id: teamId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        display_order: goals.length > 0 ? Math.max(...goals.map(g => g.display_order || 0)) + 1 : 0,
        archived: false,
        is_company_goal: false
      };
      
      // Optimistically add to meeting goals
      setGoals((prev: TeamGoal[]) => [...prev, newGoal]);
      
    // Dispatch optimistic event for onboarding
      logger.log('🎯 PersonGoalsView: Dispatching optimistic goal creation event for onboarding');
      window.dispatchEvent(new CustomEvent('optimistic-goal-creation'));
      
      const result = await addGoal(title, undefined, defaultOwner, quarterEndDate);
      if (result && typeof result === 'object') {
        // Success - replace temporary goal with real goal
        setGoals((prev: TeamGoal[]) => 
          prev.map(g => g.id === tempId ? result : g)
        );
        
        toast({
          title: "Goal added",
          description: "New goal has been created.",
        });
        
        return true; // Return success for AddGoalItem
      } else {
        // Remove optimistic goal if creation failed
        setGoals((prev: TeamGoal[]) => prev.filter(g => !g.id.startsWith('temp-')));
        return false;
      }
    } else {
      // Not in meeting context - use normal flow
      // Dispatch optimistic event for onboarding
      logger.log('🎯 PersonGoalsView: Dispatching optimistic goal creation event for onboarding');
      window.dispatchEvent(new CustomEvent('optimistic-goal-creation'));
      
      const result = await addGoal(title, undefined, defaultOwner, quarterEndDate);
      if (result && typeof result === 'object') {
        toast({
          title: "Goal added",
          description: "New goal has been created.",
        });
        return true;
      } else {
        return false;  
      }
    }
  };

  const handleStatusUpdate = async (goalId: string, status: any) => {
    // Find the current goal for rollback
    const currentGoal = goals.find(g => g.id === goalId);
    if (!currentGoal) return;

    try {
      // Celebrate when goal is completed (before update)
      if (status === 'complete') {
        celebrate();
      }

      // In dashboard context, do optimistic update here
      if (!externalGoals) {
        // Optimistically update local state (dashboard only)
        setGoals(prev => prev.map(goal => 
          goal.id === goalId ? { ...goal, status } : goal
        ));

        toast({
          title: "Goal updated",
          description: "Goal status has been updated.",
        });
      }

      // Perform actual database update
      const success = await updateGoalStatus(goalId, status);
      
      if (!success && !externalGoals) {
        // Rollback if update failed (dashboard only)
        setGoals(prev => prev.map(goal => 
          goal.id === goalId ? { ...goal, status: currentGoal.status } : goal
        ));
      }
    } catch (error) {
      logger.error('Error updating goal status:', error);
      
      // Rollback optimistic update on error
      setGoals(prev => prev.map(goal => 
        goal.id === goalId ? { ...goal, status: currentGoal.status } : goal
      ));
      
      toast({
        title: "Error",
        description: "Failed to update goal status",
        variant: "destructive",
      });
    }
  };

  const handleArchive = async (goalId: string) => {
    await archiveGoal(goalId);
  };

  const handleEditGoal = (goal: TeamGoal) => {
    setEditingGoal(goal);
    setShowEditModal(true);
  };

  const handleUpdateGoal = async (goalId: string, updates: Partial<TeamGoal>) => {
    const success = await updateGoal(goalId, updates);
    if (success) {
      toast({
        title: "Goal updated",
        description: "Goal has been updated successfully.",
      });
    }
    return success;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setIsDragging(true);
    setGlobalReordering(true); // Block ALL goal subscriptions during drag
    externalSetDragging?.(true); // Notify parent if in meeting context
    lastOverIdRef.current = null;
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    
    // Only update visual feedback for drag over, don't move goals in the list
    lastOverIdRef.current = overIdStr;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeGoal = goals.find(g => g.id === String(active.id));
    if (!activeGoal) return;

    // Is the drop target another goal or a person container?
    const overGoal = goals.find(g => g.id === String(over.id));

    if (overGoal) {
      if (activeGoal.owner_id === overGoal.owner_id) {
        // Reorder within the same owner
        const ownerId = activeGoal.owner_id;
        const personGoals = goals.filter(g => g.owner_id === ownerId);
        const oldIndex = personGoals.findIndex(g => g.id === activeGoal.id);
        const newIndex = personGoals.findIndex(g => g.id === overGoal.id);
        const newPersonGoals = arrayMove(personGoals, oldIndex, newIndex);
        const goalIds = newPersonGoals.map(g => g.id);

        const previousGoals = goals;
        // Replace this owner's items in the new order while keeping others untouched
        const queue = [...newPersonGoals];
        const updatedGoals = previousGoals.map(g => (g.owner_id === ownerId ? queue.shift()! : g));
        setGoals(updatedGoals);

        try {
          const success = await reorderGoals(goalIds);
          if (!success) setGoals(previousGoals);
        } catch (err) {
          logger.error('Reorder failed, reverting:', err);
          setGoals(previousGoals);
        }
        return;
      } else {
        // Move to a different owner: insert before the overGoal
        const newOwnerId = overGoal.owner_id;
        const oldOwnerId = activeGoal.owner_id;
        const previousGoals = goals;
        const movedGoal = { ...activeGoal, owner_id: newOwnerId };
        
        // Remove the active goal first
        const withoutActive = previousGoals.filter(g => g.id !== activeGoal.id);
        
        // Find the exact position to insert before the target goal
        const targetIndex = withoutActive.findIndex(g => g.id === overGoal.id);
        const updatedGoals = [
          ...withoutActive.slice(0, targetIndex),
          movedGoal,
          ...withoutActive.slice(targetIndex),
        ];
        setGoals(updatedGoals);

        try {
          // Reorder both source and target owners based on new local order
          const newOwnerIds = updatedGoals.filter(g => g.owner_id === newOwnerId).map(g => g.id);
          const oldOwnerIds = updatedGoals.filter(g => g.owner_id === oldOwnerId).map(g => g.id);

          await reorderGoals(newOwnerIds);
          await reorderGoals(oldOwnerIds);

          // Then, update owner in DB
          const ok = await updateGoal(activeGoal.id, { owner_id: newOwnerId });
          if (ok) {
            toast({
              title: 'Goal reassigned',
              description: `Goal "${activeGoal.title}" has been assigned to ${getProfileName(newOwnerId)}`,
            });
          } else {
            setGoals(previousGoals);
          }
        } catch (err) {
          logger.error('Ownership change failed, reverting:', err);
          setGoals(previousGoals);
          toast({ title: 'Error', description: 'Failed to reassign goal', variant: 'destructive' });
        }
        return;
      }
    }

    // Dropped on a person container (empty space) - append to end of that person's goals
    const targetPersonId = String(over.id);
    if (targetPersonId && targetPersonId !== activeGoal.owner_id) {
      const previousGoals = goals;
      const oldOwnerId = activeGoal.owner_id;
      const movedGoal = { ...activeGoal, owner_id: targetPersonId };
      const withoutActive = previousGoals.filter(g => g.id !== activeGoal.id);
      
      // Find the last goal of the target owner and insert after it
      let insertIndex = withoutActive.length; // Default to end
      for (let i = withoutActive.length - 1; i >= 0; i--) {
        if (withoutActive[i].owner_id === targetPersonId) {
          insertIndex = i + 1;
          break;
        }
      }
      
      const updatedGoals = [
        ...withoutActive.slice(0, insertIndex),
        movedGoal,
        ...withoutActive.slice(insertIndex),
      ];
      setGoals(updatedGoals);

      try {
        // Reorder both source and target owners
        const newOwnerIds = updatedGoals.filter(g => g.owner_id === targetPersonId).map(g => g.id);
        const oldOwnerIds = updatedGoals.filter(g => g.owner_id === oldOwnerId).map(g => g.id);

        await reorderGoals(newOwnerIds);
        await reorderGoals(oldOwnerIds);

        const ok = await updateGoal(activeGoal.id, { owner_id: targetPersonId });
        if (ok) {
          toast({
            title: 'Goal reassigned',
            description: `Goal "${activeGoal.title}" has been assigned to ${getProfileName(targetPersonId)}`,
          });
        } else {
          setGoals(previousGoals);
        }
      } catch (err) {
        logger.error('Ownership change failed, reverting:', err);
        setGoals(previousGoals);
        toast({ title: 'Error', description: 'Failed to reassign goal', variant: 'destructive' });
      }
    }
    
    setActiveId(null);
    setIsDragging(false);
    setGlobalReordering(false); // Unblock ALL goal subscriptions after drag ends
    externalSetDragging?.(false); // Notify parent if in meeting context
  };

  // Only show loading skeleton on initial load with empty goals list  
  if (loading && goals.length === 0) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded"></div>
          <div className="h-4 bg-muted rounded"></div>
          <div className="h-4 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  // Create a stable, memoized person container component
  const DroppablePersonContainer = React.memo<{ 
    personGroup: PersonGoalsGroup;
    profile: any;
    children: React.ReactNode;
  }>(({ personGroup, profile, children }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: personGroup.personId,
    });

    const shouldHighlight = isOver && activeId && goals.find(g => g.id === activeId)?.owner_id !== personGroup.personId;

    return (
      <div 
        ref={setNodeRef}
        className={`border border-border/50 rounded-lg p-4 ${
          shouldHighlight ? 'ring-2 ring-primary/40 bg-primary/5' : ''
        }`}
        style={{
          transition: isDragging ? 'none' : 'all 0.2s ease-out'
        }}
      >
        {children}
      </div>
    );
  });


  const activeGoal = activeId ? goals.find(g => g.id === activeId) : null;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4">
          {/* Person Groups - Always show all team members */}
          {personGoalsGroups.length > 0 ? (
            <div className="space-y-4">
                {personGoalsGroups.map((personGroup) => {
                  const profile = getProfile(personGroup.personId);
                  
                  // Memoize person header to prevent re-renders during drag
                  const PersonHeader = React.memo(() => (
                    <div className="flex items-center gap-3 mb-4" style={{ pointerEvents: isDragging ? 'none' : 'auto' }}>
                      <div className="relative flex-shrink-0" style={{ opacity: isDragging ? 0.7 : 1 }}>
                        <UserAvatar
                          userId={personGroup.personId}
                          fullName={profile?.full_name}
                          email={profile?.email}
                          avatarUrl={profile?.avatar_url}
                          size="md"
                          enableAssigneeSelect={false}
                          assigneeTeamId={teamId}
                          selectedAssigneeId={personGroup.personId}
                          showChevron={false}
                        />
                      </div>
                      <div className="text-left min-w-0 flex-1">
                        <h3 className="font-medium text-sm truncate">{personGroup.personName}</h3>
                      </div>
                    </div>
                  ));

                  return (
                    (personGroup.goals.length > 0 ? (
                      <DroppablePersonContainer 
                        key={personGroup.personId}
                        personGroup={personGroup}
                        profile={profile}
                      >
                        <PersonHeader />
                        <div className="space-y-3">
                          <SortableContext 
                            items={personGroup.goals.map(goal => goal.id)} 
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-3">
                              {personGroup.goals.map((goal) => (
                                 <DraggableGoalItem
                                   key={goal.id}
                                   goal={goal}
                                   onStatusUpdate={handleStatusUpdate}
                                   onArchive={handleArchive}
                                   onEdit={handleEditGoal}
                                   onProgressUpdate={updateGoalProgress}
                                   onOwnerChange={async (goalId, newOwnerId) => {
                                     const success = await updateGoal(goalId, { owner_id: newOwnerId });
                                     if (success) {
                                       refetch();
                                     }
                                     return success;
                                   }}
                                   getProfileName={getProfileName}
                                   getProfile={getProfile}
                                   teamId={teamId}
                                 />
                              ))}
                            </div>
                          </SortableContext>
                          <AddGoalItem 
                            onAddGoal={(title) => handleQuickAddGoal(title, personGroup.personId)} 
                          />
                        </div>
                      </DroppablePersonContainer>
                    ) : (
                      <DroppablePersonContainer 
                        key={personGroup.personId}
                        personGroup={personGroup}
                        profile={profile}
                      >
                        <PersonHeader />
                        <div className="space-y-3">
                          <AddGoalItem 
                            onAddGoal={(title) => handleQuickAddGoal(title, personGroup.personId)} 
                          />
                        </div>
                      </DroppablePersonContainer>
                     ))
                    );
                })}
            </div>
          ) : (
            /* Empty State - Only when no team members */
            <div className="text-center py-8">
              <User className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-sm font-medium text-foreground mb-1">No team members</h3>
              <p className="text-sm text-muted-foreground">Add team members to start creating goals.</p>
            </div>
          )}
        </div>
        
        <DragOverlay>
          {activeGoal ? (
            <div className="bg-card border border-border rounded-lg shadow-xl opacity-95 transform rotate-2 scale-105">
              <DraggableGoalItem
                goal={activeGoal}
                onStatusUpdate={() => {}}
                onArchive={() => {}}
                onEdit={() => {}}
                onOwnerChange={async (goalId, newOwnerId) => {
                  const success = await updateGoal(goalId, { owner_id: newOwnerId });
                  if (success) {
                    refetch();
                  }
                  return success;
                }}
                getProfileName={getProfileName}
                getProfile={getProfile}
                teamId={teamId}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <EditGoalModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        goal={editingGoal}
        onUpdate={handleUpdateGoal}
        teamId={teamId}
      />
    </>
  );
};
