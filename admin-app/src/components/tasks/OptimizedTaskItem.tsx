
import React, { memo, useState } from 'react';
import { FastTask } from '@/hooks/useFastTasks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calendar, 
  Edit, 
  Trash2, 
  Archive,
  User, 
  Users,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDueDateInfo, getCompletedDateInfo } from '@/utils/dueDateUtils';
import { MultiAssigneeDisplay } from '@/components/shared/MultiAssigneeDisplay';
import { UnassignedAvatar } from './UnassignedAvatar';
import { logger } from '@/utils/logger';

interface OptimizedTaskItemProps {
  task: FastTask;
  onToggle: (taskId: string) => Promise<void>;
  onUpdate: (taskId: string, updates: Partial<FastTask>) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onArchive?: (taskId: string) => Promise<void>;
  onEdit: (task: FastTask) => void;
}

export const OptimizedTaskItem: React.FC<OptimizedTaskItemProps> = memo(({
  task,
  onToggle,
  onUpdate,
  onDelete,
  onArchive,
  onEdit
}) => {
  const [isToggling, setIsToggling] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const handleToggle = async () => {
    if (isToggling) return;
    
    setIsToggling(true);
    try {
      await onToggle(task.id);
    } catch (error) {
      logger.error('Failed to toggle task:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const handleArchive = async () => {
    if (!onArchive || isArchiving) return;
    
    setIsArchiving(true);
    try {
      await onArchive(task.id);
    } catch (error) {
      logger.error('Failed to archive task:', error);
    } finally {
      setIsArchiving(false);
    }
  };

  const isCompleted = task.status === 'done';
  const dueDateInfo = getDueDateInfo(task.dueDate);
  const isOverdue = dueDateInfo?.isOverdue && !isCompleted;

  // Create assignee profiles for display
  const assigneeProfiles = task.assignedTo?.map(userId => ({
    id: userId,
    full_name: userId, // Would need actual profile lookup
    avatar_url: undefined
  })) || [];

  return (
    <div className={cn(
      "group flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
      isCompleted && "opacity-60",
      isOverdue && "border-destructive/20 bg-destructive/5"
    )}>
      {/* Checkbox */}
      <div className="flex-shrink-0 pt-0.5">
        <Checkbox
          checked={isCompleted}
          onCheckedChange={handleToggle}
          disabled={isToggling}
          className="w-5 h-5"
        />
      </div>

      {/* Task Content - Single Line Layout */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {/* Task Title */}
        <h4 className={cn(
          "font-medium text-sm flex-1 min-w-0 truncate",
          isCompleted && "line-through text-muted-foreground"
        )}>
          {task.title}
        </h4>
        
        {/* Task Type Badge */}
        <Badge variant={task.taskType === 'personal' ? 'secondary' : 'outline'} className="flex-shrink-0 text-xs">
          {task.taskType === 'personal' ? (
            <><User className="w-3 h-3 mr-1" /> Personal</>
          ) : (
            <><Users className="w-3 h-3 mr-1" /> {task.teamName || 'Team'}</>
          )}
        </Badge>

        {/* Due Date (hidden for completed tasks) */}
        {!isCompleted && dueDateInfo && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium flex-shrink-0",
            dueDateInfo.urgencyClass
          )}>
            {dueDateInfo.isOverdue ? (
              <AlertTriangle className="w-3 h-3" />
            ) : (
              <Calendar className="w-3 h-3" />
            )}
            <span>{dueDateInfo.text}</span>
          </div>
        )}
        
        {/* Assigned To - Enhanced with owner and multi-assignee display */}
        {task.assignedTo && task.assignedTo.length > 0 && task.assignedTo[0] !== task.userId ? (
          <div className="flex items-center gap-1 text-muted-foreground text-xs flex-shrink-0">
            <MultiAssigneeDisplay 
              owner={task.userId ? { 
                id: task.userId, 
                full_name: task.userId, // This would need profile lookup for real names
                avatar_url: undefined 
              } : undefined}
              assignees={assigneeProfiles}
              size="sm"
              maxVisible={1}
              showOwnerFirst={true}
            />
          </div>
        ) : task.assignedTo && task.assignedTo.length > 0 ? (
          <div className="flex items-center gap-1 text-muted-foreground text-xs flex-shrink-0">
            <User className="w-3 h-3" />
            <span>Assigned</span>
          </div>
        ) : task.taskType === 'team' ? (
          <UnassignedAvatar size="sm" />
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(task)}
          className="h-8 w-8 p-0"
        >
          <Edit className="h-3 w-3" />
        </Button>
        
        {onArchive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleArchive}
            disabled={isArchiving}
            className="h-8 w-8 p-0"
          >
            {isArchiving ? (
              <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Archive className="h-3 w-3" />
            )}
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(task.id)}
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
});

OptimizedTaskItem.displayName = 'OptimizedTaskItem';
