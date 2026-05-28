
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCompanyGoals } from '@/hooks/useCompanyGoals';
import { useProfiles } from '@/hooks/useProfiles';
import { Target, Building2 } from 'lucide-react';
import { celebrate } from '@/lib/celebration';
import { DraggableCompanyGoalItem } from './goals/DraggableCompanyGoalItem';
import { CompanyGoalItem } from './goals/CompanyGoalItem';
import { EditGoalModal } from '@/components/modals/EditGoalModal';
import { TeamGoal } from '@/hooks/useTeamGoals';
import { logger } from '@/utils/logger';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

interface CompanyGoalsSectionProps {
  teams?: any[];
}

export const CompanyGoalsSection: React.FC<CompanyGoalsSectionProps> = ({ teams }) => {
  const { goals, loading, isLeadershipMember, reorderCompanyGoals, updateGoal, archiveGoal } = useCompanyGoals(teams);
  const { profiles } = useProfiles();
  const [editingGoal, setEditingGoal] = useState<TeamGoal | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [displayedGoals, setDisplayedGoals] = useState(goals);

  // Keep local displayed order in sync when source goals change
  useEffect(() => {
    setDisplayedGoals(goals);
  }, [goals]);

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
      setDisplayedGoals(newGoals);
      const goalIds = newGoals.map(goal => goal.id);
      
      try {
        await reorderCompanyGoals(goalIds);
      } catch (e) {
        logger.error('Failed to reorder company goals', e);
        setDisplayedGoals(goals);
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };
  const handleEditGoal = (goal: TeamGoal) => {
    logger.debug('CompanyGoalsSection: Editing company goal:', goal);
    setEditingGoal(goal);
    setShowEditModal(true);
  };

  const handleUpdateGoal = async (goalId: string, updates: Partial<TeamGoal>) => {
    logger.debug('CompanyGoalsSection: Updating company goal:', goalId, updates);
    const success = await updateGoal(goalId, updates);
    if (success) {
      setShowEditModal(false);
      setEditingGoal(null);
    }
    return success;
  };

  const handleStatusUpdate = async (goalId: string, status: TeamGoal['status']) => {
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
    }
  };

  const handleArchive = async (goalId: string) => {
    await archiveGoal(goalId);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-[16px] font-semibold text-foreground">
          Company Goals
        </h2>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded-[4px]"></div>
          <div className="h-4 bg-muted rounded-[4px]"></div>
          <div className="h-4 bg-muted rounded-[4px]"></div>
        </div>
      </div>
    );
  }

  // Show company goals to all users, but only allow editing for leadership
  // (Edit functionality is already restricted in the hook and components)

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-[16px] font-semibold text-foreground">
            Company Goals
          </h2>
          <p className="text-[13px] text-muted-foreground">
            Goals that impact the entire company
          </p>
        </div>
        
        {goals.length === 0 ? (
          <div className="text-center py-8">
            <Target className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-1">No company goals yet</p>
            <p className="text-[13px] text-muted-foreground">
              Mark team goals as company goals to see them here
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext items={displayedGoals.map(goal => goal.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {displayedGoals.map((goal) => (
                  <DraggableCompanyGoalItem
                    key={goal.id}
                    goal={goal}
                    onEdit={handleEditGoal}
                    onArchive={handleArchive}
                    onStatusUpdate={handleStatusUpdate}
                    getProfileName={getProfileName}
                    getProfile={getProfile}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <EditGoalModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        goal={editingGoal}
        onUpdate={handleUpdateGoal}
        teamId={editingGoal?.team_id || ''}
      />
    </>
  );
};
