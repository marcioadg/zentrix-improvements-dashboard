
import React from 'react';
import { TaskItem } from './TaskItem';
import { getInitials } from '@/utils/nameUtils';

interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  assigned_to?: string;
  created_at: string;
  archived?: boolean;
}

interface TaskListProps {
  tasks: Task[];
  onToggleTask: (taskId: string, completed: boolean) => void;
  onArchiveTask: (taskId: string) => void;
  getProfileName: (userId: string) => string;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onToggleTask,
  onArchiveTask,
  getProfileName,
}) => {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <h3 className="text-sm font-medium text-foreground mb-1">No tasks yet</h3>
        <p className="text-sm text-muted-foreground">Add your first task to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggleTask={onToggleTask}
          onArchiveTask={onArchiveTask}
          getProfileName={getProfileName}
          getInitials={getInitials}
        />
      ))}
    </div>
  );
};
