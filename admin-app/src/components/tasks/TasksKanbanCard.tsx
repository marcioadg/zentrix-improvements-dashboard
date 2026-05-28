
import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Clock } from 'lucide-react';
import { UnifiedKanbanTask } from '@/types/tasks';
import { UserAvatar } from '@/components/UserAvatar';
import { useProfiles } from '@/hooks/useProfiles';
import { getDueDateInfo, getCompletedDateInfo } from '@/utils/dueDateUtils';
import { MultiAssigneeDisplay } from '@/components/shared/MultiAssigneeDisplay';

type Task = UnifiedKanbanTask;
type TeamTask = UnifiedKanbanTask;

interface TasksKanbanCardProps {
  task: Task | TeamTask;
  isPersonal: boolean;
  isDragging?: boolean;
  onEditTask?: (task: Task | TeamTask) => void;
  onDeleteTask?: (taskId: string) => void;
}

export const TasksKanbanCard: React.FC<TasksKanbanCardProps> = ({
  task,
  isPersonal,
  isDragging = false,
  onEditTask,
}) => {
  const { profiles } = useProfiles();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isCurrentlyDragging,
  } = useDraggable({
    id: task.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // Get assigned user profiles (now supporting arrays) - handle both old and new formats
  const assignedUserProfiles = (() => {
    // Check if task has assigned_to property and handle both array and single value formats
    const assignedTo = (task as any).assigned_to;
    if (!assignedTo) return [];
    
    // Handle array format (new) or single value format (old)
    const userIds = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
    
    return userIds.map((userId: string) => {
      const profile = profiles.find(p => p.id === userId);
      return profile ? {
        id: profile.id,
        full_name: profile.full_name || 'Unknown User',
        avatar_url: profile.avatar_url,
      } : null;
    }).filter(Boolean) as Array<{
      id: string;
      full_name: string;
      avatar_url?: string;
    }>;
  })();

  // Get owner profile - safely handle different task types
  const taskUserId = (task as any).user_id;
  const ownerProfile = taskUserId ? profiles.find(p => p.id === taskUserId) : undefined;
  const ownerFormatted = ownerProfile ? {
    id: ownerProfile.id,
    full_name: ownerProfile.full_name || 'Unknown User',
    avatar_url: ownerProfile.avatar_url,
  } : undefined;

  // Get due date info
  const dueDateInfo = getDueDateInfo(task.due_date);

  const handleCardClick = (e: React.MouseEvent) => {
    // Only trigger edit if not clicking on drag handle
    const target = e.target as HTMLElement;
    if (target.closest('[data-drag-handle]')) {
      return;
    }
    if (onEditTask) {
      onEditTask(task);
    }
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={`bg-background border border-border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer relative ${
        isCurrentlyDragging || isDragging ? 'opacity-50 rotate-2 scale-105' : ''
      }`}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with Drag Handle, Personal Badge, and Avatar */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <GripVertical 
                className="h-4 w-4 text-muted-foreground cursor-grab" 
                data-drag-handle
                {...listeners}
                {...attributes}
              />
              {isPersonal && (
                <Badge variant="secondary" className="text-xs px-2 py-1">
                  Personal
                </Badge>
              )}
            </div>
            
            {/* Multi-assignee display with owner support */}
            <div className="flex-shrink-0">
              {!isPersonal && (assignedUserProfiles.length > 0 || ownerFormatted) ? (
                <MultiAssigneeDisplay 
                  owner={ownerFormatted}
                  assignees={assignedUserProfiles}
                  size="sm"
                  maxVisible={1}
                  showOwnerFirst={true}
                />
              ) : isPersonal && ownerFormatted ? (
                <MultiAssigneeDisplay 
                  owner={ownerFormatted}
                  assignees={[]}
                  size="sm"
                  maxVisible={1}
                  showOwnerFirst={true}
                />
              ) : (
                <UserAvatar
                  size="sm"
                  className={isPersonal ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}
                />
              )}
            </div>
          </div>

          {/* Task Title */}
          <h4 className="text-base font-semibold text-foreground leading-tight">
            {task.title}
          </h4>

          {/* Due Date (hidden for completed tasks) */}
          {task.status !== 'done' && dueDateInfo && (
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${dueDateInfo.urgencyClass}`}>
              <Clock className="h-3 w-3" />
              <span>{dueDateInfo.text}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
