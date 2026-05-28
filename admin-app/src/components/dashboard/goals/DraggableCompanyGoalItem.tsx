
import React, { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { CompanyGoalItem } from './CompanyGoalItem';
import { TeamGoal } from '@/hooks/useTeamGoals';
import { useOptimisticOwnership } from '@/hooks/useOptimisticOwnership';

interface DraggableCompanyGoalItemProps {
  goal: TeamGoal;
  onEdit?: (goal: TeamGoal) => void;
  onArchive?: (goalId: string) => void;
  onUnarchive?: (goalId: string) => void;
  onDelete?: (goalId: string) => void;
  onStatusUpdate?: (goalId: string, status: TeamGoal['status']) => void;
  onProgressUpdate?: (goalId: string, progress: number) => Promise<boolean>;
  onDateUpdate?: (goalId: string, date: Date) => void;
  onMilestoneChanged?: (goalId: string, action: 'created' | 'updated' | 'deleted', milestoneId?: string) => void;
  onOwnerChange?: (goalId: string, previousOwnerId: string, newOwnerId: string) => void;
  getProfileName: (userId: string) => string;
  getProfile: (userId: string) => any;
  showArchived?: boolean;
}

export const DraggableCompanyGoalItem: React.FC<DraggableCompanyGoalItemProps> = memo(({
  goal,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
  onStatusUpdate,
  onProgressUpdate,
  onDateUpdate,
  onMilestoneChanged,
  onOwnerChange,
  getProfileName,
  getProfile,
  showArchived = false,
}) => {
  const { isMetricSyncing } = useOptimisticOwnership();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: goal.id, data: { type: 'company_goal', goal } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isSyncing = isMetricSyncing(goal.id);

  return (
    <div ref={setNodeRef} style={style} className="relative will-change-transform transform-gpu">
      <div className={`group flex items-center gap-3 bg-card border border-border rounded-[6px] shadow-sm hover:shadow-md transition-colors duration-150 px-4 py-3 ${isSyncing ? 'opacity-75' : ''} ${showArchived ? 'opacity-60 bg-muted/30' : ''}`}>
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors opacity-60 hover:opacity-100 flex items-center justify-center flex-shrink-0 select-none touch-none"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <CompanyGoalItem
            goal={goal}
            onEdit={onEdit}
            onArchive={onArchive}
            onUnarchive={onUnarchive}
            onDelete={onDelete}
            onStatusUpdate={onStatusUpdate}
            onProgressUpdate={onProgressUpdate}
            onDateUpdate={onDateUpdate}
            onMilestoneChanged={onMilestoneChanged}
            onOwnerChange={onOwnerChange}
            getProfileName={getProfileName}
            getProfile={getProfile}
            showArchived={showArchived}
          />
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if goal data actually changed (but not for optimistic updates)
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
