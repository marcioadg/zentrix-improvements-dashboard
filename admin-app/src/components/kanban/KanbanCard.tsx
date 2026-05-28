
import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { GripVertical, Archive, UserX, ZoomIn, Calendar } from 'lucide-react';
import { KanbanTask } from '@/types/kanban';
import { format, differenceInDays, differenceInHours } from 'date-fns';
import { getCompletedDateInfo } from '@/utils/dueDateUtils';
import { EditTaskModal } from '@/components/modals/EditTaskModal';
import { UserAvatar } from '@/components/UserAvatar';
import { useProfiles } from '@/hooks/useProfiles';
import { getDefaultDueDate } from '@/utils/taskUtils';
import { MultiAssigneeDisplay } from '@/components/shared/MultiAssigneeDisplay';

interface KanbanCardProps {
  task: KanbanTask;
  isDragging?: boolean;
  onDelete: (taskId: string) => void;
  onEdit?: (taskId: string, updates: { title: string; description: string; due_date?: string; assigned_to?: string[] }) => void;
  hidePriorityBadge?: boolean;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  task,
  isDragging = false,
  onDelete,
  onEdit,
  hidePriorityBadge = false,
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
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

  const isAnonymous = task.source === 'feedback-widget';
  const isDone = task.status === 'done';

  // Get all assigned users from the unified column
  const allAssignedUsers = task.assigned_to || [];

  // Get owner profile
  const ownerProfile = task.user_id ? profiles.find(p => p.id === task.user_id) : undefined;

  // Get user profiles for all assigned users
  const assignedUserProfiles = allAssignedUsers.map(userId => {
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

  // Ensure we have a due date in YYYY-MM-DD format - use default if none exists
  const taskDueDate = task.due_date ? task.due_date.split('T')[0] : getDefaultDueDate();
  
  const getDueDateDisplay = () => {
    if (!taskDueDate) return null;
    
    const dueDate = new Date(taskDueDate);
    const now = new Date();
    const daysDiff = differenceInDays(dueDate, now);
    const hoursDiff = differenceInHours(dueDate, now);
    
    let urgencyClass = '';
    let timerText = '';
    
    if (daysDiff < 0) {
      urgencyClass = 'text-destructive bg-destructive/5 border-red-200';
      timerText = 'Overdue';
    } else if (daysDiff === 0) {
      urgencyClass = 'text-warning bg-orange-50 border-orange-200';
      if (hoursDiff <= 2) {
        timerText = `${hoursDiff}h left`;
      } else {
        timerText = 'Due today';
      }
    } else if (daysDiff === 1) {
      urgencyClass = 'text-warning bg-warning/5 border-yellow-200';
      timerText = 'Due tomorrow';
    } else if (daysDiff <= 3) {
      urgencyClass = 'text-primary bg-primary/10 border-primary/30';
      timerText = `${daysDiff} days left`;
    } else {
      urgencyClass = 'text-muted-foreground bg-muted border-border';
      timerText = format(dueDate, 'MMM d');
    }
    
    return { urgencyClass, timerText, dueDate };
  };

  const dueDateInfo = getDueDateDisplay();

  // Convert KanbanTask to the format expected by EditTaskModal
  const convertToTaskModalFormat = () => {
    return {
      id: task.id,
      title: task.title,
      description: task.description || '',
      due_date: taskDueDate,
      // Get the primary assignee (single user for display compatibility)
      user_id: task.assigned_to && task.assigned_to.length > 0 ? task.assigned_to[0] : (task.user_id || ''),
      team_id: task.team_id,
      completed: task.status === 'done',
      priority: 'medium' as 'low' | 'medium' | 'high',
      created_at: task.created_at,
      updated_at: task.updated_at,
    };
  };

  const handleEdit = (taskId: string, updates: any) => {
    if (onEdit) {
      onEdit(taskId, {
        title: updates.title,
        description: updates.description,
        due_date: updates.due_date,
        assigned_to: updates.assigned_to, // Now supports array
      });
    }
    setShowEditModal(false);
  };

  const handleInteractiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleCardClick = () => {
    setShowEditModal(true);
  };

  return (
    <>
      <Card 
        ref={setNodeRef}
        style={style}
        className={`hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing ${
          isCurrentlyDragging || isDragging ? 'opacity-50 rotate-2 scale-105' : ''
        } ${isDone ? 'opacity-20' : ''}`}
        {...listeners}
        {...attributes}
        onClick={handleCardClick}
      >
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header with drag handle, anonymous badge, and action buttons */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                {isAnonymous && (
                  <Badge variant="outline" className="bg-secondary text-purple-800 border-purple-200 text-sm">
                    <UserX className="h-4 w-4 mr-1" />
                    Anonymous
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1" onClick={handleInteractiveClick}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-muted hover:text-muted-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(task.id);
                  }}
                  title="Archive task"
                >
                  <Archive className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Task Title */}
            <h4 className={`text-base font-semibold text-foreground leading-tight ${isDone ? 'line-through' : ''}`}>
              {task.title}
            </h4>
            
            {/* Task Description */}
            {task.description && (
              <p className={`text-sm text-muted-foreground line-clamp-3 ${isDone ? 'line-through' : ''}`}>
                {task.description}
              </p>
            )}

            {/* Due Date Badge and Assigned Users - moved due date to left of avatars */}
            <div className="flex items-center justify-between gap-2">
              {/* Due Date (hidden for completed tasks) */}
              {!isDone && dueDateInfo && (
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${dueDateInfo.urgencyClass}`}>
                  <Calendar className="h-3 w-3" />
                  <span>{dueDateInfo.timerText}</span>
                </div>
              )}

              {/* Task Owner and Assigned Users with enhanced MultiAssigneeDisplay */}
              {(ownerProfile || assignedUserProfiles.length > 0) && (
                <MultiAssigneeDisplay 
                  owner={ownerProfile}
                  assignees={assignedUserProfiles}
                  size="sm"
                  maxVisible={1}
                  showOwnerFirst={true}
                />
              )}
            </div>

            {/* Image Preview */}
            {task.image_url && (
              <div className="mt-2" onClick={handleInteractiveClick}>
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="relative group cursor-pointer">
                      <img
                        src={task.image_url}
                        alt="Feedback screenshot"
                        className="w-full max-h-32 object-cover rounded border hover:opacity-80 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-foreground bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded flex items-center justify-center">
                        <ZoomIn className="h-6 w-6 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[80vh] p-2">
                    <img
                      src={task.image_url}
                      alt="Feedback screenshot"
                      className="w-full h-auto max-h-full object-contain"
                    />
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {showEditModal && (
        <EditTaskModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          task={convertToTaskModalFormat()}
          onUpdate={handleEdit}
        />
      )}
    </>
  );
};
