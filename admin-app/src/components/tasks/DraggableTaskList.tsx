import React, { memo, useCallback, useState, useMemo, useEffect } from 'react';
import { Clock, User, Calendar, MoreVertical, Edit, Trash2, Archive, ArchiveRestore, Undo2, ChevronDown, Star, GripVertical, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AttachmentSection } from '@/components/attachments/AttachmentSection';
import { UserAvatar } from '@/components/UserAvatar';
import { UnassignedAvatar } from './UnassignedAvatar';
import { FastTask } from '@/hooks/useFastTasks';
import { useProfile } from '@/hooks/useProfile';
import { useProfileNames } from '@/hooks/useProfileNames';
import { useProfiles } from '@/hooks/useProfiles';
import { toast } from 'sonner';
import { getDueDateInfo, getCompletedDateInfo } from '@/utils/dueDateUtils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EnhancedQuickAddTask } from './EnhancedQuickAddTask';
import { logger } from '@/utils/logger';

interface PendingArchive {
  taskId: string;
  title: string;
  timeLeft: number;
}

interface DraggableTaskListProps {
  tasks: FastTask[];
  onToggleTask: (taskId: string) => Promise<void>;
  onUpdateTask: (taskId: string, updates: Partial<FastTask>) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onArchiveTask?: (taskId: string) => Promise<void>;
  onEditTask: (task: FastTask) => void;
  pendingArchives?: PendingArchive[];
  onUndoArchive?: (taskId: string, task: FastTask) => Promise<void>;
  onReorderTasks?: (tasks: FastTask[]) => Promise<void>;
  onAddTask?: (
    title: string,
    description?: string,
    dueDate?: string,
    taskType?: 'personal' | 'team',
    teamId?: string,
    teamName?: string,
    assignedTo?: string[],
    splitPerMember?: boolean
  ) => Promise<void>;
  isCreating?: boolean;
  canCreateTasks?: boolean;
  currentUserId?: string;
  defaultTeamId?: string;
  autoExpandAddTask?: boolean;
}

const DraggableTaskItem = memo<{
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

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
    e.stopPropagation();
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


  const handlePriorityToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const newPriority = !task.priority;
      await onUpdateTask(task.id, { priority: newPriority });
      if (newPriority) {
        toast.success('Task marked as priority!');
      }
    } catch (error) {
      logger.error('Failed to update task priority:', error);
    }
  };

  const isCompleted = task.status === 'done';
  const isOwner = task.userId === profile?.id;
  const isAssigned = task.assignedTo?.includes(profile?.id || '');
  const canEdit = true;

  // Avatar display logic - prioritize current user if they're assigned
  const getAvatarUser = () => {
    if (task.taskType === 'team' && task.assignedTo?.length) {
      // If current user is assigned, show their avatar
      if (profile?.id && task.assignedTo.includes(profile.id)) {
        return profiles.find(p => p.id === profile.id);
      }
      // Otherwise, show the first assigned user
      const firstAssignedId = task.assignedTo[0];
      return profiles.find(p => p.id === firstAssignedId);
    } else if (task.taskType === 'personal') {
      // For personal tasks, show owner
      return profiles.find(p => p.id === task.userId);
    }
    return null;
  };

  const avatarUser = getAvatarUser();
  const ownerProfile = profiles.find(p => p.id === task.userId);


  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`group border rounded-lg p-3 space-y-2 transition-all duration-200 overflow-hidden cursor-pointer ${
        isPendingArchive ? 'opacity-60 bg-destructive/10 border-destructive/20' : 
        task.isArchived ? 'opacity-60 bg-muted/30' :
        isCompleted ? 'bg-muted hover:bg-muted/80' : 'bg-card hover:shadow-md hover:border-border/60'
      } ${isDragging ? 'opacity-50 scale-105 shadow-lg z-50' : ''}
      ${task.priority ? 'ring-2 ring-orange-500/20 bg-orange-500/10' : ''}
      `}
      onClick={handleTaskClick}
    >
      {/* Task Header */}
      <div className="flex items-center gap-3 w-full overflow-hidden">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Checkbox */}
        <div className="flex-shrink-0">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={handleToggle}
            disabled={isToggling || isPendingArchive}
            className="w-5 h-5"
          />
        </div>

        {/* Task Title */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <h3 className={`font-medium text-sm transition-all duration-200 truncate ${
            task.isArchived ? 'text-muted-foreground' :
            isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
          }`}>
            {task.title}
          </h3>
        </div>

        {/* RIGHT PRIORITY ELEMENTS */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Priority Star */}
          <button
            onClick={handlePriorityToggle}
            className={`transition-all duration-200 p-1 rounded hover:bg-orange-500/10 ${
              task.priority 
                ? 'text-orange-500 hover:text-warning' 
                : 'text-muted-foreground hover:text-orange-400'
            }`}
            title={task.priority ? 'Remove priority' : 'Mark as priority'}
          >
            <Star className={`h-4 w-4 ${task.priority ? 'fill-current' : ''}`} />
          </button>

          {/* Task Type Badge */}
          <Badge 
            variant={task.taskType === 'personal' ? 'personal' : 'team'} 
            className={`text-xs whitespace-nowrap ${task.isArchived ? 'opacity-70 saturate-50' : ''}`}
            key={`${task.id}-${task.teamName || 'no-team'}`}
          >
            {task.taskType === 'personal' ? 'Personal' : (task.teamName || 'Team')}
          </Badge>

          {/* Due Date (hidden for completed tasks) */}
          {task.status !== 'done' && task.dueDate && (() => {
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
           {avatarUser ? (
             <div className="flex items-center gap-1 flex-shrink-0">
               <UserAvatar
                 userId={avatarUser.id}
                 fullName={avatarUser.full_name}
                 email={avatarUser.email}
                 avatarUrl={avatarUser.avatar_url}
                 size="sm"
               />
               {/* Show additional assignees count */}
               {task.taskType === 'team' && task.assignedTo && task.assignedTo.length > 1 && (
                 <div className="flex items-center gap-0.5 text-xs text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded-full border">
                   <Plus className="h-2.5 w-2.5" />
                   <span className="font-medium">{task.assignedTo.length - 1}</span>
                 </div>
               )}
             </div>
           ) : task.taskType === 'team' && (!task.assignedTo || task.assignedTo.length === 0) ? (
             <UnassignedAvatar size="sm" />
           ) : null}
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
            className="text-destructive border-destructive hover:bg-destructive/10"
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

DraggableTaskItem.displayName = 'DraggableTaskItem';

export const DraggableTaskList: React.FC<DraggableTaskListProps> = ({
  tasks,
  onToggleTask,
  onUpdateTask,
  onDeleteTask,
  onArchiveTask,
  onEditTask,
  pendingArchives = [],
  onUndoArchive,
  onReorderTasks,
  onAddTask,
  isCreating = false,
  canCreateTasks = true,
  currentUserId,
  defaultTeamId,
  autoExpandAddTask = false
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sort tasks: priority tasks first, then by order position, then by creation date
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // Priority tasks come first
      if (a.priority && !b.priority) return -1;
      if (!a.priority && b.priority) return 1;
      
      // Within same priority level, sort by order position if available
      if (a.orderPosition !== undefined && b.orderPosition !== undefined) {
        return a.orderPosition - b.orderPosition;
      }
      
      // Fallback to creation date
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tasks]);

  // Get unique user IDs for fetching profile names
  const userIds = useMemo(() => {
    const ids = new Set<string>();
    tasks.forEach(task => {
      if (task.assignedTo) task.assignedTo.forEach(id => ids.add(id));
      if (task.userId) ids.add(task.userId);
    });
    return Array.from(ids);
  }, [tasks]);

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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = sortedTasks.findIndex(task => task.id === active.id);
      const newIndex = sortedTasks.findIndex(task => task.id === over?.id);
      
      const reorderedTasks = arrayMove(sortedTasks, oldIndex, newIndex);
      
      // Update order positions
      const updatedTasks = reorderedTasks.map((task, index) => ({
        ...task,
        orderPosition: index
      }));
      
      if (onReorderTasks) {
        onReorderTasks(updatedTasks);
      }
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="space-y-6">
        {/* Enhanced Quick Add Task - same position/size, just moved up */}
        {onAddTask && canCreateTasks && (
          <EnhancedQuickAddTask
            onAddTask={onAddTask}
            isCreating={isCreating}
            canCreateTasks={canCreateTasks}
            currentUserId={currentUserId}
            defaultTeamId={defaultTeamId}
            autoExpand={autoExpandAddTask}
          />
        )}

        <div className="text-center py-12">
          <div className="text-muted-foreground/60 mb-4">
            <Clock className="h-12 w-12 mx-auto mb-4" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No tasks yet</h3>
          <p className="text-muted-foreground">Create your first task to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      {/* Enhanced Quick Add Task at the top */}
      {onAddTask && canCreateTasks && (
        <EnhancedQuickAddTask
          onAddTask={onAddTask}
          isCreating={isCreating}
          canCreateTasks={canCreateTasks}
          currentUserId={currentUserId}
          defaultTeamId={defaultTeamId}
          autoExpand={autoExpandAddTask}
        />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortedTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {sortedTasks.map((task) => (
            <DraggableTaskItem
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
        </SortableContext>
      </DndContext>
    </div>
  );
};