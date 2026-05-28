import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { KanbanCard } from './KanbanCard';
import { InlineTaskCreator } from './InlineTaskCreator';
import { KanbanTask, TaskStatus } from '@/types/kanban';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EnhancedKanbanColumnProps {
  title: string;
  status: TaskStatus;
  tasks: KanbanTask[];
  onDeleteTask: (taskId: string) => void;
  onEditTask?: (taskId: string, updates: { title: string; description: string; due_date?: string }) => void;
  onAddTask?: (title: string, description: string, teamSelection: { type: 'personal' | 'team'; teamId?: string }, status?: TaskStatus) => void;
  loading?: boolean;
  hidePriorityBadge?: boolean;
}

export const EnhancedKanbanColumn: React.FC<EnhancedKanbanColumnProps> = ({
  title,
  status,
  tasks,
  onDeleteTask,
  onEditTask,
  onAddTask,
  loading = false,
  hidePriorityBadge = false,
}) => {
  const [showInlineCreator, setShowInlineCreator] = useState(false);
  const { isOver, setNodeRef } = useDroppable({
    id: status,
  });

  const getStatusStyles = () => {
    switch (status) {
      case 'todo':
        return {
          column: 'bg-muted border-border',
          header: 'text-foreground',
          badge: 'bg-muted text-foreground',
          dropZone: isOver ? 'ring-2 ring-gray-400' : ''
        };
      case 'in-progress':
        return {
          column: 'bg-muted-foreground border-border',
          header: 'text-primary-foreground',
          badge: 'bg-muted-foreground text-primary-foreground',
          dropZone: isOver ? 'ring-2 ring-gray-500' : ''
        };
      case 'done':
        return {
          column: 'bg-foreground border-border',
          header: 'text-primary-foreground',
          badge: 'bg-foreground text-primary-foreground',
          dropZone: isOver ? 'ring-2 ring-gray-600' : ''
        };
      default:
        return {
          column: 'bg-muted border-border',
          header: 'text-foreground',
          badge: 'bg-muted text-foreground',
          dropZone: isOver ? 'ring-2 ring-gray-400' : ''
        };
    }
  };

  const styles = getStatusStyles();

  const handleAddTask = (title: string, description: string, teamSelection: { type: 'personal' | 'team'; teamId?: string }, creatorStatus?: TaskStatus) => {
    const finalStatus = creatorStatus || status;
    if (onAddTask) {
      onAddTask(title, description, teamSelection, finalStatus);
    }
    setShowInlineCreator(false);
  };

  if (loading) {
    return (
      <div className={`rounded-lg p-4 border transition-all duration-200 ${styles.column}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-semibold text-lg ${styles.header}`}>
            {title}
          </h3>
          <div className="animate-pulse">
            <div className="h-6 w-8 bg-secondary rounded"></div>
          </div>
        </div>
        
        <div className="space-y-3 min-h-[200px]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-secondary rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={setNodeRef}
      className={`rounded-lg p-4 border transition-all duration-200 ${styles.column} ${styles.dropZone}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-semibold text-lg ${styles.header}`}>
          {title}
        </h3>
        <span className={`text-sm font-medium px-2 py-1 rounded-full ${styles.badge}`}>
          {tasks.length}
        </span>
      </div>
      
      <div className="space-y-3 min-h-[200px]">
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <p className={`text-sm ${status === 'done' ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
              No tasks yet
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              onDelete={onDeleteTask}
              onEdit={onEditTask}
              hidePriorityBadge={hidePriorityBadge}
            />
          ))
        )}

        {/* Inline Task Creator */}
        {showInlineCreator && onAddTask && (
          <InlineTaskCreator
            onSubmit={handleAddTask}
            defaultStatus={status}
          />
        )}

        {/* Add Task Button - only show for todo column */}
        {status === 'todo' && onAddTask && !showInlineCreator && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInlineCreator(true)}
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add a task
          </Button>
        )}
      </div>
    </div>
  );
};
