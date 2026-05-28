
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KanbanCard } from './KanbanCard';
import { KanbanTask, TaskStatus } from '@/types/kanban';

interface KanbanColumnProps {
  title: string;
  status: TaskStatus;
  tasks: KanbanTask[];
  onDeleteTask: (taskId: string) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  status,
  tasks,
  onDeleteTask,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: status,
  });

  const getColumnColor = () => {
    switch (status) {
      case 'todo':
        return 'border-blue-200 bg-primary/5';
      case 'in-progress':
        return 'border-yellow-200 bg-warning/5';
      case 'done':
        return 'border-green-200 bg-success/5';
      default:
        return 'border-border bg-muted/50';
    }
  };

  const getHeaderColor = () => {
    switch (status) {
      case 'todo':
        return 'text-primary';
      case 'in-progress':
        return 'text-yellow-700';
      case 'done':
        return 'text-success';
      default:
        return 'text-secondary-foreground';
    }
  };

  return (
    <Card className={`h-fit ${getColumnColor()} ${isOver ? 'ring-2 ring-blue-400' : ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className={`text-lg ${getHeaderColor()} flex items-center justify-between`}>
          {title}
          <span className="text-sm font-normal bg-background px-2 py-1 rounded-full">
            {tasks.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent ref={setNodeRef} className="space-y-3 min-h-[400px]">
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">No tasks yet</p>
          </div>
        ) : (
          tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              onDelete={onDeleteTask}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
};
