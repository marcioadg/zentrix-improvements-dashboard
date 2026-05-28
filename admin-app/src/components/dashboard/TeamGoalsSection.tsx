import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useTeamGoals, TeamGoal } from '@/hooks/useTeamGoals';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AddGoalItem } from './goals/AddGoalItem';
import { EditGoalModal } from '@/components/modals/EditGoalModal';
import { getEndOfCurrentQuarter, formatDateForInput } from '@/lib/dateUtils';
import { celebrate } from '@/lib/celebration';
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
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { DraggableGoalItem } from './goals/DraggableGoalItem';
import { logger } from '@/utils/logger';

interface TeamGoalsSectionProps {
  meetingId?: string;
  teamId: string;
  onRefreshReady?: (refreshFn: () => void) => void;
}

export const TeamGoalsSection: React.FC<TeamGoalsSectionProps> = ({ 
  meetingId, 
  teamId, 
  onRefreshReady 
}) => {
  const { goals, setGoals, loading, addGoal, updateGoal, updateGoalStatus, updateGoalProgress, reorderGoals, archiveGoal, unarchiveGoal, refetch } = useTeamGoals(teamId);
  const { members } = useTeamMembers(teamId);
  const { profiles } = useProfiles();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [editingGoal, setEditingGoal] = useState<TeamGoal | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Local display state for optimistic reordering (mirrors CompanyGoals pattern)
  const [displayedGoals, setDisplayedGoals] = useState(goals);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Sync with goals data when it changes - but prevent unnecessary overwrites during optimistic updates
  useEffect(() => {
    // Don't sync if we're currently dragging (activeId exists)
    if (activeId) return;
    
    // Check if the current displayedGoals order matches the new goals order
    const currentOrder = displayedGoals.map(g => g.id).join(',');
    const newOrder = goals.map(g => g.id).join(',');
    
    // Only sync if the order actually differs or if it's the initial load
    if (currentOrder !== newOrder || displayedGoals.length !== goals.length) {
      setDisplayedGoals(goals);
    }
  }, [goals, activeId, displayedGoals]);

  // Expose refetch function to parent
  useEffect(() => {
    onRefreshReady?.(refetch);
  }, [onRefreshReady, refetch]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
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

  const handleQuickAddGoal = async (title: string): Promise<boolean> => {
    // Use current authenticated user as default owner, fallback to first valid member
    const defaultOwner = user?.id || (validMembers.length > 0 ? validMembers[0].user_id : '');
    
    // Get end of current quarter as default target date
    const quarterEndDate = formatDateForInput(getEndOfCurrentQuarter());
    
    // Dispatch optimistic event for onboarding
    logger.log('🎯 TeamGoalsSection: Dispatching optimistic goal creation event for onboarding');
    window.dispatchEvent(new CustomEvent('optimistic-goal-creation'));
    
    const result = await addGoal(title, undefined, defaultOwner, quarterEndDate);
    if (result && typeof result === 'object') {
      toast({
        title: "Goal added",
        description: "New goal has been created.",
      });
      return true;
    }
    return false;
  };

  const handleStatusUpdate = async (goalId: string, status: any) => {
    // Find the current goal for rollback
    const currentGoal = displayedGoals.find(g => g.id === goalId);
    if (!currentGoal) return;

    try {
      // Celebrate when goal is completed (before optimistic update)
      if (status === 'complete') {
        celebrate();
      }

      // Optimistically update local state
      setDisplayedGoals(prev => prev.map(goal => 
        goal.id === goalId ? { ...goal, status } : goal
      ));

      toast({
        title: "Goal updated",
        description: "Goal status has been updated.",
      });

      // Perform actual database update
      const success = await updateGoal(goalId, { status });
      
      if (!success) {
        // Rollback if update failed
        setDisplayedGoals(prev => prev.map(goal => 
          goal.id === goalId ? { ...goal, status: currentGoal.status } : goal
        ));
      }

    } catch (error) {
      logger.error('Error updating goal status:', error);
      
      // Rollback optimistic update on error
      setDisplayedGoals(prev => prev.map(goal => 
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

  const handleUnarchive = async (goalId: string) => {
    await unarchiveGoal(goalId);
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
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = displayedGoals.findIndex(goal => goal.id === active.id);
      const newIndex = displayedGoals.findIndex(goal => goal.id === over.id);
      
      const newGoals = arrayMove(displayedGoals, oldIndex, newIndex);
      const goalIds = newGoals.map(goal => goal.id);
      
      try {
        await reorderGoals(goalIds);
      } catch (e) {
        // Revert handled by reorderGoals function
        logger.error('Reorder failed:', e);
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="space-y-4 pt-6">
          {/* Goals List with Drag and Drop */}
          {displayedGoals.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext 
                items={displayedGoals.map(goal => goal.id)} 
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {displayedGoals.map((goal) => (
                     <DraggableGoalItem
                        key={goal.id}
                        goal={goal}
                        onStatusUpdate={handleStatusUpdate}
                        onArchive={handleArchive}
                        onUnarchive={handleUnarchive}
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
            </DndContext>
          )}

          {/* Add Goal Item - Always visible */}
          <AddGoalItem onAddGoal={handleQuickAddGoal} />

          {/* Empty State - Only when no goals */}
          {displayedGoals.length === 0 && (
            <div className="text-center py-4">
              <h3 className="text-sm font-medium text-foreground mb-1">No goals yet</h3>
              <p className="text-sm text-muted-foreground">Add your first team goal above to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

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
