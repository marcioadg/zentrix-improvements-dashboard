
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Archive, Calendar, AlertTriangle } from 'lucide-react';
import { getDueDateInfo, getCompletedDateInfo } from '@/utils/dueDateUtils';
import { UserAvatar } from '@/components/UserAvatar';
import { useCelebration } from '@/hooks/useCelebration';
import { logger } from '@/utils/logger';

interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  due_date?: string;
  assigned_to?: string;
  created_at: string;
  archived?: boolean;
  task_type?: 'personal' | 'team';
}

interface TaskItemProps {
  task: Task;
  onToggleTask: (taskId: string, completed: boolean) => void;
  onArchiveTask: (taskId: string) => void;
  onEditTask?: (task: Task) => void;
  getProfileName: (userId: string) => string;
  getInitials: (name: string) => string;
  getProfileAvatar?: (userId: string) => string | undefined;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleTask,
  onArchiveTask,
  onEditTask,
  getProfileName,
  getInitials,
  getProfileAvatar,
}) => {
  const { triggerCelebration } = useCelebration();
  const profileName = task.assigned_to ? getProfileName(task.assigned_to) : 'You';
  const avatarUrl = task.assigned_to && getProfileAvatar ? getProfileAvatar(task.assigned_to) : undefined;

  const dueDateInfo = getDueDateInfo(task.due_date);
  const isOverdue = dueDateInfo?.isOverdue && !task.completed;

  const handleTaskClick = () => {
    logger.log('🔧 TaskItem: Task clicked for editing', { 
      taskId: task.id, 
      hasOnEditTask: !!onEditTask,
      task: task 
    });
    if (onEditTask) {
      onEditTask(task);
    } else {
      logger.warn('🚨 TaskItem: No onEditTask handler provided');
    }
  };

  const handleToggleTask = (completed: boolean) => {
    // Trigger celebration immediately for better UX
    if (completed && !task.completed) {
      triggerCelebration();
    }
    onToggleTask(task.id, completed);
  };

  return (
    <div className={`group w-full flex items-center gap-3 p-4 rounded-[6px] border transition-colors duration-150 hover:bg-accent/50 ${
      task.completed ? 'bg-muted/50' : 'bg-background'
    }`}>
      
      {/* Checkbox */}
      <Checkbox
        checked={task.completed}
        onCheckedChange={handleToggleTask}
        className="flex-shrink-0"
      />
      
      {/* Task Title, Badge, and Date in single line */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <h3
          className={`text-base font-semibold cursor-pointer transition-all duration-200 hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-md px-2 py-1 -mx-2 -my-1 truncate outline-none ${
            task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
          }`}
          onClick={handleTaskClick}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTaskClick(); } }}
          tabIndex={0}
          role="button"
          title={onEditTask ? "Click to edit task" : "Edit functionality not available"}
        >
          {task.title}
          {onEditTask && (
            <span className="ml-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              (click to edit)
            </span>
          )}
        </h3>

        {/* Personal Badge */}
        {task.task_type === 'personal' && (
          <Badge variant="outline" className="text-xs flex-shrink-0">
            Personal
          </Badge>
        )}

        {/* Time Left (hidden for completed tasks) */}
        {!task.completed && dueDateInfo && (
          <div className={`flex items-center gap-1 text-sm flex-shrink-0 ${
            isOverdue 
              ? 'text-destructive font-medium' 
              : dueDateInfo.isDueToday
                ? 'text-warning font-medium'
                : 'text-muted-foreground'
          }`}>
            {isOverdue && <AlertTriangle className="h-4 w-4" />}
            <Calendar className="h-4 w-4" />
            <span>{dueDateInfo.text}</span>
          </div>
        )}
      </div>
      
      {/* Avatar */}
      <UserAvatar
        userId={task.assigned_to}
        fullName={profileName}
        avatarUrl={avatarUrl}
        size="md"
        className="bg-primary/10 text-primary flex-shrink-0"
      />
      
      {/* Archive button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onArchiveTask(task.id)}
        className="h-9 w-9 p-0 flex-shrink-0"
        title="Archive Task"
      >
        <Archive className="h-4 w-4" />
      </Button>
    </div>
  );
};
