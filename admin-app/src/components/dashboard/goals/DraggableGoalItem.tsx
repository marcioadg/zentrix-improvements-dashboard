
import React, { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { GoalItem } from './GoalItem';
import { TeamGoal } from '@/hooks/useTeamGoals';
import { logger } from '@/utils/logger';

interface DraggableGoalItemProps {
  goal: TeamGoal;
  onStatusUpdate: (goalId: string, status: TeamGoal['status']) => void;
  onArchive: (goalId: string) => void;
  onUnarchive?: (goalId: string) => void;
  onDelete?: (goalId: string) => void;
  onEdit: (goal: TeamGoal) => void;
  onProgressUpdate?: (goalId: string, progress: number) => Promise<boolean>;
  onDateUpdate?: (goalId: string, date: Date) => void;
  onOwnerChange?: (goalId: string, newOwnerId: string) => Promise<boolean>;
  onMilestoneChanged?: (goalId: string, action: 'created' | 'updated' | 'deleted', milestoneId?: string) => void;
  getProfileName: (userId: string) => string;
  getProfile: (userId: string) => any;
  teamId: string;
  showArchived?: boolean;
}

export const DraggableGoalItem: React.FC<DraggableGoalItemProps> = memo(({
  goal,
  onStatusUpdate,
  onArchive,
  onUnarchive,
  onDelete,
  onEdit,
  onProgressUpdate,
  onDateUpdate,
  onOwnerChange,
  onMilestoneChanged,
  getProfileName,
  getProfile,
  teamId,
  showArchived = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: goal.id, data: { type: 'team_goal', goal } });

  // Add logging to verify draggable setup
  React.useEffect(() => {
    logger.log('🏗️ DraggableGoalItem rendered:', {
      goalId: goal.id,
      goalTitle: goal.title,
      hasListeners: !!listeners,
      hasAttributes: !!attributes,
      isDragging
    });
  }, [goal.id, goal.title, listeners, attributes, isDragging]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition, // Disable transition during drag for smoother experience
    opacity: isDragging ? 0.8 : 1, // Less opacity reduction to keep visibility
    zIndex: isDragging ? 50 : 'auto', // Ensure dragged item stays on top
  };

  return (
    <div ref={setNodeRef} style={style} className="relative will-change-transform transform-gpu" data-testid={`draggable-goal-${goal.id}`}>
      <div className={`group flex items-center gap-3 bg-card border border-border rounded-[6px] shadow-sm hover:shadow-md transition-colors duration-150 px-4 py-3 ${showArchived ? 'opacity-60 bg-muted/30' : ''}`}>
        {/* Drag Handle - Now visible by default for easier dragging */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors opacity-60 hover:opacity-100 flex items-center justify-center flex-shrink-0 select-none touch-none"
          title="Drag to reorder goals"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        
        {/* Goal Item with responsive padding */}
        <div className="flex-1 min-w-0">
          <GoalItem
            goal={goal}
            onStatusUpdate={onStatusUpdate}
            onArchive={onArchive}
            onUnarchive={onUnarchive}
            onDelete={onDelete}
            onEdit={onEdit}
            onProgressUpdate={onProgressUpdate}
            onDateUpdate={onDateUpdate}
            onOwnerChange={onOwnerChange}
            onMilestoneChanged={onMilestoneChanged}
            getProfileName={getProfileName}
            getProfile={getProfile}
            teamId={teamId}
            showArchived={showArchived}
          />
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if goal data actually changed
  return (
    prevProps.goal.id === nextProps.goal.id &&
    prevProps.goal.title === nextProps.goal.title &&
    prevProps.goal.status === nextProps.goal.status &&
    prevProps.goal.progress === nextProps.goal.progress &&
    prevProps.goal.owner_id === nextProps.goal.owner_id &&
    prevProps.goal.target_date === nextProps.goal.target_date &&
    prevProps.goal.updated_at === nextProps.goal.updated_at
  );
});
