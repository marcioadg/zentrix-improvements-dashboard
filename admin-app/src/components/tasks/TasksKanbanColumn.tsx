
import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { UnifiedKanbanTask } from '@/types/tasks';
import { TasksKanbanCard } from './TasksKanbanCard';
import { InlineTaskCreator } from '@/components/kanban/InlineTaskCreator';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

type Task = UnifiedKanbanTask;
type TeamTask = UnifiedKanbanTask;

interface TasksKanbanColumnProps {
  title: string;
  tasks: (Task | TeamTask)[];
  status: 'todo' | 'in-progress' | 'done';
  isPersonal: boolean;
  onEditTask?: (task: Task | TeamTask) => void;
  onDeleteTask?: (taskId: string) => void;
  onAddTask?: (title: string, description: string, teamSelection: { type: 'personal' | 'team'; teamId?: string }, status?: 'todo' | 'in-progress' | 'done') => void;
  teamId?: string;
}

export const TasksKanbanColumn: React.FC<TasksKanbanColumnProps> = ({
  title,
  tasks,
  status,
  isPersonal,
  onEditTask,
  onDeleteTask,
  onAddTask,
  teamId,
}) => {
  const [showInlineCreator, setShowInlineCreator] = useState(false);
  const { isOver, setNodeRef } = useDroppable({
    id: status,
  });

  const getStatusColor = () => {
    switch (status) {
      case 'todo':
        return 'bg-muted border-border';
      case 'in-progress':
        return 'bg-accent border-border';
      case 'done':
        return 'bg-primary/10 border-primary/20';
      default:
        return 'bg-muted border-border';
    }
  };

  const getHeaderColor = () => {
    switch (status) {
      case 'todo':
        return 'text-muted-foreground';
      case 'in-progress':
        return 'text-accent-foreground';
      case 'done':
        return 'text-primary';
      default:
        return 'text-muted-foreground';
    }
  };

  const handleAddTask = (title: string, description: string, teamSelection: { type: 'personal' | 'team'; teamId?: string }) => {
    if (onAddTask) {
      onAddTask(title, description, teamSelection, status);
    }
    setShowInlineCreator(false);
  };

  const canAddTasks = onAddTask && (status === 'todo' || status === 'in-progress');

  return (
    <div 
      ref={setNodeRef}
      className={`rounded-2xl p-6 border transition-all duration-200 ${getStatusColor()} ${
        isOver ? 'ring-2 ring-primary ring-opacity-50' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className={`font-semibold text-lg ${getHeaderColor()}`}>
          {title}
        </h3>
        <span className={`text-sm font-medium px-3 py-1 rounded-full ${getHeaderColor()} bg-background/50 border`}>
          {tasks.length}
        </span>
      </div>
      
      <div className="space-y-3 min-h-[200px]">
        {tasks.map((task) => (
          <TasksKanbanCard
            key={task.id}
            task={task}
            isPersonal={isPersonal}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />
        ))}

        {/* Inline Task Creator */}
        {showInlineCreator && canAddTasks && (
          <InlineTaskCreator
            onSubmit={handleAddTask}
            defaultStatus={status}
            forcePersonal={true}
          />
        )}

        {/* Add Task Button - show for todo and inprogress columns */}
        {canAddTasks && !showInlineCreator && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInlineCreator(true)}
            className={`w-full justify-start transition-all duration-200 ${
              status === 'todo' 
                ? 'text-muted-foreground hover:text-foreground hover:bg-background/50' 
                : 'text-accent-foreground/70 hover:text-accent-foreground hover:bg-background/30'
            }`}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add task
          </Button>
        )}

        {/* Empty state for when no tasks and no add option */}
        {tasks.length === 0 && !canAddTasks && !showInlineCreator && (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">
              No tasks yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
