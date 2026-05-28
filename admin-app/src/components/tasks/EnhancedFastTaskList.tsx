import React, { memo, useCallback, useState, useMemo, useEffect } from 'react';
import { Clock, User, Calendar, MoreVertical, Edit, Trash2, Archive, ArchiveRestore, Undo2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AttachmentSection } from '@/components/attachments/AttachmentSection';
import { UserAvatar } from '@/components/UserAvatar';
import { FastTask } from '@/hooks/useFastTasks';
import { useProfile } from '@/hooks/useProfile';
import { useProfileNames } from '@/hooks/useProfileNames';
import { useProfiles } from '@/hooks/useProfiles';
import { toast } from 'sonner';
import { getDueDateInfo, getCompletedDateInfo } from '@/utils/dueDateUtils';
import { logger } from '@/utils/logger';

interface PendingArchive {
  taskId: string;
  title: string;
  timeLeft: number;
}

interface EnhancedFastTaskListProps {
  tasks: FastTask[];
  onToggleTask: (taskId: string) => Promise<void>;
  onUpdateTask: (taskId: string, updates: Partial<FastTask>) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onArchiveTask?: (taskId: string) => Promise<void>;
  onEditTask: (task: FastTask) => void;
  pendingArchives?: PendingArchive[];
  onUndoArchive?: (taskId: string, task: FastTask) => Promise<void>;
}

const TaskItem = memo<{
  task: FastTask;
  onToggle: (taskId: string) => Promise<void>;
  onEdit: (task: FastTask) => void;
  onArchive?: (taskId: string) => Promise<void>;
  onUpdateTask: (taskId: string, updates: Partial<FastTask>) => Promise<void>;
  isPendingArchive: boolean;
  onUndoArchive?: (taskId: string, task: FastTask) => Promise<void>;
  getProfileName: (userId: string) => string | null;
  profiles: Array<{ id: string; full_name: string; email: string; avatar_url?: string | null; }>;
}>(({ task, onToggle, onEdit, onArchive, onUpdateTask, isPendingArchive, onUndoArchive, getProfileName, profiles }) => {
  const { profile } = useProfile();
  const [isToggling, setIsToggling] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);

  const handleToggle = async () => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      await onToggle(task.id);
    } finally {
      setIsToggling(false);
    }
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent task edit from triggering
    handleToggle();
  };

  const handleArchive = async () => {
    if (onArchive) {
      await onArchive(task.id);
    }
  };

  const handleUndoArchive = async () => {
    if (onUndoArchive) {
      await onUndoArchive(task.id, task);
    }
  };

  const handleTaskClick = (e: React.MouseEvent) => {
    // Don't trigger edit if clicking on interactive elements
    const target = e.target as HTMLElement;
    const isInteractiveElement = target.closest('button') || 
                                target.closest('[role="button"]') || 
                                target.closest('input') ||
                                target.closest('[data-radix-popper-content-wrapper]') ||
                                target.closest('[data-radix-dropdown-menu-content]') ||
                                target.closest('.dropdown-trigger');
    
    if (!isInteractiveElement && canEdit && !isPendingArchive) {
      onEdit(task);
    }
  };


  const isCompleted = task.status === 'done';
  const isOwner = task.userId === profile?.id;
  const isAssigned = task.assignedTo?.includes(profile?.id || '');
  // Allow editing for any task that's visible to the user
  // If you can see it, you can edit it (since RLS controls visibility)
  const canEdit = true;

  // Find assigned user profile and owner profile
  const assignedUserId = task.assignedTo?.[0];
  const assignedUserProfile = assignedUserId ? profiles.find(p => p.id === assignedUserId) : null;
  const ownerProfile = profiles.find(p => p.id === task.userId);



  return (
    <div 
      className={`group border rounded-[6px] p-3 space-y-2 transition-all duration-200 overflow-hidden cursor-pointer ${
        isPendingArchive ? 'opacity-60 bg-destructive/10 border-destructive/30' :
        task.isArchived ? 'opacity-60 bg-muted/30' :
        isCompleted ? 'bg-muted hover:bg-muted/80' : 'bg-card hover:shadow-md hover:border-border/60'
      }`}
      onClick={handleTaskClick}
    >
      {/* Task Header - Priority to right elements */}
      <div className="flex items-center gap-3 w-full overflow-hidden">
        {/* Checkbox */}
        <div className="flex-shrink-0">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={handleToggle}
            disabled={isToggling || isPendingArchive}
            className="w-5 h-5"
          />
        </div>

        {/* Task Title - flexible, will shrink */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <h3 className={`font-medium text-sm transition-all duration-200 truncate ${
            task.isArchived ? 'text-muted-foreground' :
            isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
          }`}>
            {task.title}
          </h3>
        </div>

        {/* RIGHT PRIORITY ELEMENTS - These ALWAYS show in full */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Task Type Badge - PRIORITY */}
          <Badge 
            variant={task.taskType === 'personal' ? 'personal' : 'team'} 
            className={`text-xs whitespace-nowrap ${task.isArchived ? 'opacity-70 saturate-50' : ''}`}
            key={`${task.id}-${task.teamName || 'no-team'}`} // Force re-render when team changes
          >
            {task.taskType === 'personal' ? 'Personal' : (task.teamName || 'Team')}
          </Badge>

          {/* Due Date (hidden for completed tasks) */}
          {!isCompleted && task.dueDate && (() => {
            const dueDateInfo = getDueDateInfo(task.dueDate);
            if (!dueDateInfo) return null;
            return (
              <div className={`flex items-center text-xs whitespace-nowrap px-2 py-1 rounded-md border ${dueDateInfo.urgencyClass} ${task.isArchived ? 'opacity-70 saturate-50' : ''}`}>
                <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="flex-shrink-0 font-medium">{dueDateInfo.text}</span>
              </div>
            );
          })()}
           
          {/* Avatar Display Logic */}
          {(() => {
            // For team tasks: show assigned user if different from creator, otherwise show creator
            if (task.taskType === 'team') {
              if (assignedUserId && assignedUserId !== task.userId && assignedUserProfile) {
                // Show assigned user when it's different from creator
                return (
                  <div className="flex-shrink-0">
                    <UserAvatar
                      userId={assignedUserProfile.id}
                      fullName={assignedUserProfile.full_name}
                      email={assignedUserProfile.email}
                      avatarUrl={assignedUserProfile.avatar_url}
                      size="sm"
                    />
                  </div>
                );
              } else if (assignedUserId && assignedUserId === task.userId && assignedUserProfile) {
                // Show assigned user when they assigned it to themselves
                return (
                  <div className="flex-shrink-0">
                    <UserAvatar
                      userId={assignedUserProfile.id}
                      fullName={assignedUserProfile.full_name}
                      email={assignedUserProfile.email}
                      avatarUrl={assignedUserProfile.avatar_url}
                      size="sm"
                    />
                  </div>
                );
              } else if (ownerProfile) {
                // Fallback to owner if no assigned user
                return (
                  <div className="flex-shrink-0">
                    <UserAvatar
                      userId={ownerProfile.id}
                      fullName={ownerProfile.full_name}
                      email={ownerProfile.email}
                      avatarUrl={ownerProfile.avatar_url}
                      size="sm"
                    />
                  </div>
                );
              }
            } else if (task.taskType === 'personal' && ownerProfile) {
              // For personal tasks, always show owner
              return (
                <div className="flex-shrink-0">
                  <UserAvatar
                    userId={ownerProfile.id}
                    fullName={ownerProfile.full_name}
                    email={ownerProfile.email}
                    avatarUrl={ownerProfile.avatar_url}
                    size="sm"
                  />
                </div>
              );
            }
            return null; // Return null if no avatar should be shown
          })()}
        </div>

        {/* Actions Menu */}
        {!isPendingArchive && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="opacity-0 group-hover:opacity-100 transition-opacity dropdown-trigger"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && (
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setShowAttachments(!showAttachments)}>
                <MoreVertical className="h-4 w-4 mr-2" />
                {showAttachments ? 'Hide' : 'Show'} Attachments
              </DropdownMenuItem>
              {task.isArchived ? (
                onUndoArchive && (
                  <DropdownMenuItem onClick={handleUndoArchive} className="text-success">
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    Unarchive
                  </DropdownMenuItem>
                )
              ) : (
                onArchive && (
                  <DropdownMenuItem onClick={handleArchive} className="text-destructive">
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Pending Archive Actions */}
        {isPendingArchive && onUndoArchive && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndoArchive}
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <Undo2 className="h-4 w-4 mr-1" />
            Undo
          </Button>
        )}
      </div>

      {/* Attachments Section */}
      {showAttachments && (
        <AttachmentSection
          entityType="task"
          entityId={task.id}
          className="border-t pt-3"
        />
      )}
    </div>
  );
});

TaskItem.displayName = 'TaskItem';

export const EnhancedFastTaskList: React.FC<EnhancedFastTaskListProps> = ({
  tasks,
  onToggleTask,
  onUpdateTask,
  onDeleteTask,
  onArchiveTask,
  onEditTask,
  pendingArchives = [],
  onUndoArchive,
}) => {
  // Get unique user IDs for fetching profile names
  const userIds = useMemo(() => {
    const ids = new Set<string>();
    tasks.forEach(task => {
      if (task.assignedTo) task.assignedTo.forEach(id => ids.add(id));
      if (task.userId) ids.add(task.userId);
    });
    return Array.from(ids);
  }, [tasks]);

  // Fetch profile names for all user IDs
  const { getProfileName } = useProfileNames(userIds);
  const { profiles } = useProfiles();
  const handleToggle = useCallback(async (taskId: string) => {
    try {
      await onToggleTask(taskId);
    } catch (error) {
      logger.error('Failed to toggle task:', error);
      toast.error('Failed to update task');
    }
  }, [onToggleTask]);

  const handleArchive = useCallback(async (taskId: string) => {
    if (onArchiveTask) {
      try {
        await onArchiveTask(taskId);
      } catch (error) {
        logger.error('Failed to archive task:', error);
        toast.error('Failed to archive task');
      }
    }
  }, [onArchiveTask]);

  const handleUndoArchive = useCallback(async (taskId: string) => {
    if (onUndoArchive) {
      try {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          await onUndoArchive(taskId, task);
        }
      } catch (error) {
        logger.error('Failed to undo archive:', error);
        toast.error('Failed to undo archive');
      }
    }
  }, [onUndoArchive, tasks]);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground/60 mb-4">
          <Clock className="h-12 w-12 mx-auto mb-4" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">No tasks yet</h3>
        <p className="text-muted-foreground">Create your first task to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={handleToggle}
          onEdit={onEditTask}
          onArchive={onArchiveTask ? handleArchive : undefined}
          isPendingArchive={pendingArchives.some(p => p.taskId === task.id)}
          onUndoArchive={onUndoArchive ? handleUndoArchive : undefined}
          getProfileName={getProfileName}
          onUpdateTask={onUpdateTask}
          profiles={profiles}
        />
      ))}
    </div>
  );
};
